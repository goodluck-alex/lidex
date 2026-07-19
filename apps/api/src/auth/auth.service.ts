import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface TokenPayload { sub: string; email: string; sid: string }
export interface TokenPair { accessToken: string; refreshToken: string; expiresIn: number }

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, deviceName?: string, ipAddress?: string): Promise<TokenPair> {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
    const referrer = dto.referralCode
      ? await this.prisma.user.findUnique({ where: { referralCode: dto.referralCode.toUpperCase() }, select: { id: true } })
      : null;
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          fullName: dto.fullName.trim(),
          passwordHash,
          status: UserStatus.ACTIVE,
          referralCode: this.referralCode(),
          referredById: referrer?.id,
          exchangeAccount: { create: {} },
        },
        select: { id: true, email: true },
      });
      return this.issueSession(user, deviceName, ipAddress);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, deviceName?: string, ipAddress?: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    const valid = user ? await argon2.verify(user.passwordHash, dto.password) : false;
    if (!user || !valid || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Invalid credentials');
    return this.issueSession(user, deviceName, ipAddress);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(refreshToken, { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const session = await this.prisma.deviceSession.findUnique({ where: { id: payload.sid }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt < new Date() || !(await argon2.verify(session.refreshTokenHash, refreshToken))) {
      throw new UnauthorizedException('Session expired');
    }
    return this.rotateSession(session.id, { id: session.user.id, email: session.user.email });
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.deviceSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private async issueSession(user: { id: string; email: string }, deviceName?: string, ipAddress?: string): Promise<TokenPair> {
    const placeholder = await argon2.hash(randomBytes(32));
    const session = await this.prisma.deviceSession.create({
      data: { userId: user.id, refreshTokenHash: placeholder, deviceName, ipAddress, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
    return this.rotateSession(session.id, user);
  }

  private async rotateSession(sessionId: string, user: { id: string; email: string }): Promise<TokenPair> {
    const payload: TokenPayload = { sub: user.id, email: user.email, sid: sessionId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'), expiresIn: 900 }),
      this.jwt.signAsync(payload, { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'), expiresIn: 2_592_000 }),
    ]);
    await this.prisma.deviceSession.update({
      where: { id: sessionId },
      data: { refreshTokenHash: await argon2.hash(refreshToken, { type: argon2.argon2id }), lastSeenAt: new Date() },
    });
    return { accessToken, refreshToken, expiresIn: 900 };
  }

  private referralCode(): string { return `LDX${randomBytes(5).toString('hex').toUpperCase()}`; }
}
