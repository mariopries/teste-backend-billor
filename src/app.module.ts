import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate } from './config/env.validation';

// Infrastructure
import { PrismaModule } from './infrastructure/database/prisma.module';
import { AppCacheModule } from './infrastructure/cache/cache.module';
import { AuditModule } from './infrastructure/audit/audit.module';
import { PubSubModule } from './infrastructure/messaging/pubsub.module';

// Modules
import { AuthModule } from './modules/auth/auth.module';

// Core
import { UsersModule } from './core/users/users.module';
import { DriversModule } from './core/drivers/drivers.module';
import { LoadsModule } from './core/loads/loads.module';
import { AssignmentsModule } from './core/assignments/assignments.module';

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
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
