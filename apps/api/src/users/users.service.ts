import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, status: true, emailVerifiedAt: true, referralCode: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
  sessions(userId: string) {
    return this.prisma.deviceSession.findMany({ where: { userId, revokedAt: null }, select: { id: true, deviceName: true, ipAddress: true, lastSeenAt: true, createdAt: true } });
  }
}
