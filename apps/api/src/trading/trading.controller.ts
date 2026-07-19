import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OrderSide } from '@prisma/client';
import { IsEnum, IsNumberString, IsString, IsUUID, Matches } from 'class-validator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TradingService } from './trading.service';

class CreateOrderDto {
  @Matches(/^[A-Z0-9]{5,16}$/) market: string;
  @IsEnum(OrderSide) side: OrderSide;
  @IsNumberString() quantity: string;
  @IsNumberString() quoteAmount: string;
  @IsString() @IsUUID() idempotencyKey: string;
}

@Controller({ path: 'trading', version: '1' })
export class TradingController {
  constructor(private readonly trading: TradingService) {}
  @Get('markets') markets() { return this.trading.markets(); }
  @Get('orders') @UseGuards(JwtAuthGuard) orders(@CurrentUser() user: JwtUser) { return this.trading.orders(user.userId); }
  @Post('orders') @UseGuards(JwtAuthGuard) create(@CurrentUser() user: JwtUser, @Body() dto: CreateOrderDto) { return this.trading.createOrder(user.userId, dto); }
}
