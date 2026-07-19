import { Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
@Controller({ path: 'notifications', version: '1' }) @UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@CurrentUser() user: JwtUser) { return this.notifications.list(user.userId); }
  @Patch(':id/read') markRead(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) { return this.notifications.markRead(user.userId, id); }
}
