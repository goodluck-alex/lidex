import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
@Controller({ path: 'settings', version: '1' }) @UseGuards(JwtAuthGuard)
export class SettingsController {
  @Get('defaults') defaults() {
    return { currency: 'USD', language: 'en', notifications: { deposits: true, withdrawals: true, trading: true, rewards: true, referrals: true, security: true, priceAlerts: false } };
  }
}
