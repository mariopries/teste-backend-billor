import { Message } from '@google-cloud/pubsub';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PubSubService } from './pubsub.service';

interface LoadAssignmentData extends Record<string, unknown> {
  assignmentId?: string;
  driver?: {
    id?: string;
  };
  load?: {
    id?: string;
  };
}

const TOPIC = 'load.assigned';
const SUBSCRIPTION = 'load.assigned.worker';

@Injectable()
export class PubSubConsumerService implements OnModuleInit {
  private readonly logger = new Logger(PubSubConsumerService.name);

  constructor(
    private readonly pubsub: PubSubService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    await this.pubsub.ensureTopic(TOPIC);
    await this.pubsub.ensureSubscription(TOPIC, SUBSCRIPTION);
  }

  async start() {
    await this.pubsub.ensureTopic(TOPIC);
    await this.pubsub.ensureSubscription(TOPIC, SUBSCRIPTION);

    const pubsubClient = this.pubsub.getPubSubClient();
    const topic = pubsubClient.topic(TOPIC);
    const subscription = topic.subscription(SUBSCRIPTION);

    subscription.on('message', (message: Message) => {
      void (async () => {
        try {
          const dataString = message.data ? message.data.toString() : '{}';
          const data = JSON.parse(dataString) as LoadAssignmentData;
          this.logger.log(`Received message ${message.id} on ${TOPIC}`);

          await this.audit.appendEvent({
            type: 'ASSIGNED',
            driverId: data?.driver?.id,
            loadId: data?.load?.id,
            payload: data,
            timestamp: new Date(),
          });

          this.logger.log(
            `Simulated notification for assignment ${data?.assignmentId}`,
          );

          message.ack();
        } catch (err: unknown) {
          this.logger.error(
            'Error handling message',
            err instanceof Error ? err.stack : String(err),
          );
          message.nack();
        }
      })();
    });

    subscription.on('error', (err: Error) => {
      this.logger.error('Subscription error', err.stack || err.message);
    });

    this.logger.log(`Subscribed to ${TOPIC} as ${SUBSCRIPTION}`);
  }
}
