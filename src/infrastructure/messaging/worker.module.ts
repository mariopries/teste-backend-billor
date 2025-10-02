import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PubSubModule } from './pubsub.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';

@Module({
  imports: [ConfigModule, PubSubModule, AuditModule],
})
export class WorkerModule {}
