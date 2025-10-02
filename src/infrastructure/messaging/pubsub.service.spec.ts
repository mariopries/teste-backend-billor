import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PubSubService } from './pubsub.service';

/* eslint-disable @typescript-eslint/unbound-method */

// Note: Full integration tests for Pub/Sub are complex due to Google Cloud SDK mocking.
// These tests cover the service initialization and basic structure.
// End-to-end Pub/Sub functionality is validated via the test_endpoints.sh script.

describe('PubSubService', () => {
  let service: PubSubService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PubSubService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'PUBSUB_PROJECT_ID') return 'test-project';
              throw new Error(`Missing env var: ${key}`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PubSubService>(PubSubService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with project ID from config', () => {
      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'PUBSUB_PROJECT_ID',
      );
    });
  });

  describe('getPubSubClient', () => {
    it('should return the PubSub client instance', () => {
      const client = service.getPubSubClient();
      expect(client).toBeDefined();
      expect(client.constructor.name).toBe('PubSub');
    });
  });

  describe('service methods', () => {
    it('should have ensureTopic method', () => {
      expect(service.ensureTopic).toBeDefined();
      expect(typeof service.ensureTopic).toBe('function');
    });

    it('should have ensureSubscription method', () => {
      expect(service.ensureSubscription).toBeDefined();
      expect(typeof service.ensureSubscription).toBe('function');
    });

    it('should have publish method', () => {
      expect(service.publish).toBeDefined();
      expect(typeof service.publish).toBe('function');
    });
  });

  // Integration tests for actual Pub/Sub operations should be run
  // against the emulator or mocked more comprehensively.
  // The test_endpoints.sh script validates the full publish/subscribe flow.
});
