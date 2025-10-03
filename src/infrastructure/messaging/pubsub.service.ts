import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from '@google-cloud/pubsub';

@Injectable()
export class PubSubService {
  private readonly logger = new Logger(PubSubService.name);
  private readonly pubsub: PubSub;
  private projectId: string;

  constructor(private readonly config: ConfigService) {
    this.projectId = this.config.getOrThrow<string>('PUBSUB_PROJECT_ID');
    this.pubsub = new PubSub({ projectId: this.projectId });
  }

  async ensureTopic(topicName: string) {
    const [topics] = await this.pubsub.getTopics();
    const exists = topics.some((t) => t.name.endsWith(`/topics/${topicName}`));
    if (!exists) {
      await this.pubsub.createTopic(topicName);
      this.logger.log(`Created topic ${topicName}`);
    }
  }

  async ensureSubscription(topicName: string, subscriptionName: string) {
    const topic = this.pubsub.topic(topicName);
    const [subs] = await topic.getSubscriptions();
    const exists = subs.some((s) =>
      s.name.endsWith(`/subscriptions/${subscriptionName}`),
    );
    if (!exists) {
      await topic.createSubscription(subscriptionName);
      this.logger.log(
        `Created subscription ${subscriptionName} on ${topicName}`,
      );
    }
  }

  async publish(topicName: string, data: Record<string, unknown>) {
    await this.ensureTopic(topicName);
    const topic = this.pubsub.topic(topicName);
    const dataBuffer = Buffer.from(JSON.stringify(data));
    const messageId = await topic.publishMessage({ data: dataBuffer });
    this.logger.log(`Published message ${messageId} to ${topicName}`);
    return messageId;
  }

  getPubSubClient(): PubSub {
    return this.pubsub;
  }
}
