import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthUser, RouteItem, SmartBin } from '../../../types/api';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../components/shared/states';

type DriverDashboardProps = {
  user: AuthUser;
  bins: SmartBin[];
  routes: RouteItem[];
  binsLoading: boolean;
  binsError: string | null;
  routesLoading: boolean;
  routesError: string | null;
  completePending: boolean;
  actionError: string;
  onCompleteRoute: (routeId: string) => void;
  onLogout: () => void;
};

type RouteProgressState = Record<string, Record<string, boolean>>;

export function DriverDashboard({
  user,
  bins,
  routes,
  binsLoading,
  binsError,
  routesLoading,
  routesError,
  completePending,
  actionError,
  onCompleteRoute,
  onLogout,
}: DriverDashboardProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedBinId, setSelectedBinId] = useState<string | null>(null);
  const [routeProgress, setRouteProgress] = useState<RouteProgressState>({});

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null,
    [routes, selectedRouteId],
  );

  const binsById = useMemo(
    () => new Map(bins.map((bin) => [bin.id, bin])),
    [bins],
  );

  const orderedStops = useMemo(
    () => (selectedRoute ? getOrderedStops(selectedRoute) : []),
    [selectedRoute],
  );

  const selectedProgress = useMemo(
    () => {
      if (!selectedRoute) {
        return {};
      }

      const progressForRoute = routeProgress[selectedRoute.id] ?? {};
      if (Object.keys(progressForRoute).length === 0) {
        return progressForRoute;
      }

      const validWaypointKeys = new Set(
        orderedStops.map((stop) => getWaypointKey(stop)),
      );

      return Object.fromEntries(
        Object.entries(progressForRoute).filter(([waypointKey]) =>
          validWaypointKeys.has(waypointKey),
        ),
      );
    },
    [orderedStops, routeProgress, selectedRoute],
  );

  const completedStopsCount = useMemo(
    () =>
      orderedStops.filter((stop) => Boolean(selectedProgress[getWaypointKey(stop)]))
        .length,
    [orderedStops, selectedProgress],
  );

  const remainingStopsCount = Math.max(orderedStops.length - completedStopsCount, 0);
  const nextPendingStop = useMemo(
    () =>
      orderedStops.find((stop) => !selectedProgress[getWaypointKey(stop)]) ?? null,
    [orderedStops, selectedProgress],
  );

  const nextPendingKey = nextPendingStop ? getWaypointKey(nextPendingStop) : null;
  const allStopsDone = orderedStops.length > 0 && remainingStopsCount === 0;

  const markStopDone = useCallback((routeId: string, waypointKey: string) => {
    setRouteProgress((previous) => {
      if (previous[routeId]?.[waypointKey]) {
        return previous;
      }

      return {
        ...previous,
        [routeId]: {
          ...(previous[routeId] ?? {}),
          [waypointKey]: true,
        },
      };
    });
  }, []);

  return (
    <main className="min-h-screen bg-app p-4 lg:p-6">
      <section className="mx-auto max-w-[1600px] space-y-4">
        <header className="rounded-lg border border-line bg-panel px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌱</span>
              <p className="text-lg font-semibold text-main">WasteWise</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-main">{user.userCode}</p>
              <span className="rounded-full border border-accent bg-panel2 px-2 py-1 text-xs font-semibold text-accent">
                DRIVER
              </span>
              <button
                className="rounded-md border border-line bg-panel2 px-3 py-2 text-sm font-semibold text-main hover:border-accent"
                onClick={onLogout}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {actionError ? (
          <ErrorState title="Action failed" description={actionError} />
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1fr_2.2fr_1fr]">
          <aside className="rounded-lg border border-line bg-panel p-4">
            {routesLoading ? (
              <LoadingState title="Loading active route" />
            ) : routesError ? (
              <ErrorState title="Failed to load routes" description={routesError} />
            ) : routes.length === 0 ? (
              <EmptyState
                title="No active route"
                description="You currently do not have an assigned active route."
              />
            ) : (
              <DriverActiveRoutePanel
                allStopsDone={allStopsDone}
                binsById={binsById}
                completedStopsCount={completedStopsCount}
                completePending={completePending}
                nextPendingKey={nextPendingKey}
                onMarkStopDone={markStopDone}
                onCompleteRoute={onCompleteRoute}
                onSelectBin={setSelectedBinId}
                onSelectRoute={setSelectedRouteId}
                progressByWaypointKey={selectedProgress}
                remainingStopsCount={remainingStopsCount}
                routes={routes}
                selectedBinId={selectedBinId}
                selectedRoute={selectedRoute}
              />
            )}
          </aside>

          <section className="rounded-lg border border-line bg-panel p-4">
            {binsLoading ? (
              <LoadingState title="Loading pseudo-map" />
            ) : binsError ? (
              <ErrorState title="Failed to load bins" description={binsError} />
            ) : (
              <DriverPseudoMap
                bins={bins}
                nextPendingKey={nextPendingKey}
                onSelectBin={setSelectedBinId}
                progressByWaypointKey={selectedProgress}
                selectedBinId={selectedBinId}
                selectedRoute={selectedRoute}
              />
            )}
          </section>

          <aside className="rounded-lg border border-line bg-panel p-4">
            {routesLoading ? (
              <LoadingState title="Loading route summary" />
            ) : routesError ? (
              <ErrorState title="Failed to load summary" description={routesError} />
            ) : routes.length === 0 || !selectedRoute ? (
              <EmptyState
                title="No route summary"
                description="Route metrics will appear here when a route is assigned."
              />
            ) : (
              <DriverRouteSummaryPanel
                binsById={binsById}
                completedStopsCount={completedStopsCount}
                progressByWaypointKey={selectedProgress}
                remainingStopsCount={remainingStopsCount}
                route={selectedRoute}
              />
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}

type DriverActiveRoutePanelProps = {
  routes: RouteItem[];
  selectedRoute: RouteItem | null;
  selectedBinId: string | null;
  binsById: Map<string, SmartBin>;
  progressByWaypointKey: Record<string, boolean>;
  completedStopsCount: number;
  remainingStopsCount: number;
  nextPendingKey: string | null;
  allStopsDone: boolean;
  completePending: boolean;
  onSelectRoute: (routeId: string) => void;
  onSelectBin: (binId: string) => void;
  onMarkStopDone: (routeId: string, waypointKey: string) => void;
  onCompleteRoute: (routeId: string) => void;
};

function DriverActiveRoutePanel({
  routes,
  selectedRoute,
  selectedBinId,
  binsById,
  progressByWaypointKey,
  completedStopsCount,
  remainingStopsCount,
  nextPendingKey,
  allStopsDone,
  completePending,
  onSelectRoute,
  onSelectBin,
  onMarkStopDone,
  onCompleteRoute,
}: DriverActiveRoutePanelProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const closeConfirmModal = useCallback(() => setIsConfirmOpen(false), []);

  const orderedStops = useMemo(
    () => (selectedRoute ? getOrderedStops(selectedRoute) : []),
    [selectedRoute],
  );
  const nextStop = useMemo(
    () =>
      orderedStops.find((stop) => !progressByWaypointKey[getWaypointKey(stop)]),
    [orderedStops, progressByWaypointKey],
  );

  if (!selectedRoute) {
    return (
      <EmptyState
        title="No selected route"
        description="Select a route to inspect stops."
      />
    );
  }

  const handleCompleteRoute = () => {
    if (completePending || selectedRoute.isCompleted || !allStopsDone) return;
    setIsConfirmOpen(true);
  };

  const confirmCompleteRoute = () => {
    if (completePending) return;
    onCompleteRoute(selectedRoute.id);
    closeConfirmModal();
  };

  return (
    <div className="flex h-full flex-col">
      <h2 className="text-lg font-semibold text-main">Active Route</h2>

      <p className="mt-1 text-xs text-soft">
        Route progress: {completedStopsCount}/{orderedStops.length} completed
      </p>

      {routes.length > 1 ? (
        <div className="mt-3 grid gap-2">
          {routes.map((route) => (
            <button
              className={`rounded-md border px-3 py-2 text-left text-xs ${
                route.id === selectedRoute.id
                  ? 'border-accent bg-panel2 text-main'
                  : 'border-line bg-panel2 text-soft hover:border-accent'
              }`}
              key={route.id}
              onClick={() => onSelectRoute(route.id)}
              type="button"
            >
              Route {route.id.slice(0, 8)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-md border border-line bg-panel2 px-3 py-2">
        <p className="text-xs uppercase tracking-wide text-soft">Next Stop</p>
        <p className="mt-1 text-sm font-semibold text-main">
          {nextStop
            ? stopLabel(nextStop.binId, binsById)
            : 'No stop available'}
        </p>
      </div>

      <ul className="mt-4 flex-1 space-y-2 overflow-auto pr-1">
        {orderedStops.map((stop) => {
          const waypointKey = getWaypointKey(stop);
          const isDone = Boolean(progressByWaypointKey[waypointKey]);
          const isNext = waypointKey === nextPendingKey;

          return (
            <li key={`${selectedRoute.id}-${waypointKey}`}>
              <div
                className={`rounded-md border px-3 py-2 ${
                  isDone
                    ? 'border-success bg-panel2'
                    : selectedBinId === stop.binId
                      ? 'border-accent bg-panel2'
                      : 'border-line bg-panel2'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    className="flex items-start gap-3 text-left"
                    onClick={() => onSelectBin(stop.binId)}
                    type="button"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        isDone
                          ? 'bg-success text-onAccent'
                          : isNext
                            ? 'bg-accentStrong text-onAccent'
                            : 'bg-accent text-onAccent'
                      }`}
                    >
                      {isDone ? '✓' : stop.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-main">
                        {stopLabel(stop.binId, binsById)}
                      </p>
                      <p className="text-xs text-soft">
                        Collected {stop.collectedKg}kg {isNext ? '- Next stop' : ''}
                      </p>
                    </div>
                  </button>

                  {isDone ? (
                    <span className="rounded-full border border-success px-2 py-1 text-[11px] font-semibold text-success">
                      Done
                    </span>
                  ) : (
                    <button
                      className="rounded-md border border-line bg-panel px-2 py-1 text-xs font-semibold text-main hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!isNext}
                      onClick={() =>
                        isNext
                          ? onMarkStopDone(selectedRoute.id, waypointKey)
                          : undefined
                      }
                      type="button"
                    >
                      Mark done
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        className="mt-4 w-full rounded-md bg-success px-4 py-2 text-sm font-semibold text-onAccent disabled:cursor-not-allowed disabled:opacity-50"
        disabled={completePending || selectedRoute.isCompleted || !allStopsDone}
        onClick={handleCompleteRoute}
        type="button"
      >
        {completePending
          ? 'Completing Route...'
            : selectedRoute.isCompleted
              ? 'Route Completed'
              : 'Complete Route'}
      </button>

      {!selectedRoute.isCompleted && !allStopsDone ? (
        <p className="mt-2 text-xs text-warning">
          Complete Route unlocks after all stops are marked done. Remaining stops:{' '}
          {remainingStopsCount}
        </p>
      ) : null}

      <ConfirmCompleteRouteModal
        isOpen={isConfirmOpen}
        isPending={completePending}
        onConfirm={confirmCompleteRoute}
        onClose={closeConfirmModal}
      />
    </div>
  );
}

type ConfirmCompleteRouteModalProps = {
  isOpen: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

function ConfirmCompleteRouteModal({
  isOpen,
  isPending,
  onConfirm,
  onClose,
}: ConfirmCompleteRouteModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  return (
    <div
      aria-modal="true"
      className="confirm-overlay fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={() => (isPending ? undefined : onClose())}
      role="dialog"
    >
      <div
        className="confirm-card w-full max-w-md rounded-xl border border-line bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-main">Complete this route?</h3>
        <p className="mt-2 text-sm text-muted">
          This action marks it as done.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-md border border-line bg-panel2 px-4 py-2 text-sm font-semibold text-main transition-all duration-200 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            No
          </button>
          <button
            className="rounded-md border border-success bg-success px-4 py-2 text-sm font-semibold text-onAccent transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            {isPending ? 'Completing...' : 'Yes'}
          </button>
        </div>
      </div>
    </div>
  );
}

type DriverRouteSummaryPanelProps = {
  route: RouteItem;
  binsById: Map<string, SmartBin>;
  progressByWaypointKey: Record<string, boolean>;
  completedStopsCount: number;
  remainingStopsCount: number;
};

function DriverRouteSummaryPanel({
  route,
  binsById,
  progressByWaypointKey,
  completedStopsCount,
  remainingStopsCount,
}: DriverRouteSummaryPanelProps) {
  const orderedStops = useMemo(() => getOrderedStops(route), [route]);
  const totalCollected = useMemo(
    () =>
      orderedStops.reduce(
        (accumulator, stop) => accumulator + stop.collectedKg,
        0,
      ),
    [orderedStops],
  );
  const fallbackDistanceKm = useMemo(
    () => computeRouteDistanceKm(orderedStops, binsById),
    [orderedStops, binsById],
  );
  const totalDistanceKm = route.totalDistanceKm ?? fallbackDistanceKm;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-main">Route Summary</h2>
        <div className="mt-3 space-y-2 rounded-md border border-line bg-panel2 p-3 text-sm">
          <p className="text-muted">
            Total distance:{' '}
            <span className="font-semibold text-main">
              {totalDistanceKm != null ? `${totalDistanceKm.toFixed(2)} km` : 'N/A'}
            </span>
          </p>
          <p className="text-muted">
            Bin count:{' '}
            <span className="font-semibold text-main">{orderedStops.length}</span>
          </p>
          <p className="text-muted">
            Completed stops:{' '}
            <span className="font-semibold text-main">{completedStopsCount}</span>
          </p>
          <p className="text-muted">
            Remaining stops:{' '}
            <span className="font-semibold text-main">{remainingStopsCount}</span>
          </p>
          <p className="text-muted">
            Collected:{' '}
            <span className="font-semibold text-main">{totalCollected} kg</span>
          </p>
          <p className="text-muted">
            Status:{' '}
            <span className="font-semibold text-main">
              {route.isCompleted ? 'Completed' : 'Active'}
            </span>
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-soft">
          Bin List
        </h3>
        <ul className="mt-2 max-h-[350px] space-y-2 overflow-auto pr-1">
          {orderedStops.map((stop) => {
            const bin = binsById.get(stop.binId);
            const isDone = progressByWaypointKey[getWaypointKey(stop)] ?? false;
            return (
              <li
                className="rounded-md border border-line bg-panel2 px-3 py-2"
                key={`${route.id}-${getWaypointKey(stop)}-summary`}
              >
                <p className="text-sm font-semibold text-main">
                  {stop.step}. {bin?.address ?? `Bin ${stop.binId.slice(0, 8)}`}{' '}
                  {isDone ? '• Done' : ''}
                </p>
                <p className="text-xs text-soft">
                  Fill: {bin?.currentFillLevel ?? 'Unknown'}% - Status:{' '}
                  {bin?.status ?? 'Unknown'}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type DriverPseudoMapProps = {
  bins: SmartBin[];
  selectedRoute: RouteItem | null;
  progressByWaypointKey: Record<string, boolean>;
  nextPendingKey: string | null;
  selectedBinId: string | null;
  onSelectBin: (binId: string) => void;
};

function DriverPseudoMap({
  bins,
  selectedRoute,
  progressByWaypointKey,
  nextPendingKey,
  selectedBinId,
  onSelectBin,
}: DriverPseudoMapProps) {
  const positions = useMemo(() => normalizeBins(bins), [bins]);

  const orderedStops = useMemo(
    () => (selectedRoute ? getOrderedStops(selectedRoute) : []),
    [selectedRoute],
  );

  const routePoints = useMemo(
    () =>
      orderedStops
        .map((stop) => {
          const point = positions.get(stop.binId);
          if (!point) return null;
          return {
            ...point,
            step: stop.step,
            binId: stop.binId,
            waypointKey: getWaypointKey(stop),
          };
        })
        .filter(
          (
            value,
          ): value is Point & {
            step: number;
            binId: string;
            waypointKey: string;
          } => Boolean(value),
        ),
    [orderedStops, positions],
  );

  const routeStopIds = useMemo(
    () => new Set(routePoints.map((point) => point.binId)),
    [routePoints],
  );

  const segments = useMemo(
    () =>
      routePoints.slice(1).map((point, index) => {
        const from = routePoints[index];
        const to = point;
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        return {
          from,
          to,
          length,
          index,
        };
      }),
    [routePoints],
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-main">Route Pseudo-Map</h2>
        <p className="text-xs text-soft">x=longitude, y=latitude</p>
      </div>

      <svg
        className="h-auto w-full rounded-md border border-line bg-mapBg"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      >
        <g key={selectedRoute?.id ?? 'no-route'}>
          {segments.map((segment) => (
            <line
              className="driver-route-segment"
              key={`${selectedRoute?.id ?? 'none'}-${segment.index}`}
              stroke={progressByWaypointKey[segment.to.waypointKey] ? '#a6e3a1' : '#89b4fa'}
              strokeDasharray={segment.length}
              strokeDashoffset={segment.length}
              strokeLinecap="round"
              strokeWidth={4}
              style={{
                animationDelay: `${segment.index * 160}ms`,
              }}
              x1={segment.from.x}
              x2={segment.to.x}
              y1={segment.from.y}
              y2={segment.to.y}
            />
          ))}
        </g>

        {bins.map((bin) => {
          const point = positions.get(bin.id);
          if (!point) return null;

          if (routeStopIds.has(bin.id)) return null;

          return (
            <g key={`bg-${bin.id}`} onClick={() => onSelectBin(bin.id)}>
              <circle
                cx={point.x}
                cy={point.y}
                fill={getBinColor(bin)}
                opacity={0.75}
                r={5}
                stroke="#cdd6f4"
                strokeWidth={selectedBinId === bin.id ? 2 : 1}
              />
            </g>
          );
        })}

        {routePoints.map((point) => {
          const isDone = progressByWaypointKey[point.waypointKey] ?? false;
          const isNextStop = point.waypointKey === nextPendingKey;
          const isSelected = selectedBinId === point.binId;
          const radius = isNextStop ? 18 : 15;

          return (
            <g
              key={`route-${point.waypointKey}`}
              onClick={() => onSelectBin(point.binId)}
            >
              {isNextStop ? (
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill="none"
                  opacity={0.8}
                  r={22}
                  stroke="#89b4fa"
                  strokeWidth={2}
                />
              ) : null}
              <circle
                cx={point.x}
                cy={point.y}
                fill={
                  isDone ? '#a6e3a1' : isNextStop ? '#89b4fa' : '#cba6f7'
                }
                r={radius}
                stroke="#11111b"
                strokeWidth={isSelected ? 3 : 2}
              />
              <text
                dominantBaseline="middle"
                fill="#11111b"
                fontSize="12"
                fontWeight="700"
                textAnchor="middle"
                x={point.x}
                y={point.y}
              >
                {isDone ? '✓' : point.step}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-success" /> Completed stop
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accentStrong" /> Next stop
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Route stop
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Critical bin
        </span>
      </div>
    </div>
  );
}

const MAP_WIDTH = 980;
const MAP_HEIGHT = 560;
const MAP_PADDING = 34;

type Point = { x: number; y: number };

function normalizeBins(bins: SmartBin[]) {
  const latitudes = bins.map((bin) => bin.latitude);
  const longitudes = bins.map((bin) => bin.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const latRange = Math.max(maxLat - minLat, 0.000001);
  const lngRange = Math.max(maxLng - minLng, 0.000001);

  const map = new Map<string, Point>();
  for (const bin of bins) {
    const x =
      MAP_PADDING +
      ((bin.longitude - minLng) / lngRange) * (MAP_WIDTH - 2 * MAP_PADDING);
    const y =
      MAP_PADDING +
      (1 - (bin.latitude - minLat) / latRange) * (MAP_HEIGHT - 2 * MAP_PADDING);
    map.set(bin.id, { x, y });
  }

  return map;
}

function getBinColor(bin: SmartBin) {
  if (bin.status === 'DAMAGED' || bin.status === 'OUT_OF_SERVICE') return '#f38ba8';
  if (bin.needsCollection) return '#f9e2af';
  return '#a6e3a1';
}

function getOrderedStops(route: RouteItem) {
  return [...route.waypointsOrder].sort((left, right) => left.step - right.step);
}

function getWaypointKey(stop: { step: number; binId: string }) {
  return `${stop.step}:${stop.binId}`;
}

function stopLabel(binId: string, binsById: Map<string, SmartBin>) {
  const bin = binsById.get(binId);
  if (bin?.address) return bin.address;
  return `Bin ${binId.slice(0, 8)}`;
}

function computeRouteDistanceKm(
  orderedStops: Array<{ binId: string; step: number }>,
  binsById: Map<string, SmartBin>,
) {
  if (orderedStops.length < 2) {
    return 0;
  }

  let totalKm = 0;

  for (let index = 1; index < orderedStops.length; index += 1) {
    const from = binsById.get(orderedStops[index - 1].binId);
    const to = binsById.get(orderedStops[index].binId);

    if (!from || !to) {
      return null;
    }

    totalKm += haversineKm(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude,
    );
  }

  return totalKm;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}
