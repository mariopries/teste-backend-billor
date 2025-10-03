import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.getOrThrow<string>('REDIS_URL');
        const { redisStore } = (await import(
          'cache-manager-ioredis-yet'
        )) as typeof import('cache-manager-ioredis-yet');

        const store = (await redisStore({
          url: redisUrl,
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
        })) as unknown;

        return {
          store,
          ttl: 60_000,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
