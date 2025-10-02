import { Module } from '@nestjs/common';
import { LoadsService } from './loads.service';
import { LoadsController } from './loads.controller';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PrismaModule, PassportModule],
  providers: [LoadsService],
  controllers: [LoadsController],
  exports: [LoadsService],
})
export class LoadsModule {}
