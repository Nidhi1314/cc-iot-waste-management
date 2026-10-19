# WasteWise Frontend

React + TypeScript terminal-style operations dashboard for WasteWise.
Two role-specific UIs share a single Catppuccin Mocha dark palette and JetBrains Mono font.

## Tech Stack

- React + Vite + TypeScript
- TanStack Router + TanStack Query
- Tailwind CSS (CSS variable tokens)
- React Leaflet + Leaflet (OpenStreetMap tiles)

## Routes

- `/login` — terminal auth card, shared by both roles
- `/dashboard` — delegates to `AdminShell` or `DriverShell` based on JWT role

## Admin Dashboard

Six tabs, fixed sidebar navigation, monospace terminal panels:

| Tab | Description |
|---|---|
| Overview | KPI stat blocks, critical bins list, recent routes |
| Surveillance | Full-screen Leaflet map (CartoDB Dark Matter), bin markers, route polyline |
| Bins | Searchable/filterable table, ASCII fill-level bars `[████░░] 72%` |
| Routes | Generate reactive CVRP or ML-predictive +24h routes, view waypoints, mark complete |
| Operators | Driver/admin account list |
| Simulation | Demo controls — simulate next day, reset bin fill levels; output in terminal box |

### ML Terminal Modal

Clicking `[GENERATE_ML_+24H]` opens a popup that streams algorithm steps (telemetry loading → temporal analysis → ML prediction → CVRP optimization → route compilation) as timed lines, then shows the API result.

## Driver Dashboard

Four tabs, same sidebar style as admin:

| Tab | Description |
|---|---|
| Route | Next-stop hero panel `┌─ NEXT_STOP ─┐`, sequential `[MARK_DONE]` per step |
| Map | Leaflet light map, NEXT_STOP detail card top-right, remaining-route polyline trims as stops are done |
| Summary | KPI stat blocks, collapsible waypoints list with `[DONE]`/`[PEND]` badges |
| Account | Profile panel, `[LOGOUT]` |

### Real-time sync

When the driver marks a stop done, the bin fill level is reset to 0 via `PATCH /bins/:id/fill-level` (requires `DRIVER` role on the backend). TanStack Query then invalidates the `['bins']` cache so the admin view reflects the change immediately.

### Stop progress persistence

Progress is stored in `localStorage` under the key `ww_driver_progress` as `Record<routeId, Record<stepKey, boolean>>`, so a page refresh does not lose completed stops.

## Map component

`src/components/map/waste-map.tsx` — shared by admin surveillance and driver map tabs.

- `theme="dark"` and `theme="light"` use OpenStreetMap tiles
- Bin colors: green (normal), amber (≥75% fill / critical), red (damaged)
- Completed bins turn solid green; the polyline trims to show only remaining stops
- `justCompletedBinId` triggers a CSS flash ring animation on the just-collected bin
- Completed routes render as a grey dashed polyline with faded bin markers

## Environment

Create `.env` in `wastewise-frontend/`:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

OpenRouteService is optional and is configured server-side through `ORS_API_KEY` in the project root `.env`; do not put it in a `VITE_` variable. The API proxies direction requests to avoid browser CORS restrictions and exposing the key in client JavaScript. OpenStreetMap background tiles need no key.

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run build
```

## API Contract

Frontend endpoint contract is documented in:

- `docs/endpoint-contract.md`
