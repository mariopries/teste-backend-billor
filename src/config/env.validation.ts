import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  validateSync,
  IsOptional,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  JWT_SECRET!: string;

  // Database
  @IsString()
  DATABASE_URL!: string;

  // Redis
  @IsString()
  REDIS_URL!: string;

  // MongoDB
  @IsString()
  MONGO_URL!: string;

  @IsString()
  MONGO_DB!: string;

  // Pub/Sub
  @IsString()
  PUBSUB_PROJECT_ID!: string;

  @IsString()
  @IsOptional()
  PUBSUB_EMULATOR_HOST?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('\n')}`,
    );
  }

  return validatedConfig;
}
