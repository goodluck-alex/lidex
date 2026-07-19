import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsNumberString, IsOptional, IsString, Matches } from 'class-validator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StakingService } from './staking.service';
class StakeDto {
  @IsNumberString() amount: string;
  @IsOptional() @IsString() @Matches(/^0x[a-fA-F0-9]{64}$/) txHash?: string;
}
@Controller({ path: 'staking', version: '1' }) @UseGuards(JwtAuthGuard)
export class StakingController {
  constructor(private readonly staking: StakingService) {}
  @Get() positions(@CurrentUser() user: JwtUser) { return this.staking.positions(user.userId); }
  @Get('summary') summary(@CurrentUser() user: JwtUser) { return this.staking.summary(user.userId); }
  @Post() stake(@CurrentUser() user: JwtUser, @Body() dto: StakeDto) { return this.staking.stake(user.userId, dto.amount, dto.txHash); }
}
