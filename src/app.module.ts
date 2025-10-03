import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { validate } from './config/env.validation';

import { AuditModule } from './infrastructure/audit/audit.module';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { PubSubModule } from './infrastructure/messaging/pubsub.module';
import { AppCacheModule } from './infrastructure/cache/cache.module';

import { AuthModule } from './modules/auth/auth.module';

import { AssignmentsModule } from './core/assignments/assignments.module';
import { DriversModule } from './core/drivers/drivers.module';
import { LoadsModule } from './core/loads/loads.module';
import { UsersModule } from './core/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate,
    }),
    PrismaModule,
    AppCacheModule,
    AuditModule,
    PubSubModule,
    AuthModule,
    UsersModule,
    DriversModule,
    LoadsModule,
    AssignmentsModule,
  ],
  providers: [AppService],
})
export class AppModule {}
