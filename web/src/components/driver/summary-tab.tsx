import { useMemo, useState } from 'react';
import type { RouteItem, SmartBin } from '../../types/api';

type Props = {
  route: RouteItem;
  bins: SmartBin[];
  completedCount: number;
  progress: Record<string, boolean>;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function StatBlock({ label, value, sub, accent }: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-terminalBorder bg-terminalPanel p-5 shadow-sm">
      <p className="text-xs font-semibold text-terminalMuted">{label.replaceAll('_', ' ')}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ? 'text-terminalWarn' : 'text-terminalAccent'}`}>{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-terminalMuted">{sub}</p> : null}
    </div>
  );
}

export function SummaryTab({ route, bins, completedCount, progress }: Props) {
  const [stopsOpen, setStopsOpen] = useState(false);

  const binsById = useMemo(() => new Map(bins.map((b) => [b.id, b])), [bins]);
  const orderedStops = useMemo(
    () => [...route.waypointsOrder].sort((a, b) => a.step - b.step),
    [route],
  );

  const totalCollected = useMemo(
    () => orderedStops.reduce((sum, s) => sum + s.collectedKg, 0),
    [orderedStops],
  );

  const distanceKm = useMemo(() => {
    if (route.totalDistanceKm != null) return route.totalDistanceKm;
    if (orderedStops.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < orderedStops.length; i++) {
      const from = binsById.get(orderedStops[i - 1].binId);
      const to = binsById.get(orderedStops[i].binId);
      if (from && to) total += haversineKm(from.latitude, from.longitude, to.latitude, to.longitude);
    }
    return total;
  }, [route, orderedStops, binsById]);

  const remaining = orderedStops.length - completedCount;
  const progressPct = orderedStops.length > 0 ? (completedCount / orderedStops.length) * 100 : 0;

  return (
    <div className="t-scroll h-full overflow-auto bg-terminal p-5">
      {/* Status line */}
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-terminalMuted">
        <span className="font-semibold text-terminalText">Route status</span>
        <span className={route.isCompleted ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800' : 'rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800'}>
          {route.isCompleted ? 'Completed' : 'Active'}
        </span>
        <span className="h-4 border-l border-slate-200" />
        <span>Progress <strong className="text-terminalText">{Math.round(progressPct)}%</strong></span>
        <span className="h-4 border-l border-slate-200" />
        <span>Stops <strong className="text-terminalText">{completedCount}/{orderedStops.length}</strong></span>
      </div>

      {/* KPI blocks — same grid as admin overview */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBlock label="Total stops" value={orderedStops.length} sub="Waypoints" />
        <StatBlock label="Completed" value={completedCount} sub={`Of ${orderedStops.length}`} />
        <StatBlock label="Remaining" value={remaining} sub="Stops left" accent={remaining > 0} />
        <StatBlock label="Distance" value={`${distanceKm.toFixed(1)} km`} sub="Total route" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatBlock label="Collected kg" value={`${totalCollected} kg`} sub="Total waste" />
        <StatBlock label="Progress" value={`${Math.round(progressPct)}%`} sub="Completion" />
      </div>

      {/* All stops — collapsible, same as admin pattern */}
      <div className="mt-5 rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
        <button
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setStopsOpen((v) => !v)}
          type="button"
        >
          <span className="text-sm font-semibold text-terminalText">
            Stops <span className="ml-1 text-terminalMuted">({orderedStops.length})</span>
          </span>
          <span className="text-terminalMuted transition-transform duration-200" style={{ display: 'inline-block', transform: stopsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>

        {stopsOpen && (
          <div className="border-t border-terminalBorder">
            {orderedStops.map((stop) => {
              const bin = binsById.get(stop.binId);
              const isDone = Boolean(progress[`${stop.step}:${stop.binId}`]);
              return (
                <div
                  key={`${stop.step}:${stop.binId}`}
                  className={`flex items-center border-b border-terminalBorder/50 px-4 py-2.5 text-xs last:border-0 ${isDone ? 'opacity-40' : ''}`}
                >
                  <span className={`w-6 shrink-0 font-bold ${isDone ? 'text-terminalAccent' : 'text-terminalMuted'}`}>
                    {isDone ? '✓' : String(stop.step).padStart(2, '0')}
                  </span>
                  <span className={`flex-1 truncate px-3 ${isDone ? 'text-terminalMuted line-through' : 'text-terminalText'}`}>
                    {bin?.address ?? `Bin ${stop.binId.slice(0, 8).toUpperCase()}`}
                  </span>
                  <span className="shrink-0 text-terminalMuted">{stop.collectedKg}kg</span>
                  <span className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isDone ? 'Done' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
