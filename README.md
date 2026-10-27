# WasteWise

WasteWise is a smart waste-collection platform made of three services:

- `web/` — React + Vite operations dashboard
- `api/` — NestJS API backed by PostgreSQL through Neon
- `ml/` — FastAPI route-optimization and prediction service

The API and ML service require a PostgreSQL-compatible `DATABASE_URL`. No database is included in this repository; use a development Neon database (or another database supported by the Neon serverless driver). `ORS_API_KEY` is optional and enables road-following directions on the map. Keep it in the root `.env`; the API proxies direction requests so the key is not sent to browser code.

The organics workflow supports configurable fill and waste-age collection triggers, scheduled age checks, generator-specific sensor simulation and forecasting, destination-aware organic route planning, measured collection/delivery records, and impact metrics. Apply all migrations before using these features.

## Requirements

- Node.js 22 LTS and npm
- Python 3.11
- Docker Desktop (for the containerized setup)
- A development database URL and a private JWT secret

Copy `.env.example` to `.env` in the project root and set `DATABASE_URL` and `JWT_SECRET`. To enable road-following routes, also set `ORS_API_KEY`. Do not commit `.env` or share its contents.

## Run locally

### 1. Start the algorithm service

From the project root:

```bash
python3.11 -m venv ml/.venv
ml/.venv/bin/python -m pip install -r ml/requirements.txt
ml/.venv/bin/python -m uvicorn --app-dir ml main:app --host 0.0.0.0 --port 8000 --reload
```

On Windows, create/activate `ml\.venv` and use `ml\.venv\Scripts\python.exe` in place of `ml/.venv/bin/python`.

Check `http://localhost:8000/health`; it should return `{"status":"ok"}`. Keep this terminal running.

### 2. Prepare and start the API

Open another terminal at the project root:

```bash
cd api
npm ci
npm run db:migrate
npm run start:dev
```

The API reads `DATABASE_URL`, `JWT_SECRET`, and optionally `ORS_API_KEY` from the root `.env` file. Keep this terminal running at `http://localhost:3000`.

### 3. Start the dashboard

Open another terminal at the project root:

```bash
cd web
npm ci
npm run dev
```

Open `http://localhost:5173`. The dashboard uses the API at `http://localhost:3000`; the API securely proxies simulation requests to the ML service.

### 4. Seed demo data (optional)

After migrations, seed the demo vehicles and bins:

```bash
cd api
npm run db:seed
```

This seed **deletes existing routes, sensor readings, bins, and vehicles before inserting demo data**. Only run it against a disposable development database. The demo credentials are `ADMIN-01` / `DRIVER-01`, with password `wastewise123`; change or remove them before using a non-demo environment.

For a fresh demo database with 50 randomly placed Manhattan bins, first run the API seed above (it creates the demo vehicles), then from the project root run:

```bash
ml/.venv/bin/python seed_data.py
ml/.venv/bin/python seed_ml_data.py
```

`seed_data.py` replaces the bins, routes, and sensor readings with 50 randomly located demo bins; it leaves the demo vehicles in place. `seed_ml_data.py` then replaces the sensor readings with about 90 days of synthetic history. **Both scripts modify existing data**, so use only a disposable development Neon branch/database. They do not connect physical sensors.

For a new database, run migrations before any seed command. From the project root:

```bash
cd api
npm ci
npm run db:migrate
npm run db:seed
cd ..
```

This creates the database schema, demo vehicles, and the default seven Istanbul demo bins. To use the randomized 50-bin scenario instead, run `ml/.venv/bin/python seed_data.py` after this and before `seed_ml_data.py`.

To train for local development, first start the ML service using step 1, then in another terminal at the project root run:

```bash
curl -X POST http://localhost:8000/ml/train-model
```

The service reads sensor history and generator metadata from Neon, evaluates a time-ordered holdout, and saves the model and evaluation metadata under `ml/models/`. A successful response includes MAE/RMSE evaluation metrics. Do not run seed scripts against production data.

## Organics operations

- Admin settings control both the fill threshold and maximum waste age. The API checks age-based triggers on startup and every minute; sensor updates and manual fill changes apply the same limits immediately.
- Use **Optimize organic routes** to prioritize collection-ready generators, match each waste category to an open/active facility, and constrain each trip by vehicle capacity and remaining daily destination capacity.
- Use **Collections & impact** to record measured kilograms, contamination, and collection time, then confirm facility delivery. The dashboard aggregates confirmed delivered kilograms, completed organic trips, recorded route distance, and contamination.
- The **Simulation** tab adds generator-type/category-based waste and stores a corresponding sensor reading for each active generator. It is a demo tool, not a physical sensor feed.

### 5. Verify the local setup

- `http://localhost:8000/health` returns the ML health response.
- `http://localhost:5173` loads the dashboard.
- `curl -i http://localhost:3000/vehicles` returns `401` when no JWT is supplied; this verifies the API is running and protecting that endpoint.
- Use the demo credentials above to log in after seeding.

The API's e2e test does not need a live database:

```bash
cd api
DATABASE_URL='postgresql://test:test@localhost:5432/test' \
JWT_SECRET='ci-only-test-secret-not-for-production' \
ALGORITHM_URL='http://localhost:8000' \
npm run test:e2e -- --runInBand
```

The web quality checks are `cd web && npm run lint && npm run build`; the API build is `cd api && npm run build`. GitHub Actions runs these checks and builds all three container images on pushes and pull requests.

## Run with Docker Compose

Start Docker Desktop, create the root `.env` as described above, and apply migrations once as shown above. To start from a fresh randomized demo dataset, seed it before starting the containers, while your root `.env` points to the disposable development Neon database:

```bash
cd api && npm run db:seed
cd ..
ml/.venv/bin/python seed_data.py
ml/.venv/bin/python seed_ml_data.py
```

Then, from the project root, build and start the containers:

```bash
docker compose up --build
```

In a second terminal, train the model in the running ML container by calling its published API:

```bash
curl -X POST http://localhost:8000/ml/train-model
```

Training runs inside the container and saves model files to the persistent `ml-models` volume. The model file is not stored in Neon; it survives ordinary container recreation while that volume is retained. The synthetic sensor history remains in Neon unless one of the seed scripts is run again.

The services are available at:

| Service | Address |
|---|---|
| Dashboard | <http://localhost:5173> |
| API | <http://localhost:3000> |
| ML service / docs | <http://localhost:8000/docs> |

Compose waits for the ML health check before starting the API. Apply database migrations once before using the app (`cd api && npm run db:migrate`); Compose does not automatically seed or modify the database. Stop the services with `docker compose down`.

### Deploying to a cloud host

The repository provides container images and a Compose deployment, but does not deploy to a cloud account automatically. Configure a managed PostgreSQL URL, a unique secret `JWT_SECRET`, comma-separated public dashboard origins in `FRONTEND_ORIGINS`, and the browser-reachable HTTPS API URL in `VITE_API_BASE_URL` before building the web image. Compose binds service ports to loopback; place a TLS reverse proxy on the host in front of the dashboard and API, and keep the ML service reachable only over the internal network. Persist `/app/models` with a durable volume. Run `npm run db:migrate` against the target database before switching traffic. Never use the demo seed scripts or demo credentials in production.

## Team contribution areas

| Team member | Contribution area |
|---|---|
| Monisha Badugu | Frontend and dashboard |
| Hemanth Sai Somaraju | Backend APIs and data model |
| Anukrati Chaturvedi | Route optimization and ML service |
| Nidhi Shekhawat | Backend integration, Docker, and CI |

## Troubleshooting

- **Missing `DATABASE_URL` / `JWT_SECRET`:** populate the root `.env`; do not put real values in `.env.example`.
- **Database migration or seed fails:** check database connectivity and that the URL is valid. The seed command is destructive, so use a development database only.
- **Frontend network error:** confirm all three services are running and that ports `3000`, `5173`, and `8000` are available.
- **Docker Compose cannot connect to Docker:** start Docker Desktop, then retry `docker compose up --build`.
- **Python package install fails:** confirm Python 3.11 is active and re-run the install command using the `ml/.venv` environment.
