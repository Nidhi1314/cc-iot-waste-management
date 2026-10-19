# WasteWise Project Architecture

This document explains how WasteWise works across the frontend, backend, and route-optimization algorithm service.

## 1. High-level architecture

WasteWise is a 3-service system:

- `web` (React): UI for admin and driver users
- `api` (NestJS): authentication, business rules, persistence, and integration with algorithm service
- `ml` (FastAPI): solves route order using CVRP logic

Main runtime dependency chain:

```text
Frontend -> Backend API -> Algorithm Service
                    -> Database
```

## 2. Frontend responsibilities

Frontend path: `web`

Core behavior:

- Login UI calls `POST /auth/login`
- Stores JWT and sends it in `Authorization: Bearer <token>`
- Dashboard loads bins, routes, and vehicle/operator accounts
- Admin can trigger route generation
- Driver can view active assigned routes and complete a route

Relevant files:

- API client and token handling: `web/src/lib/api-client.ts`
- Dashboard orchestration: `web/src/routes/dashboard.tsx`
- Route API bindings: `web/src/features/routes/api.ts`

## 3. Backend responsibilities

Backend path: `api`

Core behavior:

- Authenticates users with JWT and role checks (`ADMIN`, `DRIVER`)
- Ingests and stores sensor/bin telemetry
- Tracks bins that need collection (critical threshold)
- Calls algorithm service for route optimization
- Validates algorithm responses with Zod before persistence

Route generation flow in backend (`RoutesService.generate`):

1. Fetch bins that need collection
2. Build payload with bin coordinates/fill/capacity
3. POST payload to `${ALGORITHM_URL}/optimize-cvrp`
4. Validate response schema
5. Convert waypoints and store routes in DB
6. Return generated routes to frontend

Relevant files:

- Route generation service: `api/src/modules/routes/routes.service.ts`
- Algorithm response contracts: `api/src/modules/routes/routes.dto.ts`

## 4. Algorithm service responsibilities

Algorithm path: `ml`

The service exposes:

- `GET /health`
- `POST /optimize-cvrp`

Input contract (`OptimizeRequest`):

- `assigned_car_id`: UUID string
- `bins[]` with:
  - `id`
  - `lat`
  - `lng`
  - `current_fill_level` (0..100)
  - `max_capacity_kg` (>0)

Current optimization model:

- Creates a synthetic depot (average of bin coordinates)
- Converts fill percent and bin capacity to integer demand per bin
- Uses OR-Tools RoutingModel with one vehicle
- Solves with `PATH_CHEAPEST_ARC`
- Returns ordered waypoints and total collected weight

Relevant file:

- `ml/main.py`

## 5. End-to-end route generation sequence

1. Admin selects assigned vehicle in frontend and clicks Generate Route
2. Frontend calls `POST /routes/generate` with `assignedCarId`
3. Backend gathers critical bins and calls algorithm `POST /optimize-cvrp`
4. Algorithm returns route order (`waypoints_order`)
5. Backend validates, saves route, and returns route entities
6. Frontend refreshes route and critical bin queries

## 6. Important environment variables

Backend (`api`):

- `DATABASE_URL`
- `JWT_SECRET`
- `ALGORITHM_URL`
- Optional: `ALGORITHM_TIMEOUT_MS`
- Optional: `ROUTE_ALGO_ASSIGNED_CAR_MODE=monitor|enforce`

Frontend (`web`):

- `VITE_API_BASE_URL`

Algorithm (`ml`):

- No required custom env vars in current implementation

## 7. Notes and constraints

- Route generation depends on algorithm service availability
- Backend rejects/handles invalid algorithm responses through schema checks
- If no bins are critical, route generation returns a business-rule error
- Assigned vehicle consistency can be monitored or enforced with backend config
