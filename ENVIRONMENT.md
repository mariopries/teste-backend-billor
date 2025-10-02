# Environment Configuration Guide

## 🔒 Security-First Approach

This project follows **security best practices** by requiring all environment variables to be explicitly defined. No hardcoded defaults are used in production code.

## 📋 Required Variables

All variables below **MUST** be defined in your `.env` file:

### Database
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```
PostgreSQL connection string for Prisma ORM.

### Cache
```bash
REDIS_URL=redis://host:port
```
Redis connection URL for caching.

### Audit Storage
```bash
MONGO_URL=mongodb://host:port
MONGO_DB=database_name
```
MongoDB connection for audit trail storage.

### Messaging
```bash
PUBSUB_PROJECT_ID=project-id
```
Google Cloud Pub/Sub project ID.

### Authentication
```bash
JWT_SECRET=your-secret-key-here
```
**⚠️ CRITICAL**: Use a strong, random secret in production.

## 🔧 Optional Variables

### Application
```bash
NODE_ENV=development|production|test
PORT=3000
```

### Pub/Sub Emulator
```bash
PUBSUB_EMULATOR_HOST=localhost:8085
```
Only needed for local development with emulator.

---

## ✅ Validation

### Automatic Validation

The application validates all environment variables at startup using `class-validator`:

```typescript
// src/config/env.validation.ts
export class EnvironmentVariables {
  @IsString()
  JWT_SECRET!: string;  // Required

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;  // Optional with default
}
```

### Validation Benefits

1. **Early Failure**: App won't start with invalid config
2. **Type Safety**: Ensures correct data types
3. **Clear Errors**: Descriptive error messages
4. **Documentation**: Validation rules serve as documentation

### Example Error

```bash
Error: Environment validation failed:
JWT_SECRET must be a string
MONGO_URL must be a string
```

---

## 🚀 Usage

### Development

1. Copy example file:
```bash
cp .env.example .env
```

2. The default values in `.env.example` work with Docker Compose
3. Start infrastructure:
```bash
npm run infra:up
```

4. Start application:
```bash
npm run dev
```

### Production

1. **Never use `.env.example` values in production**
2. Set all variables via your deployment platform:
   - Kubernetes: ConfigMaps/Secrets
   - Docker: Environment variables
   - Cloud: Platform-specific config (AWS Secrets Manager, etc.)

3. Use strong, random values for:
   - `JWT_SECRET` (min 32 characters)
   - Database passwords
   - API keys

### Testing

For tests, you can use a `.env.test` file:

```bash
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5433/test_db
# ... other test-specific values
```

---

## 🔐 Security Best Practices

### ✅ DO

- Use environment variables for all configuration
- Use `config.getOrThrow()` for required values
- Validate all variables at startup
- Use different secrets per environment
- Rotate secrets regularly
- Use secret management tools in production

### ❌ DON'T

- Hardcode values in source code
- Commit `.env` files to git
- Use default/example values in production
- Share secrets via insecure channels
- Use the same secret across environments

---

## 🛠️ Adding New Variables

1. **Add to validation** (`src/config/env.validation.ts`):
```typescript
export class EnvironmentVariables {
  @IsString()
  NEW_VARIABLE!: string;
}
```

2. **Add to `.env.example`**:
```bash
# New Feature
NEW_VARIABLE=example-value
```

3. **Use in code**:
```typescript
const value = this.config.getOrThrow<string>('NEW_VARIABLE');
```

4. **Document in README.md**

---

## 📚 References

- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [class-validator](https://github.com/typestack/class-validator)
- [12-Factor App: Config](https://12factor.net/config)
- [OWASP: Secure Configuration](https://owasp.org/www-project-top-ten/)
