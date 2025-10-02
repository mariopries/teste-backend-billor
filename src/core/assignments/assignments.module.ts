import { Module } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { PubSubModule } from '../../infrastructure/messaging/pubsub.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PrismaModule, PubSubModule, AuditModule, PassportModule],
  providers: [AssignmentsService],
  controllers: [AssignmentsController],
})
export class AssignmentsModule {}
