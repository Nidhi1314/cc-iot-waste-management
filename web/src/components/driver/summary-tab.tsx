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
    <div className="rounded-lg border border-terminalBorder bg-terminalPanel p-4 font-mono">
      <p className="text-[10px] uppercase tracking-widest text-terminalMuted">{label}</p>
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
    <div className="t-scroll h-full overflow-auto bg-terminal p-5 font-mono">
      {/* Status line */}
      <div className="mb-5 text-xs text-terminalMuted">
        <span className="text-terminalAccent">{'> '}</span>
        ROUTE_STATUS:{' '}
        <span className={route.isCompleted ? 'text-terminalAccent' : 'text-terminalWarn'}>
          [{route.isCompleted ? 'COMPLETED' : 'ACTIVE'}]
        </span>
        {' '}|{' '}
        PROGRESS: <span className="text-terminalText">{Math.round(progressPct)}%</span>
        {' '}|{' '}
        STOPS: <span className="text-terminalText">{completedCount}/{orderedStops.length}</span>
        <span className="cursor-blink text-terminalAccent"> _</span>
      </div>

      {/* KPI blocks — same grid as admin overview */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBlock label="TOTAL_STOPS"   value={orderedStops.length}          sub="waypoints" />
        <StatBlock label="COMPLETED"     value={completedCount}               sub={`of ${orderedStops.length}`} />
        <StatBlock label="REMAINING"     value={remaining}                    sub="stops left" accent={remaining > 0} />
        <StatBlock label="DISTANCE"      value={`${distanceKm.toFixed(1)}km`} sub="total route" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatBlock label="COLLECTED_KG"  value={`${totalCollected}kg`} sub="total waste" />
        <StatBlock label="PROGRESS_PCT"  value={`${Math.round(progressPct)}%`} sub="completion" />
      </div>

      {/* All stops — collapsible, same as admin pattern */}
      <div className="mt-5 rounded-lg border border-terminalBorder bg-terminalPanel">
        <button
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setStopsOpen((v) => !v)}
          type="button"
        >
          <span className="text-[10px] uppercase tracking-widest text-terminalMuted">
            WAYPOINTS_LIST <span className="ml-1 text-terminalText">({orderedStops.length})</span>
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
                    {bin?.address ?? `BIN_${stop.binId.slice(0, 8).toUpperCase()}`}
                  </span>
                  <span className="shrink-0 text-terminalMuted">{stop.collectedKg}kg</span>
                  <span className={`ml-3 shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${
                    isDone ? 'border-terminalAccent text-terminalAccent' : 'border-terminalBorder text-terminalMuted'
                  }`}>
                    {isDone ? '[DONE]' : '[PEND]'}
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
