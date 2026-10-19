import { useState } from 'react';
import type { RouteItem, RouteWaypoint, SmartBin } from '../../types/api';
import { WasteMap } from '../map/waste-map';
import { formatDateTime } from '../../lib/utils';

function AsciiBar({ pct }: { pct: number }) {
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  const color = pct >= 75 ? 'text-terminalWarn' : 'text-terminalAccent';
  return (
    <span className={`text-xs ${color}`}>
      [{'█'.repeat(filled)}{'░'.repeat(empty)}] {pct}%
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
    <div className="relative h-full font-mono">
      <WasteMap
        bins={bins}
        route={route ?? undefined}
        nextStopBinId={nextStopBinId}
        completedBinIds={completedBinIds}
        justCompletedBinId={justCompletedBinId}
        theme="dark"
        className="h-full w-full"
      />

      {/* Legend — top left */}
      <div className="absolute left-3 top-3 z-[999] rounded border border-terminalBorder bg-terminal p-2 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-terminalAccent"><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> NORMAL</div>
        <div className="flex items-center gap-1.5 text-terminalWarn"><span className="inline-block h-2 w-2 rounded-full bg-yellow-400" /> CRITICAL</div>
        <div className="flex items-center gap-1.5 text-terminalDanger"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> DAMAGED</div>
      </div>

      {/* Top-right action card — terminal style */}
      {allDone ? (
        route && !route.isCompleted ? (
          <div className="absolute right-3 top-3 z-[999] w-48 rounded border border-terminalAccent/40 bg-terminal p-2.5 font-mono">
            <p className="text-[10px] font-bold text-terminalAccent">{'// all stops done'}</p>
            {confirmComplete ? (
              <div className="mt-2 flex gap-1.5">
                <button
                  className="flex-1 rounded border border-terminalBorder py-1 text-[10px] text-terminalMuted hover:text-terminalText"
                  onClick={() => setConfirmComplete(false)}
                  type="button"
                >
                  [N]
                </button>
                <button
                  className="flex-1 rounded border border-terminalAccent bg-terminalAccent/10 py-1 text-[10px] font-bold text-terminalAccent hover:bg-terminalAccent/20 disabled:opacity-50"
                  disabled={completePending}
                  onClick={() => { onCompleteRoute(route.id); setConfirmComplete(false); }}
                  type="button"
                >
                  {completePending ? '...' : '[Y]'}
                </button>
              </div>
            ) : (
              <button
                className="mt-2 w-full rounded border border-terminalAccent bg-terminalAccent/10 py-1.5 text-[10px] font-bold text-terminalAccent hover:bg-terminalAccent/20"
                onClick={() => setConfirmComplete(true)}
                type="button"
              >
                [COMPLETE_ROUTE]
              </button>
            )}
          </div>
        ) : route?.isCompleted ? (
          <div className="absolute right-3 top-3 z-[999] rounded border border-terminalAccent/40 bg-terminal px-3 py-2 font-mono text-[10px] font-bold text-terminalAccent">
            [ROUTE_COMPLETED]
          </div>
        ) : null
      ) : nextBin && nextStop ? (
        <div className="slide-up absolute right-3 top-3 z-[999] w-72 rounded border border-terminalBorder bg-terminal p-4 font-mono">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-terminalMuted">NEXT_STOP</p>
            <span className="text-[10px] text-terminalMuted">step_{String(nextStop.step).padStart(2, '0')}</span>
          </div>
          <div className="space-y-1.5 text-xs text-terminalMuted">
            <p>
              <span className="text-terminalAccent">ADDRESS: </span>
              <span className="text-terminalText">{nextBin.address}</span>
            </p>
            <p>
              <span className="text-terminalAccent">FILL_LVL: </span>
              <AsciiBar pct={nextBin.currentFillLevel} />
            </p>
            <p>
              <span className="text-terminalAccent">STATUS: </span>
              <span className={nextBin.status === 'ACTIVE' ? 'text-terminalAccent' : 'text-terminalDanger'}>
                [{nextBin.status}]
              </span>
            </p>
            <p>
              <span className="text-terminalAccent">NEEDS_COLL: </span>
              <span className={nextBin.needsCollection ? 'text-terminalWarn' : 'text-terminalAccent'}>
                [{nextBin.needsCollection ? 'YES' : 'NO'}]
              </span>
            </p>
            <p>
              <span className="text-terminalAccent">COLLECT: </span>
              <span className="text-terminalText">{nextStop.collectedKg} kg</span>
            </p>
            <p>
              <span className="text-terminalAccent">CAPACITY: </span>
              <span className="text-terminalText">{nextBin.maxCapacityKg}kg</span>
            </p>
            <p>
              <span className="text-terminalAccent">UPDATED: </span>
              <span className="text-terminalText">{formatDateTime(nextBin.lastUpdated)}</span>
            </p>
          </div>
          <button
            className="mt-4 w-full rounded border border-terminalAccent bg-terminalAccent/10 py-2 text-xs font-bold text-terminalAccent hover:bg-terminalAccent/20 active:opacity-80"
            onClick={() => onMarkDone(nextStop.step, nextStop.binId)}
            type="button"
          >
            [MARK_DONE]
          </button>
        </div>
      ) : null}
    </div>
  );
}
