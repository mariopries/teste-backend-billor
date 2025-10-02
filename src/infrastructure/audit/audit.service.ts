import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Collection, Db, MongoClient } from 'mongodb';

export type AuditEvent = {
  type: string;
  driverId?: string;
  loadId?: string;
  payload?: Record<string, unknown>;
  timestamp: Date;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private client!: MongoClient;
  private db!: Db;
  private collection!: Collection<AuditEvent>;

  constructor(private readonly config: ConfigService) {}

  private async ensureConnected() {
    if (!this.client) {
      const url = this.config.getOrThrow<string>('MONGO_URL');
      const dbName = this.config.getOrThrow<string>('MONGO_DB');
      this.client = new MongoClient(url);
      await this.client.connect();
      this.db = this.client.db(dbName);
      this.collection = this.db.collection<AuditEvent>('audits');
      this.logger.log(`Connected to MongoDB ${dbName}`);
    }
  }

  async appendEvent(event: AuditEvent) {
    await this.ensureConnected();
    await this.collection.insertOne(event);
    this.logger.log(`Audit event stored: ${event.type}`);
  }
}
