import { Body, Controller, Headers, HttpCode, Ip, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register') @Throttle({ default: { ttl: 60_000, limit: 5 } })
  register(@Body() dto: RegisterDto, @Headers('x-device-name') device?: string, @Ip() ip?: string) {
    return this.auth.register(dto, device, ip);
  }

  @Post('login') @HttpCode(200) @Throttle({ default: { ttl: 60_000, limit: 8 } })
  login(@Body() dto: LoginDto, @Headers('x-device-name') device?: string, @Ip() ip?: string) {
    return this.auth.login(dto, device, ip);
  }

  @Post('refresh') @HttpCode(200)
  refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }

  @Post('logout') @HttpCode(204) @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: JwtUser): Promise<void> { await this.auth.logout(user.sessionId); }
}
