# WasteWise Frontend Endpoint Contract (MVP)

This contract is extracted from `wastewise-backend` source and is the build baseline for the frontend.

## Auth

| Method | Path | Auth | Roles | Request | Response |
|---|---|---|---|---|---|
| POST | `/auth/login` | Public | Public | `{ userCode: string, password: string }` | `{ accessToken: string, user: { id: string, userCode: string, role: 'ADMIN' \| 'DRIVER' } }` |

## Bins

| Method | Path | Auth | Roles | Request | Response |
|---|---|---|---|---|---|
| GET | `/bins` | Bearer JWT | `ADMIN`, `DRIVER` | Query: `limit`, `offset` | `SmartBin[]` |
| GET | `/bins/critical` | Bearer JWT | `ADMIN`, `DRIVER` | None | `SmartBin[]` |
| GET | `/bins/:id` | Bearer JWT | `ADMIN`, `DRIVER` | Path: `id` (UUID) | `SmartBin` |

## Vehicles (Operator Accounts)

| Method | Path | Auth | Roles | Request | Response |
|---|---|---|---|---|---|
| GET | `/vehicles` | Bearer JWT | `ADMIN` | Query: `limit`, `offset` | `VehiclePublic[]` |
| GET | `/vehicles/:id` | Bearer JWT | `ADMIN` | Path: `id` (UUID) | `VehiclePublic` |

## Routes

| Method | Path | Auth | Roles | Request | Response |
|---|---|---|---|---|---|
| GET | `/routes` | Bearer JWT | `ADMIN`, `DRIVER` | Query: `limit`, `offset` | `Route[]` |
| GET | `/routes/active` | Bearer JWT | `ADMIN`, `DRIVER` | None | `Route[]` |
| GET | `/routes/:id` | Bearer JWT | `ADMIN`, `DRIVER` | Path: `id` (UUID) | `Route` |
| POST | `/routes/generate` | Bearer JWT | `ADMIN` | `{ assignedCarId: string }` (UUID) | `Route[]` |
| PATCH | `/routes/:id/complete` | Bearer JWT | `ADMIN`, `DRIVER` | Path: `id` (UUID) | `Route` |

## Sensors (MVP Optional Read)

| Method | Path | Auth | Roles | Request | Response |
|---|---|---|---|---|---|
| GET | `/sensors/history/:binId` | Bearer JWT | `ADMIN`, `DRIVER` | Path: `binId` (UUID), Query: `limit` | `SensorData[]` |

## Important Known Integration Risk

- Backend route generation validates algorithm response with strict UUID schema.
- Current `wastewise-algorithm/main.py` returns mock IDs like `arac_1`, `Kutu-A`.
- This mismatch can make `POST /routes/generate` fail until contracts are aligned.
