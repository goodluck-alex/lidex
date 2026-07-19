import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ReferralsService } from './referrals.service';
@Controller({ path: 'referrals', version: '1' }) @UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}
  @Get('me') overview(@CurrentUser() user: JwtUser) { return this.referrals.overview(user.userId); }
}
