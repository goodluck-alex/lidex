import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}
  async overview(userId: string) {
    const [user, friends, rewards] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { referralCode: true } }),
      this.prisma.user.count({ where: { referredById: userId } }),
      this.prisma.rewardLedger.aggregate({ where: { userId, type: 'REFERRAL' }, _sum: { points: true } }),
    ]);
    return {
      code: user.referralCode,
      link: `https://lidex.network/r/${user.referralCode}`,
      friends,
      points: rewards._sum.points ?? 0,
    };
  }
}
