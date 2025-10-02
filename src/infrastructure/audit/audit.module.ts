import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
