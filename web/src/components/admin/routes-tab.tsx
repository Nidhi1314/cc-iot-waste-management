import { useState } from 'react';
import type { RouteItem, VehiclePublic, SmartBin } from '../../types/api';
import { formatDateTime } from '../../lib/utils';
import { MlTerminalModal } from './ml-terminal-modal';

type Props = {
  routes: RouteItem[];
  bins: SmartBin[];
  operatorAccounts: VehiclePublic[];
  assignedVehicleId: string;
  onChangeAssignedVehicle: (id: string) => void;
  onGenerate: () => void;
  onGeneratePredictive: () => void;
  onCompleteRoute: (id: string) => void;
  onDeleteRoute: (id: string) => void;
  isPending: boolean;
  isPredictivePending: boolean;
  completePending: boolean;
  deletePending: boolean;
  actionLog: string[];
};

export function RoutesTab({
  routes,
  bins,
  operatorAccounts,
  assignedVehicleId,
  onChangeAssignedVehicle,
  onGenerate,
  onGeneratePredictive,
  onCompleteRoute,
  onDeleteRoute,
  isPending,
  isPredictivePending,
  completePending,
  deletePending,
  actionLog,
}: Props) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [mlModalOpen, setMlModalOpen] = useState(false);
  const [mlLogStartIndex, setMlLogStartIndex] = useState(0);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;
  const binsById = new Map(bins.map((b) => [b.id, b]));
  const driverOptions = operatorAccounts.filter((o) => o.role === 'DRIVER');
  const isAnyPending = isPending || isPredictivePending || completePending || deletePending;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col gap-4 overflow-auto p-5">
      {/* Generate card */}
      <div className="rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
        <div className="t-panel-header">Generate a route</div>
        <div className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-terminalMuted">Assign vehicle</label>
              <div className="relative">
                <select
                  className="appearance-none rounded-xl border border-terminalBorder bg-white px-3 py-2 pr-8 text-sm text-terminalText focus:border-terminalAccent focus:outline-none disabled:opacity-50"
                  value={assignedVehicleId}
                  onChange={(e) => onChangeAssignedVehicle(e.target.value)}
                  disabled={isAnyPending}
                >
                  <option value="">-- select driver --</option>
                  {driverOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.userCode} ({d.maxCapacityKg}kg)</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-terminalMuted">▾</span>
              </div>
            </div>

            <button
              className="rounded-full border border-terminalAccent bg-terminalAccent px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isAnyPending || !assignedVehicleId}
              onClick={onGenerate}
              type="button"
            >
              {isPending ? 'Generating...' : 'Generate route'}
            </button>

            <button
              className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isAnyPending || !assignedVehicleId}
              onClick={() => {
                setMlLogStartIndex(actionLog.length);
                setMlModalOpen(true);
                onGeneratePredictive();
              }}
              type="button"
            >
              {isPredictivePending ? 'Generating...' : 'Predict 24-hour route'}
            </button>
          </div>

          {actionLog.length > 0 && (
            <div className="t-scroll mt-3 max-h-20 overflow-auto rounded border border-terminalBorder bg-terminal p-2 text-[11px] text-terminalMuted">
              {actionLog.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          )}
        </div>
      </div>

      {/* Route list + detail */}
      <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
          <div className="t-panel-header flex items-center justify-between">
            <span>Routes</span>
            <span className="text-terminalMuted">{routes.length} records</span>
          </div>
          <div className="t-scroll max-h-[calc(100vh-360px)] overflow-auto">
            {routes.length === 0 ? (
              <div className="p-4 text-sm text-terminalMuted">No routes yet. Generate one above.</div>
            ) : (
              routes.map((route) => (
                <button
                  key={route.id}
                  className={`w-full border-b border-terminalBorder/50 p-3 text-left text-xs transition-colors hover:bg-terminalPanel2 ${
                    selectedRouteId === route.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedRouteId(route.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-terminalText">RTE_{route.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      route.isCompleted
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-terminalAccent text-white'
                    }`}>
                      {route.isCompleted ? 'Done' : 'Active'}
                    </span>
                  </div>
                  <p className="mt-1 text-terminalMuted">stops: {route.waypointsOrder.length} | {formatDateTime(route.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
          <div className="t-panel-header">Route details</div>
          {!selectedRoute ? (
            <div className="p-4 text-sm text-terminalMuted">Select a route to see its details.</div>
          ) : (
            <div className="t-scroll max-h-[calc(100vh-360px)] overflow-auto p-4 text-xs">
              <div className="space-y-1.5 text-terminalMuted">
                <p><span className="text-terminalAccent">ID: </span><span className="font-mono text-terminalText">{selectedRoute.id}</span></p>
                <p><span className="text-terminalAccent">Created: </span><span className="font-mono text-terminalText">{formatDateTime(selectedRoute.createdAt)}</span></p>
                <p><span className="text-terminalAccent">Status: </span>
                  <span className={selectedRoute.isCompleted ? 'text-terminalAccent' : 'text-terminalWarn'}>
                    [{selectedRoute.isCompleted ? 'COMPLETED' : 'ACTIVE'}]
                  </span>
                </p>
                <p><span className="text-terminalAccent">Distance: </span><span className="text-terminalText">{selectedRoute.totalDistanceKm != null ? `${selectedRoute.totalDistanceKm.toFixed(2)} km` : 'N/A'}</span></p>
                <p><span className="text-terminalAccent">Stops: </span><span className="text-terminalText">{selectedRoute.waypointsOrder.length}</span></p>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-terminalMuted">Stop order</p>
                <div className="mt-2 space-y-1 rounded border border-terminalBorder bg-terminal p-2">
                  {[...selectedRoute.waypointsOrder].sort((a, b) => a.step - b.step).map((wp) => {
                    const bin = binsById.get(wp.binId);
                    return (
                      <div key={`${selectedRoute.id}-${wp.step}`} className="flex justify-between text-[11px]">
                        <span className="text-terminalAccent">{String(wp.step).padStart(2, '0')}.</span>
                        <span className="flex-1 px-2 truncate text-terminalText">{bin?.address ?? wp.binId.slice(0, 12)}</span>
                        <span className="text-terminalMuted shrink-0">{wp.collectedKg}kg</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!selectedRoute.isCompleted && (
                  <button
                    className="rounded-full border border-terminalAccent bg-terminalAccent px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                    disabled={completePending || deletePending}
                    onClick={() => onCompleteRoute(selectedRoute.id)}
                    type="button"
                  >
                    {completePending ? 'Completing...' : 'Mark complete'}
                  </button>
                )}

                {confirmDeleteId === selectedRoute.id ? (
                  <div className="flex items-center gap-2 rounded border border-terminalDanger bg-terminalDanger/10 px-3 py-1.5">
                    <span className="text-xs font-medium text-terminalDanger">Delete this route?</span>
                    <button
                      className="rounded-lg border border-terminalDanger px-2 py-0.5 text-xs font-bold text-terminalDanger hover:bg-terminalDanger/20 disabled:opacity-40"
                      disabled={deletePending}
                      onClick={() => { onDeleteRoute(selectedRoute.id); setConfirmDeleteId(null); setSelectedRouteId(null); }}
                      type="button"
                    >
                      Yes
                    </button>
                    <button
                      className="rounded-lg border border-terminalBorder px-2 py-0.5 text-xs text-terminalMuted hover:text-terminalText"
                      onClick={() => setConfirmDeleteId(null)}
                      type="button"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    className="rounded-lg border border-terminalDanger bg-terminalDanger/5 px-3 py-1.5 text-xs font-bold text-terminalDanger hover:bg-terminalDanger/20 disabled:opacity-40"
                    disabled={completePending || deletePending}
                    onClick={() => setConfirmDeleteId(selectedRoute.id)}
                    type="button"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <MlTerminalModal
        isOpen={mlModalOpen}
        isPending={isPredictivePending}
        actionLog={actionLog}
        logStartIndex={mlLogStartIndex}
        onClose={() => setMlModalOpen(false)}
      />
    </div>
  );
}
