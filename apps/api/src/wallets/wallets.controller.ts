import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Network } from '@prisma/client';
import { IsEnum, IsEthereumAddress, IsOptional, IsString, Length } from 'class-validator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WalletsService } from './wallets.service';

class RegisterWalletDto {
  @IsString() @Length(1, 40) name: string;
  @IsEthereumAddress() address: string;
  @IsOptional() @IsEnum(Network) network?: Network;
}

@Controller({ path: 'wallets', version: '1' })
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}
  @Get() list(@CurrentUser() user: JwtUser) { return this.wallets.list(user.userId); }
  @Post() register(@CurrentUser() user: JwtUser, @Body() dto: RegisterWalletDto) { return this.wallets.register(user.userId, dto); }
  @Get('exchange-account') exchange(@CurrentUser() user: JwtUser) { return this.wallets.exchangeAccount(user.userId); }
  @Get('transactions') history(@CurrentUser() user: JwtUser) { return this.wallets.history(user.userId); }
}
