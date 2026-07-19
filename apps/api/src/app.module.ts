import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { ReferralsModule } from './referrals/referrals.module';
import { RewardsModule } from './rewards/rewards.module';
import { SettingsModule } from './settings/settings.module';
import { StakingModule } from './staking/staking.module';
import { TradingModule } from './trading/trading.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    BlockchainModule,
    UsersModule,
    WalletsModule,
    TradingModule,
    RewardsModule,
    ReferralsModule,
    StakingModule,
    NotificationsModule,
    SettingsModule,
    HealthModule,
  ],
})
export class AppModule {}
