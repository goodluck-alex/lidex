import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

interface AccessPayload { sub: string; email: string; sid: string }

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessPayload): Promise<JwtUser> {
    const session = await this.prisma.deviceSession.findFirst({ where: { id: payload.sid, userId: payload.sub, revokedAt: null }, select: { id: true } });
    if (!session) throw new UnauthorizedException('Session is no longer active');
    return { userId: payload.sub, email: payload.email, sessionId: payload.sid };
  }
}
