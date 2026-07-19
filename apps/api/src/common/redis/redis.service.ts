import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  constructor(config: ConfigService) {
    this.client = new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379'), {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
  }
  async getJson<T>(key: string): Promise<T | null> {
    if (this.client.status === 'wait') await this.client.connect();
    const value = await this.client.get(key);
    return value ? JSON.parse(value) as T : null;
  }
  async setJson(key: string, value: unknown, seconds: number): Promise<void> {
    if (this.client.status === 'wait') await this.client.connect();
    await this.client.set(key, JSON.stringify(value), 'EX', seconds);
  }
  async onModuleDestroy(): Promise<void> { if (this.client.status !== 'end') this.client.disconnect(); }
}
