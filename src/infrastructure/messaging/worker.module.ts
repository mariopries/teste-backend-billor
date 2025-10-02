import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PubSubModule } from './pubsub.module';
import { AuditModule } from '../audit/audit.module';
import { validate } from '../../config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate,
    }),
    PubSubModule,
    AuditModule,
  ],
})
export class WorkerModule {}
