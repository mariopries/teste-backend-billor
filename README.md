# Billor Backend Challenge — Driver & Load Management API

A production-ready **NestJS** backend for managing drivers, loads, and assignments with **Postgres**, **Redis**, **MongoDB**, and **Google Cloud Pub/Sub**.

## 🚀 Quick Start (2 Commands)

```bash
# 1. Start infrastructure (Docker required)
npm run infra:up

# 2. Setup and run (in a new terminal)
cp .env.example .env && npm install && npm run prisma:generate && npm run prisma:migrate:dev && npm run seed && npm run dev
```

**In another terminal, start the worker:**
```bash
npm run worker
```

**Test all endpoints:**
```bash
bash scripts/test_endpoints.sh
```

---

## 📋 Requirements Checklist

### ✅ Core Features
- [x] **Relational DB (Postgres)** — 4 tables: users, drivers, loads, driver_load_assignments
- [x] **Cache (Redis)** — GET /loads cached for 60s, invalidated on create/update
- [x] **NoSQL (MongoDB)** — Audit/event storage for assignments and load lifecycle
- [x] **Pub/Sub (Google Cloud)** — Publishes `load.assigned` events, consumed by worker
- [x] **JWT Authentication** — All endpoints require Bearer token
- [x] **One Active Load Rule** — Driver cannot have more than one active assignment
- [x] **Unit Tests** — Assignment service, Load service (cache), Pub/Sub service
- [x] **Endpoint Test Script** — `scripts/test_endpoints.sh` with curl

### ✅ Technical Requirements
- [x] **Node.js + NestJS** — Clean, modular architecture
- [x] **Docker** — All infrastructure in `docker-compose.yml` (no local installs)
- [x] **Migrations** — Prisma migrations for Postgres
- [x] **NPM Scripts** — dev, worker, test, migrations, seed
- [x] **.env.example** — Complete environment configuration
- [x] **TypeScript** — 100% typed, no `any` usage

---

## 🏗️ Architecture

This project follows a **clean, layered architecture** with clear separation of concerns:

```
src/
├── common/              # Shared utilities (decorators, guards)
├── core/                # Business logic (Domain Layer)
│   ├── assignments/    # Assignment management
│   ├── drivers/        # Driver management
│   ├── loads/          # Load management
│   └── users/          # User management
├── infrastructure/      # External services
│   ├── database/       # Prisma ORM (PostgreSQL)
│   ├── cache/          # Redis caching
│   ├── messaging/      # Pub/Sub + Worker
│   └── audit/          # MongoDB audit logging
└── modules/            # Feature modules
    └── auth/           # Authentication (JWT)
```

**📖 See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation**

### Key Benefits
- ✅ **Separation of Concerns**: Business logic isolated from infrastructure
- ✅ **Testability**: Easy to mock dependencies and write unit tests
- ✅ **Scalability**: Modules can be extracted into microservices
- ✅ **Maintainability**: Clear structure makes onboarding easier
- ✅ **Flexibility**: Infrastructure can be replaced without affecting core logic

### Data Flow
1. **POST /assignments** → Validates driver has no active load → Creates assignment in Postgres
2. **Pub/Sub** → Publishes `load.assigned` event
3. **Worker** → Consumes event → Stores audit in MongoDB
4. **Redis** → Caches GET /loads for 60s, invalidated on mutations

---

## 🛠️ Setup Instructions

### Prerequisites
- **Docker** (for Postgres, Redis, MongoDB, Pub/Sub Emulator)
- **Node.js 18+** (for running the app)

### Step-by-Step

```bash
# 1. Clone repository
git clone <repo-url>
cd teste-backend-billor

# 2. Start infrastructure
npm run infra:up
# This starts: Postgres (5433), Redis (6379), MongoDB (27017), Pub/Sub Emulator (8085)

# 3. Setup environment
npm run env:setup
# This creates .env from .env.example
# Edit .env if needed (defaults work for Docker setup)

# 4. Validate environment (optional but recommended)
npm run env:validate
# Checks if all required variables are set

# 5. Install dependencies
npm install

# 6. Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate:dev

# 7. Seed demo user
npm run seed
# Creates user: admin@demo.com / admin123

# 8. Start API server
npm run dev
# API available at http://localhost:3000/api

# 9. Start worker (in another terminal)
npm run worker
# Consumes Pub/Sub messages and stores audit events
```

---

## 🧪 Testing

### Run Unit Tests
```bash
npm test
```

**Test Coverage:**
- `assignments.service.spec.ts` — One active load validation
- `loads.service.spec.ts` — Cache hit/miss and invalidation
- `pubsub.service.spec.ts` — Pub/Sub publish/subscribe logic

### Run E2E Endpoint Tests
```bash
bash scripts/test_endpoints.sh
```

**What it tests:**
1. ✅ Login and JWT token retrieval
2. ✅ Create user, drivers, and loads
3. ✅ List loads (cache hit/miss)
4. ✅ Assign load to driver
5. ✅ Fetch assignment details
6. ✅ Reject second assignment to same driver (one active load rule)
7. ✅ Complete assignment
8. ✅ Assign new load after completion

---

## 📡 API Endpoints

### Authentication
```bash
POST /api/auth/login
Body: { "email": "admin@demo.com", "password": "admin123" }
Response: { "access_token": "jwt-token" }
```

### Users
```bash
POST /api/users
Headers: Authorization: Bearer <token>
Body: { "name": "John", "email": "john@example.com", "password": "pass123" }
```

### Drivers
```bash
POST /api/drivers
Body: { "name": "John Doe", "licenseNumber": "DRV001", "status": "ACTIVE" }
```

### Loads
```bash
POST /api/loads
Body: { "origin": "NYC", "destination": "LA", "cargoType": "Electronics" }

GET /api/loads
Response: { "source": "cache|db", "data": [...] }
```

### Assignments
```bash
POST /api/assignments
Body: { "driverId": "uuid", "loadId": "uuid" }
# Validates: driver has no active load, load is OPEN
# Publishes: load.assigned event to Pub/Sub

GET /api/assignments/:id

PATCH /api/assignments/:id/status
Body: { "status": "COMPLETED" | "CANCELLED" }
# Creates audit event in MongoDB
```

---

## 🐳 Docker Services

```yaml
postgres:5433    # Relational DB
redis:6379       # Cache
mongo:27017      # NoSQL audit storage
pubsub:8085      # Pub/Sub Emulator
```

**Stop infrastructure:**
```bash
npm run infra:down
```

---

## 📦 NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API server (watch mode) |
| `npm run worker` | Start Pub/Sub consumer worker |
| `npm test` | Run unit tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run lint` | Lint and fix code |
| `npm run build` | Build for production |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate:dev` | Run migrations |
| `npm run seed` | Seed demo user |
| `npm run infra:up` | Start Docker services |
| `npm run infra:down` | Stop Docker services |
| `npm run env:setup` | Create .env from .env.example |
| `npm run env:validate` | Validate environment variables |

---

## 🔐 Environment Variables

**⚠️ All environment variables are REQUIRED** - The application will fail to start if any are missing.

See `.env.example` for all configuration options:

```bash
# Required Variables
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/billor
REDIS_URL=redis://localhost:6379
MONGO_URL=mongodb://localhost:27017
MONGO_DB=billor_audit
PUBSUB_PROJECT_ID=billor-local
JWT_SECRET=super-secret-jwt

# Optional Variables
NODE_ENV=development
PORT=3000
PUBSUB_EMULATOR_HOST=localhost:8085
```

### Environment Validation

The application uses **class-validator** to validate all environment variables at startup:
- Missing required variables will throw an error
- Invalid values will be caught before the app starts
- Type checking ensures configuration correctness

See `src/config/env.validation.ts` for validation rules.

---

## 🧩 Key Design Decisions

### One Active Load Per Driver
- Validated in `assignments.service.ts` before creating assignment
- Query: `findFirst({ where: { driverId, status: 'ASSIGNED' } })`
- Returns 400 if driver already has active load

### Cache Strategy
- GET /loads cached for 60 seconds
- Cache key: `loads:all`
- Invalidated on: POST /loads, assignment status changes
- Source indicator in response: `{ source: "cache" | "db", data: [...] }`

### Pub/Sub Architecture
- **Publisher**: `assignments.service.ts` publishes on assignment creation
- **Consumer**: `pubsub-consumer.service.ts` runs in worker process
- **Event**: `{ assignmentId, driver, load, timestamp }`
- **Audit**: Stored in MongoDB via `audit.service.ts`

### TypeScript Strictness
- Zero `any` usage (enforced by ESLint)
- All types explicitly defined
- Proper error handling with type guards

---

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Change ports in docker-compose.yml and .env
```

**Prisma client not generated:**
```bash
npm run prisma:generate
```

**Worker not receiving messages:**
```bash
# Ensure PUBSUB_EMULATOR_HOST is set
# Check worker logs for connection errors
```

**Tests failing:**
```bash
# Ensure Docker services are running
npm run infra:up
```

---

## 📝 Notes

- **Demo user**: `admin@demo.com` / `admin123` (created by seed)
- **Password hashing**: SHA256 (for demo purposes; use bcrypt in production)
- **Pub/Sub Emulator**: No GCP account needed, runs locally in Docker
- **MongoDB**: No authentication (for demo; enable in production)

---

## 🎯 Challenge Compliance

This implementation fulfills all requirements:
- ✅ 4+ Postgres tables with proper relationships
- ✅ Redis caching with 60s TTL
- ✅ MongoDB for audit events
- ✅ Pub/Sub with emulator in Docker
- ✅ JWT authentication on all endpoints
- ✅ One active load per driver validation
- ✅ Unit tests for critical services
- ✅ Endpoint test script with curl
- ✅ Clean, documented, production-ready code

**Ready to run with 2 commands. No local installs required.**
