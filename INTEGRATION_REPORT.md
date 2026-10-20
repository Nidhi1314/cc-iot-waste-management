# WasteWise Integration Report

This report describes how the current WasteWise web app, API, algorithm service, database, Docker Compose setup, and CI workflow fit together.

## System overview

WasteWise runs as three application services:

| Service | Implementation | Responsibility |
|---|---|---|
| Web | React, TypeScript, Vite | Admin and driver user interfaces |
| API | NestJS, Drizzle ORM | Authentication, authorization, application rules, and persistence |
| Algorithm | FastAPI, OR-Tools, scikit-learn | Route optimization, fill-level prediction, and demo simulation |
| Database | PostgreSQL-compatible Neon database | Stores operator, bin, sensor, and route data |

The main request path is:

```text
Browser -> NestJS API -> Neon database
                    -> FastAPI algorithm service
```

The browser sends application requests to the API. The API calls the algorithm service for route optimization and predictive routing; it also proxies optional OpenRouteService directions requests. Both the API and algorithm service connect to the configured database.

## Service integration

### Web application

The `web/` application provides separate admin and driver dashboards. It uses the API client in `web/src/lib/api-client.ts` and feature API modules under `web/src/features/`. The base API URL is configured with `VITE_API_BASE_URL` at build time; Docker Compose builds the web image with `http://localhost:3000`.

After login, the web app stores the returned access token and sends it with protected API requests. Admin-only actions include generating regular or predictive routes, managing route completion/deletion, and running demo simulation actions. Drivers can view their assigned routes, record completed stops, and mark a route complete.

### NestJS API

The API is the application boundary for browser requests. It handles login and role-based authorization, reads and writes application data through Drizzle, validates request data, and validates algorithm responses before saving generated routes.

Important route endpoints include:

| Endpoint | Access | Purpose |
|---|---|---|
| `POST /auth/login` | Public | Authenticate an operator and return an access token |
| `GET /bins` | Authenticated | List bins |
| `GET /bins/critical` | Admin or driver | List bins requiring collection |
| `GET /routes` and `GET /routes/active` | Admin or driver | List routes |
| `POST /routes/generate` | Admin | Generate a route from bins needing collection |
| `POST /routes/generate-predictive` | Admin | Request a 24-hour predictive route |
| `PATCH /routes/:id/complete` | Admin or driver | Mark a route complete |
| `DELETE /routes/:id` | Admin | Delete a route |
| `POST /routes/directions` | Admin or driver | Request road directions through the API |

The API calls the algorithm service using `ALGORITHM_URL`. It applies a request timeout and checks the returned payload against Zod schemas before persisting waypoints. The algorithm's `snake_case` response fields are mapped to the API's route model.

### FastAPI algorithm service

The service in `ml/main.py` provides:

| Endpoint | Purpose |
|---|---|
| `GET /health` | Health check used by Docker Compose |
| `POST /optimize-cvrp` | Optimize a collection route with OR-Tools |
| `POST /ml/train-model` | Train a Random Forest model from sensor history and save model files in the service working directory |
| `POST /ml/predictive-cvrp` | Predict future bin fill levels and optimize a route for bins expected to reach the collection threshold |
| `POST /simulate-next-day` | Increase bin fill levels for a demo scenario and update collection flags |
| `POST /reset-bins` | Reset bin fill levels and mark active routes complete for a demo reset |

For regular route generation, the API sends the assigned vehicle and bins needing collection to `/optimize-cvrp`. The algorithm returns an ordered waypoint list; the API validates and saves it.

For predictive route generation, the API sends the available bins and a 24-hour horizon to `/ml/predictive-cvrp`. The algorithm includes bins already at the collection threshold and uses its trained model to estimate which other known bins may reach it. Predictive generation for bins below the threshold requires the model to have been trained first.

The route optimizer currently models one vehicle and uses a synthetic depot located at the average coordinates of the supplied bins. Its distance cost is based on coordinate distance, not road-network travel time. When directions are requested, the API can optionally call OpenRouteService if `ORS_API_KEY` is configured.

## Database and configuration

The repository does not include a database. Configure `DATABASE_URL` in the root `.env` with a PostgreSQL-compatible Neon connection string. The API also requires `JWT_SECRET`; `ORS_API_KEY` is optional. The algorithm service uses the same database URL for sensor history and demo simulation operations.

Apply migrations from `api/` before using a fresh database:

```bash
npm run db:migrate
```

The API and algorithm service connect to Neon independently. A successful FastAPI `/health` response confirms that the algorithm process is running; it does not confirm database connectivity.

Keep credentials in `.env`, do not commit them, and use a disposable development database for seed or demo operations. The seed scripts modify or replace data; see the root README for their specific effects and invocation order.

## Docker Compose

The root `compose.yaml` defines the `web`, `api`, and `ml` services. It:

- Publishes the dashboard at port `5173`, the API at `3000`, and the algorithm service at `8000`.
- Passes `DATABASE_URL` to both the API and algorithm service, and `JWT_SECRET` to the API.
- Configures the API to call the algorithm service at `http://ml:8000` on the Compose network.
- Waits for the algorithm service health check before starting the API.

Compose does not apply migrations or seed the database automatically. Apply migrations before using a new database, and follow the README's safety instructions before seeding.

## Continuous integration

The workflow in `.github/workflows/ci.yml` runs on pushes and pull requests. Its jobs:

- Install web dependencies, run ESLint, and build the Vite application.
- Install API dependencies, build and lint the NestJS API, and run its e2e tests with CI-only environment values.
- Install ML dependencies, compile Python files, and check the health function.
- Build the API, web, and ML Docker images.

CI verifies the configured build and test steps; it does not connect to the project's Neon database or deploy the services.
