# WasteWise Backend & Algorithm Integrations: Final Report

This document outlines the integrations, bug fixes, and architectural adjustments made to the WasteWise system to establish seamless communication between the Next.js Frontend, the NestJS Backend, and the FastAPI (OR-Tools) Algorithm Engine.

## Overview of Implementations

We successfully implemented a "Simulation & Demo" flow designed specifically for jury presentations and testing. This flow relies heavily on the FastAPI engine for complex data generation and AI-based CVRP (Capacitated Vehicle Routing Problem) calculations.

### 1. Data Seeding ("Sıfırıncı Gün" - Day 0)
- **File:** `seed_data.py` (Root Directory)
- **Functionality:** A nuclear-option script that purges all existing data in the `smart_bins`, `routes`, and `sensor_data` tables (`TRUNCATE CASCADE`). It then generates 50 synthetic Smart Bins scattered randomly around Times Square, Manhattan (Base Lat: 40.7580, Base Lng: -73.9855).
- **Key Features:** Uses `psycopg2.extras.execute_batch` for highly performant bulk inserts. Handled strict database schema constraints (e.g., dynamically generating `address` strings like "Manhattan, NY - Bin 1" and hardcoding required fields like `total_depth_cm`).

### 2. Time Machine / Fill Level Simulation
- **Endpoint:** `POST http://localhost:8000/simulate-next-day` (FastAPI)
- **Frontend Action:** "Zamanı İleri Sar (Simüle Et)" button on the Admin Dashboard.
- **Functionality:** Simulates the passage of time by randomly adding 35% to 95% of trash (up to a max of 100%) to all existing smart bins in the database in a single transaction. This allows the system to transition from an empty "Day 0" state to a "Critical Collection" state instantly.

### 3. AI Route Generation (Custom CVRP via OR-Tools)
- **Endpoint:** `POST http://localhost:8000/run-demo-cvrp` (FastAPI)
- **Frontend Action:** "AI Rotalarını Çiz" button on the Admin Dashboard.
- **Functionality:** 
  1. Queries the database for all bins with a `current_fill_level >= 75`.
  2. Dynamically queries the `vehicles` table to find an active driver (`role = 'DRIVER' LIMIT 1`).
  3. Feeds the data into Google OR-Tools to solve the Capacitated Vehicle Routing Problem.
  4. Formats the resulting route into a strictly `camelCase` JSON payload (`binId`, `collectedKg`) expected by the frontend.
  5. **Persistence:** Saves this optimized route directly into the Neon DB `routes` table (as `jsonb`) and marks the relevant bins as `needs_collection = TRUE`.

## Critical Bug Fixes & Architectural Decisions

### A. The CORS (Cross-Origin Resource Sharing) Crisis
- **Symptoms:** The Next.js frontend (`localhost:5173`) was unable to communicate with the NestJS backend (`localhost:3000`) for login, nor could it communicate with FastAPI (`localhost:8000`). Requests failed with `Status code: (null)`.
- **Resolution:**
  - Relaxed CORS policies in `api/src/main.ts` by allowing `http://127.0.0.1:5173`, `http://localhost:5173`, and `http://localhost:3000`. Changed `allowedHeaders` to `*` to allow native browser preflight requests.
  - Added the `CORSMiddleware` to `ml/main.py`, enabling cross-origin requests directly to the algorithm engine.
  - Re-routed the frontend API calls (`simulateNextDay`, `runDemoCVRP`) in `api.ts` to directly fetch from the `8000` port instead of routing through the NestJS proxy.

### B. The "binId is undefined" UI Crash
- **Symptoms:** When logging in as `DRIVER-01`, the application crashed with a React Error Boundary indicating `TypeError: binId is undefined` inside the `DriverActiveRoutePanel`.
- **Root Cause:** A classic case of Case Convention mismatch. FastAPI was outputting Pythonic `snake_case` (`bin_id`, `collected_kg`), but the Next.js frontend strictly expected JavaScript `camelCase` (`binId`, `collectedKg`). Furthermore, Drizzle ORM in NestJS read the `jsonb` column directly without applying mapping decorators.
- **Resolution:** 
  - Restructured the FastAPI `return` payload in `optimize_cvrp` to use `camelCase`.
  - Modified the DB Insert logic in `main.py` to write the JSONB data exactly as `camelCase`.
  - Purged old, corrupt `snake_case` records from the `routes` table to prevent legacy data from crashing the newly fixed UI.

### C. The `uuid[]` Type Cast Issue
- **Symptoms:** FastAPI failed to update the `needs_collection` status of the bins after generating a route.
- **Root Cause:** PostgreSQL threw a strict type error: `operator does not exist: uuid = text`. Python arrays were being passed as string lists, but the database expected a proper UUID array.
- **Resolution:** Added an explicit type cast `ANY(%s::uuid[])` in the SQL query, bridging the gap between Python strings and Postgres UUIDs.

## How to Present (The Demo Flow)
1. Run `python3 seed_data.py` to initialize Times Square bins (Day 0).
2. Login as `ADMIN-01`.
3. Click **"Zamanı İleri Sar (Simüle Et)"** to simulate garbage filling up.
4. Click **"AI Rotalarını Çiz"** to calculate the most efficient path for critical bins and save it to the DB.
5. Logout and Login as `DRIVER-01`.
6. View the newly generated route seamlessly on the Driver Dashboard without crashes!