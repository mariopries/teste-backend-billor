# Architecture Documentation

## 📁 Project Structure

This project follows a **Domain-Driven Design (DDD)** inspired architecture with clear separation of concerns:

```
src/
├── common/                    # Shared utilities and cross-cutting concerns
│   ├── decorators/           # Custom decorators (@CurrentUser, etc.)
│   └── guards/               # Auth guards (JwtAuthGuard)
│
├── config/                    # Configuration files (future use)
│
├── core/                      # Core business logic (Domain Layer)
│   ├── assignments/          # Assignment management
│   │   ├── assignments.controller.ts
│   │   ├── assignments.service.ts
│   │   ├── assignments.service.spec.ts
│   │   └── assignments.module.ts
│   ├── drivers/              # Driver management
│   ├── loads/                # Load management
│   └── users/                # User management
│
├── infrastructure/            # External services and infrastructure
│   ├── database/             # Database (Prisma ORM)
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── cache/                # Redis caching
│   │   └── cache.module.ts
│   ├── messaging/            # Pub/Sub messaging
│   │   ├── pubsub.service.ts
│   │   ├── pubsub-consumer.service.ts
│   │   ├── pubsub.module.ts
│   │   ├── worker.module.ts
│   │   └── main.ts           # Worker entry point
│   └── audit/                # MongoDB audit logging
│       ├── audit.service.ts
│       └── audit.module.ts
│
├── modules/                   # Feature modules
│   └── auth/                 # Authentication module
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       ├── auth.module.ts
│       └── jwt.strategy.ts
│
├── app.module.ts             # Root application module
└── main.ts                   # Application entry point
```

---

## 🏛️ Architectural Layers

### 1. **Common Layer** (`src/common/`)
Contains shared utilities that can be used across the entire application:
- **Decorators**: Custom parameter decorators like `@CurrentUser()`
- **Guards**: Authentication and authorization guards
- **Interceptors**: Request/response transformation (future)
- **Filters**: Exception filters (future)
- **Pipes**: Validation pipes (future)

### 2. **Core Layer** (`src/core/`)
Contains the **business logic** and **domain models**:
- Each subdirectory represents a **bounded context** or **aggregate**
- Contains controllers, services, DTOs, and domain logic
- **No dependencies on infrastructure** (follows Dependency Inversion Principle)
- Services use interfaces/abstractions for infrastructure dependencies

**Modules**:
- `assignments/` - Assignment creation, validation, and lifecycle
- `drivers/` - Driver CRUD operations
- `loads/` - Load CRUD operations with caching
- `users/` - User management

### 3. **Infrastructure Layer** (`src/infrastructure/`)
Contains **technical implementations** of external services:
- **Database**: Prisma ORM for PostgreSQL
- **Cache**: Redis integration via cache-manager
- **Messaging**: Google Cloud Pub/Sub for event-driven architecture
- **Audit**: MongoDB for audit trail storage

**Key Principle**: Infrastructure should be **replaceable** without affecting core business logic.

### 4. **Modules Layer** (`src/modules/`)
Contains **feature modules** that don't fit into core business logic:
- `auth/` - Authentication, JWT strategy, login logic

---

## 🔄 Data Flow

### Request Flow (API)
```
Client Request
    ↓
Controller (validates JWT via Guard)
    ↓
Service (business logic)
    ↓
Infrastructure (database, cache, messaging)
    ↓
Response
```

### Event Flow (Pub/Sub)
```
Assignment Created
    ↓
PubSubService.publish('load.assigned')
    ↓
Pub/Sub Emulator
    ↓
Worker (PubSubConsumerService)
    ↓
AuditService.appendEvent()
    ↓
MongoDB
```

---

## 🎯 Design Principles

### 1. **Separation of Concerns**
- Business logic (core) is isolated from infrastructure
- Each module has a single responsibility

### 2. **Dependency Inversion**
- Core modules depend on abstractions, not concrete implementations
- Infrastructure implements these abstractions

### 3. **Modularity**
- Each feature is self-contained in its own module
- Modules can be independently tested and deployed

### 4. **Testability**
- Services are easily mockable
- Infrastructure dependencies are injected
- Unit tests don't require external services

### 5. **Scalability**
- Modules can be extracted into microservices
- Worker can be scaled independently
- Cache layer reduces database load

---

## 📦 Module Dependencies

### Core Modules
```
assignments → database, cache, messaging, audit
drivers     → database
loads       → database, cache
users       → database
```

### Infrastructure Modules
```
database   → Prisma Client
cache      → Redis (ioredis)
messaging  → Google Cloud Pub/Sub
audit      → MongoDB
```

### Feature Modules
```
auth       → database, JWT
```

---

## 🔐 Security Architecture

### Authentication Flow
1. Client sends credentials to `/api/auth/login`
2. AuthService validates credentials against database
3. JWT token is generated and returned
4. Client includes token in `Authorization: Bearer <token>` header
5. JwtAuthGuard validates token on protected routes
6. JwtStrategy extracts user info and attaches to request

### Authorization
- All endpoints (except `/auth/login`) require JWT authentication
- Guards are applied at controller level via `@UseGuards(JwtAuthGuard)`
- User info is available via `@CurrentUser()` decorator

---

## 🚀 Deployment Considerations

### Horizontal Scaling
- **API**: Multiple instances behind load balancer
- **Worker**: Multiple consumers for Pub/Sub
- **Database**: Read replicas for queries
- **Cache**: Redis cluster for high availability

### Monitoring
- Application logs via NestJS Logger
- Audit trail in MongoDB
- Pub/Sub message metrics
- Cache hit/miss rates

### Environment Variables
All configuration is externalized via `.env`:
- Database connection strings
- Redis URL
- MongoDB URL
- Pub/Sub project ID
- JWT secret

---

## 🧪 Testing Strategy

### Unit Tests
- **Core services**: Business logic validation
- **Infrastructure services**: Mock external dependencies
- Located alongside source files (`*.spec.ts`)

### Integration Tests
- End-to-end API tests (`test/app.e2e-spec.ts`)
- Endpoint script (`scripts/test_endpoints.sh`)

### Test Coverage
- Assignments: One active load rule validation
- Loads: Cache hit/miss behavior
- Pub/Sub: Message publishing and consumption

---

## 📚 Further Reading

- [NestJS Documentation](https://docs.nestjs.com/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
