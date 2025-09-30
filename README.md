# Billor Backend Challenge — Node.js (Nest preferred) + SQL, NoSQL, Cache, Pub/Sub

## Product brief (truck company)

Build a small **Driver & Load Management API**.

The goal is to allow users to manage **drivers** and **loads**, and assign loads to drivers under the rule that **a driver can only have one active load at a time**.

---

### 1. Relational DB (Postgres) — at least **4 tables**

* `users(id, name, email)`
* `drivers(id, name, license_number, status)`
* `loads(id, origin, destination, cargo_type, status, created_at)`
* `driver_load_assignments(id, driver_id, load_id, assigned_at, status)`

  * Enforce **one active assignment per driver** at the DB or service layer.
  * Example statuses: `ASSIGNED`, `COMPLETED`, `CANCELLED`.

*(Optional extra table if you want more depth)*:

* `load_events(id, load_id, type, payload_jsonb, created_at)` → to track lifecycle of loads in relational DB.

---

### 2. Cache (Redis)

* Cache `GET /loads` for 60s.
* Invalidate cache when creating or updating a load.

---

### 3. Non-relational DB (your choice)

* Store **audit/events** about assignments and load lifecycle.
* Example documents:

  * `{ driverId, loadId, type: "ASSIGNED", payload, timestamp }`
  * `{ loadId, type: "LOAD_COMPLETED", payload, timestamp }`
* Must run in **Docker** (no local installs).

---

### 4. Queue / PubSub (Google Cloud Pub/Sub)

* On **assignment creation**, publish `load.assigned` with driver + load info.
* Worker/consumer should subscribe and record an audit event in the NoSQL DB (and optionally simulate a notification/email).
* Use the **Pub/Sub Emulator** in **Docker** (no local gcloud install required).

---

### 5. Authentication

* All endpoints must require **JWT** (Bearer token).
* Keep it **simple**: a minimal `/auth/login` that issues a JWT is enough.
* No need for complex user management; you can seed a demo user.

---

### 6. Unit tests

Cover at least:

* **Assignment service**: ensuring a driver cannot be assigned more than one active load.
* **Load service**: cache hit/miss and invalidation.
* **Publisher/consumer**: mock Pub/Sub to verify publish/consume logic.

---

### 7. Endpoint test script

Provide a single script (e.g., `scripts/test_endpoints.sh`) using **curl** that:

1. Logs in to get a JWT.
2. Creates a user.
3. Creates drivers and loads.
4. Lists loads (showing cache usage).
5. Assigns a load to a driver.
6. Fetches the assignment details.
7. Tries assigning another load to the same driver (should fail).

Script must pass `Authorization: Bearer <token>` header.

---

## Minimum endpoints

* `POST /auth/login` → returns a JWT
* `POST /users`
* `POST /drivers`
* `POST /loads`
* `GET /loads` (must use **Redis**)
* `POST /assignments` → `{ driverId, loadId }`

  * Ensure one active load per driver
  * Publish `load.assigned` to Pub/Sub
* `GET /assignments/:id` → assignment details
* `PATCH /assignments/:id/status` → `{ status: "COMPLETED" | "CANCELLED" }` and record an event in NoSQL

---

## Tech requirements

* **Node.js** (Nest.js preferred; Express OK if structure is similarly clean).
* **Docker mandatory** for:

  * **Postgres**, **Redis**, **your chosen NoSQL**, and **Pub/Sub Emulator** (so nothing is installed locally).
* `docker-compose up -d` must bring up all infrastructure.
* Provide **NPM scripts** to run app, worker, migrations, and tests.
* Provide **migrations** for Postgres (Prisma or TypeORM/Knex).
* Provide `.env.example`.
* Provide a **short, crystal-clear README** (template included).
* Delivery: **GitHub repo (public)** or **ZIP**.

---

### 🔑 Key requirement

**One of the most important requirements is that the delivery must be extremely well-organized: I should be able to clone the repository, run one or two simple commands, and immediately see the system working without any extra setup or troubleshooting.**
