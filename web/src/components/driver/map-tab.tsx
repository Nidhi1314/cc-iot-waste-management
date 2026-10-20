import { useState } from 'react';
import type { RouteItem, RouteWaypoint, SmartBin } from '../../types/api';
import { WasteMap } from '../map/waste-map';
import { formatDateTime } from '../../lib/utils';

function AsciiBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? 'bg-amber-500' : 'bg-terminalAccent';
  return (
    <span className="inline-flex min-w-28 items-center gap-2">
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </span>
      <span className="text-xs font-semibold text-terminalText">{pct}%</span>
    </span>
  );
}

type Props = {
  bins: SmartBin[];
  route: RouteItem | null;
  nextStopBinId: string | null;
  nextStop: RouteWaypoint | null;
  completedBinIds: Set<string>;
  justCompletedBinId: string | null;
  onMarkDone: (step: number, binId: string) => void;
  onCompleteRoute: (id: string) => void;
  completePending: boolean;
  allDone: boolean;
};

export function DriverMapTab({ bins, route, nextStopBinId, nextStop, completedBinIds, justCompletedBinId, onMarkDone, onCompleteRoute, completePending, allDone }: Props) {
  const nextBin = nextStopBinId ? bins.find((b) => b.id === nextStopBinId) : null;
  const [confirmComplete, setConfirmComplete] = useState(false);

  return (
    <div className="relative h-full">
      <WasteMap
        bins={bins}
        route={route ?? undefined}
        nextStopBinId={nextStopBinId}
        completedBinIds={completedBinIds}
        justCompletedBinId={justCompletedBinId}
        theme="light"
        className="h-full w-full"
      />

      {/* Legend — top left */}
      <div className="absolute left-3 top-3 z-[999] rounded-2xl border border-terminalBorder bg-white p-3 text-xs shadow-lg">
        <div className="flex items-center gap-1.5 text-terminalAccent"><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Normal</div>
        <div className="flex items-center gap-1.5 text-terminalWarn"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> Critical</div>
        <div className="flex items-center gap-1.5 text-terminalDanger"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Damaged</div>
      </div>

      {/* Top-right action card — terminal style */}
      {allDone ? (
        route && !route.isCompleted ? (
          <div className="absolute right-3 top-3 z-[999] w-52 rounded-2xl border border-terminalBorder bg-white p-3 shadow-lg">
            <p className="text-xs font-semibold text-terminalAccent">All stops are complete</p>
            {confirmComplete ? (
              <div className="mt-2 flex gap-1.5">
                <button
                  className="flex-1 rounded border border-terminalBorder py-1 text-[10px] text-terminalMuted hover:text-terminalText"
                  onClick={() => setConfirmComplete(false)}
                  type="button"
                >
                  No
                </button>
                <button
                  className="flex-1 rounded-full border border-terminalAccent bg-terminalAccent py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={completePending}
                  onClick={() => { onCompleteRoute(route.id); setConfirmComplete(false); }}
                  type="button"
                >
                  {completePending ? '...' : 'Yes'}
                </button>
              </div>
            ) : (
              <button
                className="mt-2 w-full rounded-full border border-terminalAccent bg-terminalAccent py-2 text-xs font-semibold text-white hover:bg-blue-700"
                onClick={() => setConfirmComplete(true)}
                type="button"
              >
                Complete route
              </button>
            )}
          </div>
        ) : route?.isCompleted ? (
          <div className="absolute right-3 top-3 z-[999] rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm">
            Route completed
          </div>
        ) : null
      ) : nextBin && nextStop ? (
        <div className="slide-up absolute right-3 top-3 z-[999] w-72 rounded-2xl border border-terminalBorder bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-terminalMuted">Next stop</p>
            <span className="text-[10px] text-terminalMuted">step_{String(nextStop.step).padStart(2, '0')}</span>
          </div>
          <div className="space-y-1.5 text-xs text-terminalMuted">
            <p>
              <span className="text-terminalAccent">Address: </span>
              <span className="text-terminalText">{nextBin.address}</span>
            </p>
            <p>
              <span className="text-terminalAccent">Fill level: </span>
              <AsciiBar pct={nextBin.currentFillLevel} />
            </p>
            <p>
              <span className="text-terminalAccent">Status: </span>
              <span className={nextBin.status === 'ACTIVE' ? 'text-terminalAccent' : 'text-terminalDanger'}>
                {nextBin.status.replaceAll('_', ' ')}
              </span>
            </p>
            <p>
              <span className="text-terminalAccent">Needs collection: </span>
              <span className={nextBin.needsCollection ? 'text-terminalWarn' : 'text-terminalAccent'}>
                {nextBin.needsCollection ? 'Yes' : 'No'}
              </span>
            </p>
            <p>
              <span className="text-terminalAccent">Collect: </span>
              <span className="text-terminalText">{nextStop.collectedKg} kg</span>
            </p>
            <p>
              <span className="text-terminalAccent">Capacity: </span>
              <span className="text-terminalText">{nextBin.maxCapacityKg}kg</span>
            </p>
            <p>
              <span className="text-terminalAccent">Updated: </span>
              <span className="font-mono text-xs text-terminalText">{formatDateTime(nextBin.lastUpdated)}</span>
            </p>
          </div>
          <button
            className="mt-4 w-full rounded-full border border-terminalAccent bg-terminalAccent py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:opacity-80"
            onClick={() => onMarkDone(nextStop.step, nextStop.binId)}
            type="button"
          >
            Mark stop complete
          </button>
        </div>
      ) : null}
    </div>
  );
}
