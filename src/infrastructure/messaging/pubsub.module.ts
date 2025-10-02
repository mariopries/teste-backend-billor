import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PubSubService } from './pubsub.service';
import { PubSubConsumerService } from './pubsub-consumer.service';

@Module({
  imports: [ConfigModule],
  providers: [PubSubService, PubSubConsumerService],
  exports: [PubSubService, PubSubConsumerService],
})
export class PubSubModule {}
