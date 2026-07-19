import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class StakingService {
  constructor(private readonly prisma: PrismaService) {}
  positions(userId: string) { return this.prisma.stake.findMany({ where: { userId }, orderBy: { startedAt: 'desc' } }); }
  stake(userId: string, amount: string, txHash?: string) {
    if (Number(amount) <= 0) throw new BadRequestException('Amount must be greater than zero');
    return this.prisma.stake.create({ data: { userId, amount, apr: '12.5000', txHash } });
  }
  async summary(userId: string) {
    const totals = await this.prisma.stake.aggregate({ where: { userId, status: 'ACTIVE' }, _sum: { amount: true, rewardsEarned: true } });
    return { amountStaked: totals._sum.amount ?? 0, rewardsEarned: totals._sum.rewardsEarned ?? 0, apr: 12.5 };
  }
}
