import { Injectable } from '@nestjs/common';
import { OrderSide } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TradingService {
  constructor(private readonly prisma: PrismaService) {}
  markets() {
    return [
      { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT' }, { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT' },
      { symbol: 'BNBUSDT', base: 'BNB', quote: 'USDT' }, { symbol: 'LDXUSDT', base: 'LDX', quote: 'USDT' },
    ];
  }
  createOrder(userId: string, order: { market: string; side: OrderSide; quantity: string; quoteAmount: string; idempotencyKey: string }) {
    return this.prisma.tradeOrder.upsert({
      where: { idempotencyKey: order.idempotencyKey },
      update: {},
      create: { userId, market: order.market.toUpperCase(), side: order.side, quantity: order.quantity, quoteAmount: order.quoteAmount, idempotencyKey: order.idempotencyKey },
    });
  }
  orders(userId: string) { return this.prisma.tradeOrder.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }); }
}
