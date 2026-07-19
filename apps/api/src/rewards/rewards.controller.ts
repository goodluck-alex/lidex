import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RewardsService } from './rewards.service';

@Controller({ path: 'rewards', version: '1' })
@UseGuards(JwtAuthGuard)
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}
  @Get('summary') summary(@CurrentUser() user: JwtUser) { return this.rewards.summary(user.userId); }
  @Get('history') history(@CurrentUser() user: JwtUser) { return this.rewards.history(user.userId); }
  @Post('check-in') checkIn(@CurrentUser() user: JwtUser) { return this.rewards.checkIn(user.userId); }
  @Get('leaderboard') leaderboard() { return this.rewards.leaderboard(); }
}
