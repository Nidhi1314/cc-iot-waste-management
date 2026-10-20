import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthUser, RouteItem, RouteWaypoint, SmartBin } from '../../types/api';
import { RouteTab } from './route-tab';
import { DriverMapTab } from './map-tab';
import { SummaryTab } from './summary-tab';
import { AccountTab } from './account-tab';
import { LoadingState, ErrorState, EmptyState } from '../shared/states';

type DriverTab = 'route' | 'map' | 'summary' | 'account';

type DriverShellProps = {
  user: AuthUser;
  bins: SmartBin[];
  binsLoading: boolean;
  binsError: string | null;
  routes: RouteItem[];
  routesLoading: boolean;
  routesError: string | null;
  completePending: boolean;
  onCompleteRoute: (id: string) => void;
  onBinCollected: (binId: string) => void;
  onLogout: () => void;
};

type AllProgress = Record<string, Record<string, boolean>>;

const NAV_ITEMS: { id: DriverTab; icon: string; label: string }[] = [
  { id: 'route',   icon: '↗', label: 'Route' },
  { id: 'map',     icon: '◈', label: 'Map' },
  { id: 'summary', icon: '≡', label: 'Summary' },
  { id: 'account', icon: '○', label: 'Account' },
];

function getKey(step: number, binId: string) {
  return `${step}:${binId}`;
}

function loadProgress(): AllProgress {
  try {
    const raw = localStorage.getItem('ww_driver_progress');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function DriverShell({
  user, bins, binsLoading, binsError,
  routes, routesLoading, routesError,
  completePending, onCompleteRoute, onBinCollected, onLogout,
}: DriverShellProps) {
  const [activeTab, setActiveTab] = useState<DriverTab>('route');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [allProgress, setAllProgress] = useState<AllProgress>(loadProgress);
  const [justCompletedBinId, setJustCompletedBinId] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem('ww_driver_progress', JSON.stringify(allProgress));
  }, [allProgress]);

  const activeRoute = useMemo(() => {
    if (selectedRouteId) return routes.find((r) => r.id === selectedRouteId) ?? routes[0] ?? null;
    return routes[0] ?? null;
  }, [routes, selectedRouteId]);

  const orderedStops = useMemo(
    () => (activeRoute ? [...activeRoute.waypointsOrder].sort((a, b) => a.step - b.step) : []),
    [activeRoute],
  );

  const routeProgress = useMemo(
    () => (activeRoute ? (allProgress[activeRoute.id] ?? {}) : {}),
    [activeRoute, allProgress],
  );

  const markDone = useCallback((step: number, binId: string) => {
    if (!activeRoute) return;
    const key = getKey(step, binId);
    setAllProgress((prev) => ({
      ...prev,
      [activeRoute.id]: { ...(prev[activeRoute.id] ?? {}), [key]: true },
    }));
    onBinCollected(binId);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setJustCompletedBinId(binId);
    flashTimerRef.current = setTimeout(() => setJustCompletedBinId(null), 750);
  }, [activeRoute, onBinCollected]);

  const completedCount = useMemo(
    () => orderedStops.filter((s) => routeProgress[getKey(s.step, s.binId)]).length,
    [orderedStops, routeProgress],
  );

  const nextStop: RouteWaypoint | null = useMemo(
    () => orderedStops.find((s) => !routeProgress[getKey(s.step, s.binId)]) ?? null,
    [orderedStops, routeProgress],
  );

  const allDone = orderedStops.length > 0 && completedCount === orderedStops.length;

  const completedBinIds = useMemo(() => {
    const set = new Set<string>();
    orderedStops.forEach((s) => {
      if (routeProgress[getKey(s.step, s.binId)]) set.add(s.binId);
    });
    return set;
  }, [orderedStops, routeProgress]);

  const isLoading = binsLoading || routesLoading;
  const hasError = binsError || routesError;

  return (
    <div className="flex h-screen overflow-hidden bg-terminal" style={{ background: 'var(--t-bg)', color: 'var(--t-text)' }}>
      {/* Sidebar — same structure as AdminShell */}
      <aside
        className="flex shrink-0 flex-col border-r border-terminalBorder bg-terminalPanel transition-all duration-200"
        style={{ width: sidebarExpanded ? '200px' : '52px' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-terminalBorder px-3 py-3.5">
          {sidebarExpanded && (
            <span className="text-sm font-extrabold tracking-tight text-terminalAccent">WW <span className="text-terminalText">WasteWise</span></span>
          )}
          <button
            className="ml-auto rounded p-1 text-terminalMuted hover:text-terminalAccent"
            onClick={() => setSidebarExpanded((v) => !v)}
            type="button"
            title="Toggle sidebar"
          >
            {sidebarExpanded ? '◂' : '▸'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-terminalAccent text-white shadow-sm'
                    : 'text-terminalMuted hover:bg-terminalPanel2 hover:text-terminalText'
                }`}
                onClick={() => setActiveTab(item.id)}
                type="button"
                title={item.label}
              >
                <span className="w-4 shrink-0 text-center text-sm">{item.icon}</span>
                {sidebarExpanded && (
                  <span className="truncate text-xs font-semibold">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-terminalBorder p-3">
          {sidebarExpanded && (
            <p className="mb-2 truncate text-[10px] text-terminalMuted">
              {user.userCode} [{user.role}]
            </p>
          )}
          <button
            className="flex w-full items-center gap-2 rounded-xl border border-terminalBorder px-3 py-2 text-xs font-medium text-terminalMuted hover:border-terminalDanger hover:bg-red-50 hover:text-terminalDanger"
            onClick={onLogout}
            type="button"
            title="Logout"
          >
            <span>⏻</span>
            {sidebarExpanded && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-terminalBorder bg-terminalPanel px-5 py-3 text-xs text-terminalMuted">
          <span>
            <span className="font-semibold text-terminalText">WasteWise</span>
            <span className="px-2 text-slate-300">/</span>
            <span className="capitalize">{activeTab}</span>
          </span>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {activeRoute ? (
              <>
                <span>Route <span className="font-mono text-terminalText">{activeRoute.id.slice(0, 8).toUpperCase()}</span></span>
                <span>Stops <span className="text-terminalText">{completedCount}/{orderedStops.length}</span></span>
                <span className={activeRoute.isCompleted ? 'rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800' : 'rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-800'}>
                  {activeRoute.isCompleted ? 'Done' : 'Active'}
                </span>
              </>
            ) : (
              <span className="text-terminalMuted">No active route</span>
            )}
            {routes.length > 1 && (
              <div className="relative">
                <select
                  className="appearance-none rounded-xl border border-terminalBorder bg-white px-3 py-1.5 pr-6 text-xs text-terminalText focus:border-terminalAccent focus:outline-none"
                  value={selectedRouteId ?? ''}
                  onChange={(e) => setSelectedRouteId(e.target.value || null)}
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>RTE_{r.id.slice(0, 8).toUpperCase()}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-terminalMuted">▾</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'account' ? (
            <AccountTab user={user} onLogout={onLogout} />
          ) : isLoading ? (
            <div className="p-6"><LoadingState title="LOADING_ROUTE_DATA" /></div>
          ) : hasError ? (
            <div className="p-6"><ErrorState title="LOAD_ERROR" description={hasError ?? undefined} /></div>
          ) : routes.length === 0 ? (
            <div className="p-6"><EmptyState title="NO_ACTIVE_ROUTES" description="No routes assigned to this driver." /></div>
          ) : (
            <>
              {activeTab === 'route' && activeRoute && (
                <RouteTab
                  route={activeRoute}
                  bins={bins}
                  progress={routeProgress}
                  nextStop={nextStop}
                  completedCount={completedCount}
                  allDone={allDone}
                  onMarkDone={markDone}
                  onCompleteRoute={onCompleteRoute}
                  completePending={completePending}
                />
              )}
              {activeTab === 'map' && (
                binsLoading ? (
                  <div className="p-6"><LoadingState title="LOADING_MAP" /></div>
                ) : (
                  <DriverMapTab
                    bins={bins}
                    route={activeRoute}
                    nextStopBinId={nextStop?.binId ?? null}
                    nextStop={nextStop}
                    completedBinIds={completedBinIds}
                    justCompletedBinId={justCompletedBinId}
                    onMarkDone={markDone}
                    onCompleteRoute={onCompleteRoute}
                    completePending={completePending}
                    allDone={allDone}
                  />
                )
              )}
              {activeTab === 'summary' && activeRoute && (
                <SummaryTab
                  route={activeRoute}
                  bins={bins}
                  completedCount={completedCount}
                  progress={routeProgress}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
