import { useEffect, useMemo, useState } from 'react';
import type { RouteItem, RouteWaypoint, SmartBin } from '../../types/api';

type Props = {
  route: RouteItem;
  bins: SmartBin[];
  progress: Record<string, boolean>;
  nextStop: RouteWaypoint | null;
  completedCount: number;
  allDone: boolean;
  onMarkDone: (step: number, binId: string) => void;
  onCompleteRoute: (id: string) => void;
  completePending: boolean;
};

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

export function RouteTab({ route, bins, progress, nextStop, completedCount, allDone, onMarkDone, onCompleteRoute, completePending }: Props) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const binsById = useMemo(() => new Map(bins.map((b) => [b.id, b])), [bins]);
  const orderedStops = useMemo(() => [...route.waypointsOrder].sort((a, b) => a.step - b.step), [route]);
  const nextBin = nextStop ? binsById.get(nextStop.binId) : null;
  const remainingCount = orderedStops.length - completedCount;

  useEffect(() => {
    if (!isConfirmOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsConfirmOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isConfirmOpen]);

  return (
    <div className="t-scroll flex h-full flex-col overflow-auto bg-terminal p-5">
      {/* Next stop panel */}
      <div className="rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
        <div className="t-panel-header">Next stop</div>
        <div className="p-5">
          {nextStop && nextBin ? (
            <>
              <p className="text-base font-bold text-terminalText">{nextBin.address}</p>
              <div className="mt-2 space-y-1 text-xs text-terminalMuted">
                <p>
                  <span className="text-terminalAccent">Fill level: </span>
                  <AsciiBar pct={nextBin.currentFillLevel} />
                </p>
                <p>
                  <span className="text-terminalAccent">Collect: </span>
                  <span className="text-terminalText">{nextStop.collectedKg} kg</span>
                </p>
                <p>
                  <span className="text-terminalAccent">Status: </span>
                  <span className="text-terminalText">[{nextBin.status}]</span>
                </p>
              </div>
              <button
                className="mt-4 w-full rounded-full border border-terminalAccent bg-terminalAccent py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:opacity-80"
                onClick={() => onMarkDone(nextStop.step, nextStop.binId)}
                type="button"
              >
                Mark stop complete
              </button>
            </>
          ) : allDone ? (
            <p className="text-sm font-medium text-emerald-700">All stops completed.</p>
          ) : (
            <p className="text-sm text-terminalMuted">No stop is currently available.</p>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-terminalBorder bg-terminalPanel px-4 py-3 text-sm shadow-sm">
        <span className="font-medium text-terminalMuted">Progress</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-terminalPanel2">
          <div
            className="h-full rounded-full bg-terminalAccent transition-all duration-500"
            style={{ width: `${orderedStops.length > 0 ? (completedCount / orderedStops.length) * 100 : 0}%` }}
          />
        </div>
        <span className="shrink-0 text-terminalText">{completedCount}/{orderedStops.length}</span>
      </div>

      {/* Stop list */}
      <div className="mt-4 rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
        <div className="t-panel-header flex items-center justify-between">
          <span>Stops</span>
          <span className="text-terminalMuted">{remainingCount} remaining</span>
        </div>
        <div className="t-scroll max-h-64 overflow-auto">
          {orderedStops.map((stop) => {
            const bin = binsById.get(stop.binId);
            const key = `${stop.step}:${stop.binId}`;
            const isDone = Boolean(progress[key]);
            const isNext = nextStop ? `${nextStop.step}:${nextStop.binId}` === key : false;

            return (
              <div
                key={key}
                className={`flex items-center border-b border-terminalBorder/50 px-4 py-2.5 text-xs transition-colors last:border-0 ${
                  isDone ? 'opacity-40' : isNext ? 'bg-terminalAccent/5' : ''
                }`}
              >
                <span className={`w-6 shrink-0 font-bold ${isDone ? 'text-terminalAccent' : isNext ? 'text-terminalAccent' : 'text-terminalMuted'}`}>
                  {isDone ? 'OK' : String(stop.step).padStart(2, '0')}
                </span>
                <span className={`flex-1 truncate px-3 ${isDone ? 'text-terminalMuted line-through' : 'text-terminalText'}`}>
                  {bin?.address ?? `Bin ${stop.binId.slice(0, 8).toUpperCase()}`}
                </span>
                <span className="shrink-0 text-terminalMuted">{stop.collectedKg}kg</span>
                <span className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  isDone
                    ? 'bg-emerald-100 text-emerald-800'
                    : isNext
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {isDone ? 'Done' : isNext ? 'Next' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete route */}
      <div className="mt-4">
        {!allDone && (
          <p className="mb-2 text-center text-xs text-terminalMuted">
            {remainingCount} stop{remainingCount !== 1 ? 's' : ''} remaining before the route can be completed
          </p>
        )}
        <button
          className="w-full rounded-full border border-terminalAccent bg-terminalAccent py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!allDone || completePending || route.isCompleted}
          onClick={() => setIsConfirmOpen(true)}
          type="button"
        >
          {completePending ? 'Completing...' : route.isCompleted ? 'Route completed' : 'Complete route'}
        </button>
      </div>

      {/* Confirm modal */}
      {isConfirmOpen && (
        <div
          className="confirm-overlay fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setIsConfirmOpen(false)}
        >
          <div
            className="confirm-card w-full max-w-sm rounded-3xl border border-terminalBorder bg-terminalPanel p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold text-terminalText">Complete this route?</p>
            <p className="mt-2 text-sm text-terminalMuted">This will mark the route as completed in the system.</p>
            <div className="mt-5 flex gap-3">
              <button
                className="flex-1 rounded-full border border-terminalBorder py-2 text-sm text-terminalMuted hover:text-terminalText"
                onClick={() => setIsConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-full border border-terminalAccent bg-terminalAccent py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={completePending}
                onClick={() => { onCompleteRoute(route.id); setIsConfirmOpen(false); }}
                type="button"
              >
                {completePending ? 'Completing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
