import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          url: config.getOrThrow<string>('REDIS_URL'),
        }),
        ttl: 60_000, // default 60s
      }),
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
