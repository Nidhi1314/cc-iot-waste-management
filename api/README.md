# WasteWise Backend

NestJS + TypeScript backend for smart waste-bin monitoring, vehicle/operator access, sensor ingestion, and route planning.

## What this backend does

- Authenticates users (admin/driver) with JWT.
- Ingests sensor readings from devices using machine auth (HMAC).
- Tracks bin fill levels and marks bins that need collection.
- Manages vehicles and bins.
- Generates collection routes via an external optimization service.

## Tech stack

- NestJS 11
- TypeScript
- Drizzle ORM + PostgreSQL (Neon)
- Zod request validation
- JWT auth

## Project structure

```text
src/
  common/
    decorators/roles.decorator.ts
    guards/jwt.guards.ts
    guards/login-throttle.guard.ts
    guards/sensor-auth.guard.ts
    pipes/zod-validation.pipe.ts
  infrastructure/
    database/
  modules/
    auth/
    vehicles/
    bins/
    sensors/
    routes/
```

Each module follows controller -> service -> repository.

## Core domain flow

1. Sensor device sends reading to `POST /sensors/data`.
2. Backend validates HMAC signature and payload.
3. Backend stores `sensor_data` row and updates bin fill level in one transaction.
4. Bin is marked `needsCollection=true` when fill level is `>= 75`.
5. Admin triggers `POST /routes/generate` to call optimization service.
6. Generated routes are validated and stored transactionally.

## Security model

### 1) User auth (JWT)

- Login endpoint: `POST /auth/login`
- Successful login returns `accessToken` and user info.
- Protected endpoints require `Authorization: Bearer <token>`.

### 2) Role-based authorization (RBAC)

- Roles: `ADMIN`, `DRIVER`
- Enforced by `JwtGuard` + `@Roles(...)`
- Role mismatch returns HTTP `403`.

### 3) Machine auth for sensors

- `POST /sensors/data` is protected by HMAC signature guard.
- Supports rollout modes: `off`, `monitor`, `enforce`.
- Full signing details and examples: see `SECURITY.md`.

### 4) Login abuse protection

- `POST /auth/login` uses in-memory rate limiting guard.
- Limits by IP + `userCode` window.

## API routes and protection

### Auth

- `POST /auth/login` -> public (rate-limited)

### Vehicles

- `GET /vehicles` -> `ADMIN`
- `GET /vehicles/:id` -> `ADMIN`
- `POST /vehicles` -> `ADMIN`
- `PATCH /vehicles/:id` -> `ADMIN`
- `DELETE /vehicles/:id` -> `ADMIN`

### Bins

- `GET /bins` -> `ADMIN`, `DRIVER`
- `GET /bins/critical` -> `ADMIN`, `DRIVER`
- `GET /bins/:id` -> `ADMIN`, `DRIVER`
- `POST /bins` -> `ADMIN`
- `PATCH /bins/:id` -> `ADMIN`
- `PATCH /bins/:id/fill-level` -> `ADMIN`
- `DELETE /bins/:id` -> `ADMIN`

### Sensors

- `POST /sensors/data` -> machine-auth (HMAC)
- `GET /sensors/history/:binId?limit=20` -> `ADMIN`, `DRIVER`

### Routes

- `GET /routes` -> `ADMIN`, `DRIVER`
- `GET /routes/active` -> `ADMIN`, `DRIVER`
- `GET /routes/:id` -> `ADMIN`, `DRIVER`
- `POST /routes/generate` -> `ADMIN`
- `PATCH /routes/:id/complete` -> `ADMIN`, `DRIVER`

## Request validation and error behavior

- All DTOs are validated with Zod via `ZodValidationPipe`.
- Common status behavior:
  - `400` invalid payload or business-rule violations
  - `401` missing/invalid JWT or invalid sensor signature (enforce mode)
  - `403` authenticated but role not allowed
  - `404` resource not found
  - `409` conflict (example: duplicate vehicle user code)
  - `503` upstream route optimizer unavailable

## Pagination and limits

- List endpoints support `limit` and `offset` with server-side clamping.
- Sensor history `limit` is bounded (max 200).

## External route optimization service

- Backend calls `${ALGORITHM_URL}/optimize-cvrp`.
- Response is validated with Zod.
- Request has timeout (`ALGORITHM_TIMEOUT_MS`).
- Assigned vehicle mismatch can be:
  - `monitor`: log warning and continue
  - `enforce`: reject request

Configured by `ROUTE_ALGO_ASSIGNED_CAR_MODE=monitor|enforce`.

## Environment variables

Required core:

- `DATABASE_URL`
- `JWT_SECRET`
- `ALGORITHM_URL`

Optional auth/security controls:

- `JWT_EXPIRES_IN` (default `24h`)
- `LOGIN_RATE_LIMIT_MAX_ATTEMPTS` (default `8`)
- `LOGIN_RATE_LIMIT_WINDOW_MS` (default `60000`)
- `SENSOR_AUTH_MODE=off|monitor|enforce` (default `monitor`)
- `SENSOR_AUTH_KEYS` (JSON map of keyId -> secret)
- `SENSOR_AUTH_MAX_CLOCK_SKEW_SEC` (default `300`)
- `ALGORITHM_TIMEOUT_MS` (default `8000`)
- `ROUTE_ALGO_ASSIGNED_CAR_MODE=monitor|enforce` (default `monitor`)

## Local development

Install:

```bash
npm install
```

Run dev server:

```bash
npm run start:dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Tests:

```bash
npm run test
npm run test:e2e
```

## Database and seed

Generate migrations:

```bash
npm run db:generate
```

Run migrations:

```bash
npm run db:migrate
```

Seed sample data:

```bash
npm run db:seed
```

Translate existing Turkish demo bin addresses to English without clearing database data:

```bash
npm run db:translate-bin-addresses
```

## Notes for newcomers

- Start from `src/app.module.ts` to see module wiring.
- Then check module controllers to understand API surface.
- Business logic lives in `*.service.ts`.
- Database queries live in `*.repository.ts`.
- Review `SECURITY.md` before integrating sensor devices.
