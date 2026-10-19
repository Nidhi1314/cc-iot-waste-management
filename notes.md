# WasteWise Team Study and Viva Notes

These notes help each team member study their part of the project and understand how it connects to the others.

## Project and architecture at a glance

WasteWise is a smart waste-collection demo. Admins can manage bins and vehicles and request collection routes. Drivers can view route information. Predictive routing uses simulated historical bin readings to estimate which bins may need collection soon.

```text
Monisha: React dashboard
Admin/driver browser
        |  login, bin/route views, user actions
        v
Hemanth: NestJS API and data features  <-----> Neon PostgreSQL
        |                                      accounts, bins,
        | route request                         vehicles, readings,
        v                                      saved routes
Anukrati: FastAPI optimization and ML service
        |  selected bins and optimized stop order
        v
Nidhi: API route integration saves route and returns result
        |
        +----> ORS directions via API (road-following map line)
        |
        +----> Dashboard displays route

Nidhi: Docker Compose runs the services together;
       GitHub Actions checks code and builds images (no deployment)
```

**In simple terms:** the dashboard sends a request to the API; the API reads and saves data in Neon and calls the Python service when it needs route optimization or predictions; the API sends the result back to the dashboard. ORS can provide road-following directions for display, while the Python optimizer chooses the stop order. Docker Compose runs the app services locally; Neon is the hosted database.

## Person-by-person study guide

For your part, read the listed files, follow the flow below, and practice answering the questions in your own words. The answers describe the current demo; be clear that sensor history is simulated and the app is not connected to physical sensors.

### Monisha Badugu — frontend and dashboard

**What this work means:** The visible website used by admins and drivers. It provides the screens and interactions, sends requests to the API, and displays the response. It does not query Neon directly or calculate the optimized route.

**Simple flow:**

1. The app starts and shows the login page.
2. After login, it keeps session information and uses a shared API client for protected requests.
3. The dashboard loads information and shows views appropriate to the user's role.
4. When an admin requests a route, the UI sends the request to NestJS and displays the result or an error.
5. The map visualizes bin and route information returned by the backend.

**Files to study:**

- `web/src/main.tsx` and `web/src/app/` — app startup, routing, and providers.
- `web/src/routes/login.tsx`, `web/src/features/auth/`, and `web/src/lib/auth-storage.ts` — login and session handling.
- `web/src/lib/api-client.ts` — how browser requests are made to the API.
- `web/src/routes/dashboard.tsx` and `web/src/components/` — dashboard and shared UI.
- `web/src/features/bins/`, `web/src/features/routes/`, `web/src/features/vehicles/`, and `web/src/features/driver/` — feature screens and API calls.
- `web/src/features/pseudo-map/` — map and route visualization.

**Probable viva questions**

**Q: What is the frontend responsible for?**

A: It provides the screens and interactions. It requests data from the backend and displays the results to admins and drivers.

**Q: How does the frontend communicate with the backend?**

A: It uses a shared API client to send HTTP requests to NestJS. Protected requests include the user's authentication token.

**Q: Does the frontend calculate the route?**

A: No. It asks the API to generate the route and displays the result returned by the backend.

**Q: How do admin and driver screens differ?**

A: The views are role-specific. Admins manage bins and generate routes; drivers focus on their route and collection information.

### Hemanth Sai Somaraju — backend foundations and domain APIs

**What this work means:** The central application API. It receives web requests, checks and processes them, then reads or updates the related information in Neon. It provides common backend features used by the route integration too.

**Simple flow:**

1. The browser sends an HTTP request to an API controller.
2. The controller receives the request and passes it to a service.
3. The service applies application rules and uses database code to read or save information.
4. The API returns a response to the browser.
5. For sensor ingestion, the API stores the reading and updates the bin's current fill and collection-needed status.

**Files to study:**

- `api/src/main.ts` and `api/src/app.module.ts` — API startup and module setup.
- `api/src/infrastructure/database/` and `api/drizzle/` — database connection, schema, and migrations.
- `api/src/modules/bins/` and `api/src/modules/vehicles/` — bin and vehicle endpoints and business logic.
- `api/src/modules/auth/` and `api/src/common/` — login, JWT, roles, guards, and request validation.
- `api/src/modules/sensors/` — sensor reading validation, storage, and bin update.
- `api/src/modules/routes/routes.schema.ts` — route record shape used by the route feature.

**Probable viva questions**

**Q: Why separate controllers, services, and repositories?**

A: Controllers handle HTTP requests, services contain application rules, and repositories/database code handle data access. Each part has a clear job.

**Q: What is a DTO?**

A: It describes the expected fields in a request. The API validates those fields before processing the request.

**Q: How are user requests protected?**

A: Users sign in and receive a JWT. The API checks the token and the user's role on protected endpoints.

**Q: What happens when a sensor reading is submitted?**

A: The API checks the bin, stores the reading, and updates the bin's current fill and whether it needs collection. The demo data is simulated; no physical sensor is connected.

**Q: What does Neon store?**

A: Application data such as accounts, bins, vehicles, sensor readings, and generated routes.

### Anukrati Chaturvedi — optimization and ML service

**What this work means:** The Python service that helps decide which bins to collect and in what order. It supports regular route optimization and a predictive demo that estimates future fill from generated history.

**Simple flow:**

1. `seed_ml_data.py` creates simulated past fill readings in the database; it does not read data from actual hardware.
2. The training endpoint reads those readings and trains a Random Forest model.
3. The model and bin-ID encoder are saved as `.pkl` files in the ML service's local filesystem.
4. For predictive routing, the service estimates fill increase, adds it to each known bin's current fill, and selects bins projected to reach the 75% threshold.
5. The selected bins are sent to the optimizer, which returns a stop order to the API.

For regular routing, the optimizer receives bins already needing collection. It uses simplified coordinate distances for the stop order. ORS directions are a separate map-display step.

**Files to study:**

- `ml/main.py` — FastAPI endpoints, route optimization, model training, and prediction.
- `ml/test_ml.py` — tests for ML service behavior.
- `ml/requirements.txt` — Python libraries used by the service.
- `seed_ml_data.py` — synthetic history generation.
- `ml/Dockerfile` — how the ML service is packaged.

**Probable viva questions**

**Q: What is the difference between regular and predictive routing?**

A: Regular routing uses bins that currently need collection. Predictive routing estimates which bins may need collection later, then creates a route for those bins.

**Q: What does the Random Forest predict?**

A: It predicts fill increase between readings using features such as bin identity, hour, and weekend status. The service uses this estimate to project fill for the requested time horizon.

**Q: Is the model trained on real sensor readings?**

A: No. The demo uses synthetic readings generated by `seed_ml_data.py`. No physical sensor is connected.

**Q: How does the optimizer choose route order?**

A: It calculates simplified distances between coordinates and uses OR-Tools to find a stop order. ORS separately provides road-following geometry for the map.

**Q: Does the reported R² prove real-world accuracy?**

A: No. The current score is calculated on the training data, not an independent test set. It demonstrates the workflow, but does not validate real-world accuracy.

### Nidhi Shekhawat — route integration, directions, containers, and CI

**What this work means:** This part joins the API and Python service into a working route-generation flow, adds the directions-provider integration, and helps run and check the application services together.

**Simple flow:**

1. NestJS receives a route request from the dashboard.
2. The route service reads the bins and sends the required data to FastAPI.
3. FastAPI returns an optimized route result; NestJS validates and stores the route in Neon.
4. The API returns the saved route to the dashboard. For map directions, the API separately sends ordered coordinates to ORS and returns road-following geometry.
5. Docker Compose builds and starts the web, API, and ML containers locally. GitHub Actions checks code and builds images when changes are pushed or a pull request is opened.

**Files to study:**

- `api/src/modules/routes/routes.controller.ts` and `api/src/modules/routes/routes.service.ts` — route request, optimizer call, route saving, and ORS directions proxy.
- `api/src/modules/routes/routes.repository.ts` and `api/src/modules/routes/routes.schema.ts` — saved route representation.
- `api/src/infrastructure/database/seed.ts` — demo bin coordinates.
- `compose.yaml` and `api/Dockerfile`, `ml/Dockerfile`, `web/Dockerfile` — container setup, ports, configuration, and networking.
- `web/nginx.conf` — web container's static-file server.
- `.env.example` — configuration variable names; real credentials stay in the local `.env`.
- `.github/workflows/ci.yml` — automated checks and Docker image builds.

**Probable viva questions**

**Q: What does the API do with the optimizer's response?**

A: It validates the response, saves the route in Neon, then returns the saved route data to the frontend.

**Q: What is ORS used for?**

A: ORS returns road-following directions geometry for display. It does not choose collection stops or calculate the optimizer's stop order.

**Q: Why does the browser not call ORS directly?**

A: The API key should not be exposed in browser code. The API uses the key on the server and returns the directions result.

**Q: What does Docker Compose do?**

A: It builds and runs the web, API, and ML containers together and lets them communicate on a local container network. Neon remains the hosted database.

**Q: What does the CI workflow do? Does it deploy the application?**

A: It runs checks and builds Docker images. It does not deploy the app; the application services are run locally unless separately hosted.

## How the parts connect

During the demo, Monisha can show the dashboard action; Hemanth can explain the API and database handling; Anukrati can explain prediction and stop ordering; Nidhi can explain how the API connects the services, saves the result, and obtains directions. The request starts in the browser and returns to it with the route result.
