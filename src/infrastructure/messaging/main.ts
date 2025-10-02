import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';
import { PubSubConsumerService } from './pubsub-consumer.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('Worker');

  const consumer = app.get(PubSubConsumerService);
  await consumer.start();

  logger.log('Worker started (Pub/Sub consumer running)');
}

bootstrap().catch((e: unknown) => {
  console.error('Worker failed to start', e);
  process.exit(1);
});
