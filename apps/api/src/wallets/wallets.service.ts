import { ConflictException, Injectable } from '@nestjs/common';
import { Network, Prisma, WalletKind } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}
  list(userId: string) {
    return this.prisma.wallet.findMany({ where: { userId }, select: { id: true, name: true, address: true, network: true, kind: true, isPrimary: true, createdAt: true } });
  }
  async register(userId: string, input: { name: string; address: string; network?: Network }) {
    try {
      return await this.prisma.wallet.create({ data: { ...input, userId, kind: WalletKind.PERSONAL } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Wallet is already registered');
      throw error;
    }
  }
  exchangeAccount(userId: string) { return this.prisma.exchangeAccount.findUniqueOrThrow({ where: { userId } }); }
  history(userId: string) {
    return this.prisma.transaction.findMany({ where: { wallet: { userId } }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
}
