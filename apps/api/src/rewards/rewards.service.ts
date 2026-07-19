import { Injectable } from '@nestjs/common';
import { RewardType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string) {
    const aggregate = await this.prisma.rewardLedger.aggregate({ where: { userId }, _sum: { points: true, unlockedPoints: true } });
    const totalPoints = aggregate._sum.points ?? 0;
    const unlockedPoints = aggregate._sum.unlockedPoints ?? 0;
    return { totalPoints, redeemableLdx: unlockedPoints / 100, unlockedPoints, conversion: { points: 100, ldx: 1 }, monthlyUnlockRate: 0.2 };
  }

  history(userId: string) { return this.prisma.rewardLedger.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }); }

  checkIn(userId: string) {
    const day = new Date().toISOString().slice(0, 10);
    return this.prisma.rewardLedger.upsert({
      where: { userId_idempotencyKey: { userId, idempotencyKey: `check-in:${day}` } },
      update: {},
      create: { userId, type: RewardType.CHECK_IN, points: 250, unlockedPoints: 50, description: 'Daily check-in', idempotencyKey: `check-in:${day}` },
    });
  }

  leaderboard() {
    return this.prisma.rewardLedger.groupBy({ by: ['userId'], _sum: { points: true }, orderBy: { _sum: { points: 'desc' } }, take: 20 });
  }
}
