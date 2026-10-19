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
    <div className="flex h-[calc(100vh-56px)] flex-col gap-4 overflow-auto p-5 font-mono">
      {/* Generate card */}
      <div className="rounded-lg border border-terminalBorder bg-terminalPanel">
        <div className="t-panel-header">{'┌─'} ROUTE_GENERATOR {'─┐'}</div>
        <div className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-terminalMuted">ASSIGN_VEHICLE</label>
              <div className="relative">
                <select
                  className="appearance-none rounded-lg border border-terminalBorder bg-terminalPanel2 px-3 py-2 pr-8 text-xs text-terminalText focus:border-terminalAccent focus:outline-none disabled:opacity-50"
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
              className="rounded-lg border border-terminalAccent bg-terminalAccent/10 px-4 py-2 text-xs font-bold text-terminalAccent hover:bg-terminalAccent/20 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isAnyPending || !assignedVehicleId}
              onClick={onGenerate}
              type="button"
            >
              {isPending ? '> RUNNING_CVRP...' : '[GENERATE_REACTIVE]'}
            </button>

            <button
              className="rounded-lg border border-terminalAccent2 bg-terminalAccent2/10 px-4 py-2 text-xs font-bold text-terminalAccent2 hover:bg-terminalAccent2/20 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isAnyPending || !assignedVehicleId}
              onClick={() => {
                setMlLogStartIndex(actionLog.length);
                setMlModalOpen(true);
                onGeneratePredictive();
              }}
              type="button"
            >
              {isPredictivePending ? '> RUNNING_ML...' : '[GENERATE_ML_+24H]'}
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
        <div className="rounded-lg border border-terminalBorder bg-terminalPanel">
          <div className="t-panel-header flex items-center justify-between">
            <span>{'┌─'} ROUTES_LIST {'─┐'}</span>
            <span className="text-terminalMuted">{routes.length} records</span>
          </div>
          <div className="t-scroll max-h-[calc(100vh-360px)] overflow-auto">
            {routes.length === 0 ? (
              <div className="p-4 text-xs text-terminalMuted">{'// no routes — generate one above'}</div>
            ) : (
              routes.map((route) => (
                <button
                  key={route.id}
                  className={`w-full border-b border-terminalBorder/50 p-3 text-left text-xs transition-colors hover:bg-terminalPanel2 ${
                    selectedRouteId === route.id ? 'border-l-2 border-l-terminalAccent bg-terminalPanel2' : ''
                  }`}
                  onClick={() => setSelectedRouteId(route.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-terminalText">RTE_{route.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] ${
                      route.isCompleted
                        ? 'border-terminalAccent text-terminalAccent'
                        : 'border-terminalWarn text-terminalWarn'
                    }`}>
                      [{route.isCompleted ? 'DONE' : 'ACTIVE'}]
                    </span>
                  </div>
                  <p className="mt-1 text-terminalMuted">stops: {route.waypointsOrder.length} | {formatDateTime(route.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-terminalBorder bg-terminalPanel">
          <div className="t-panel-header">{'┌─'} ROUTE_DETAIL {'─┐'}</div>
          {!selectedRoute ? (
            <div className="p-4 text-xs text-terminalMuted">{'// select a route to inspect'}</div>
          ) : (
            <div className="t-scroll max-h-[calc(100vh-360px)] overflow-auto p-4 text-xs">
              <div className="space-y-1.5 text-terminalMuted">
                <p><span className="text-terminalAccent">ID: </span><span className="text-terminalText">{selectedRoute.id}</span></p>
                <p><span className="text-terminalAccent">CREATED: </span><span className="text-terminalText">{formatDateTime(selectedRoute.createdAt)}</span></p>
                <p><span className="text-terminalAccent">STATUS: </span>
                  <span className={selectedRoute.isCompleted ? 'text-terminalAccent' : 'text-terminalWarn'}>
                    [{selectedRoute.isCompleted ? 'COMPLETED' : 'ACTIVE'}]
                  </span>
                </p>
                <p><span className="text-terminalAccent">DISTANCE: </span><span className="text-terminalText">{selectedRoute.totalDistanceKm != null ? `${selectedRoute.totalDistanceKm.toFixed(2)}km` : 'N/A'}</span></p>
                <p><span className="text-terminalAccent">STOPS: </span><span className="text-terminalText">{selectedRoute.waypointsOrder.length}</span></p>
              </div>

              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-widest text-terminalMuted">WAYPOINTS_ORDER</p>
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
                    className="rounded-lg border border-terminalAccent bg-terminalAccent/10 px-3 py-1.5 text-xs font-bold text-terminalAccent hover:bg-terminalAccent/20 disabled:opacity-40"
                    disabled={completePending || deletePending}
                    onClick={() => onCompleteRoute(selectedRoute.id)}
                    type="button"
                  >
                    {completePending ? '> COMPLETING...' : '[MARK_COMPLETE]'}
                  </button>
                )}

                {confirmDeleteId === selectedRoute.id ? (
                  <div className="flex items-center gap-2 rounded border border-terminalDanger bg-terminalDanger/10 px-3 py-1.5">
                    <span className="text-xs text-terminalDanger">CONFIRM_DELETE?</span>
                    <button
                      className="rounded-lg border border-terminalDanger px-2 py-0.5 text-xs font-bold text-terminalDanger hover:bg-terminalDanger/20 disabled:opacity-40"
                      disabled={deletePending}
                      onClick={() => { onDeleteRoute(selectedRoute.id); setConfirmDeleteId(null); setSelectedRouteId(null); }}
                      type="button"
                    >
                      [Y]
                    </button>
                    <button
                      className="rounded-lg border border-terminalBorder px-2 py-0.5 text-xs text-terminalMuted hover:text-terminalText"
                      onClick={() => setConfirmDeleteId(null)}
                      type="button"
                    >
                      [N]
                    </button>
                  </div>
                ) : (
                  <button
                    className="rounded-lg border border-terminalDanger bg-terminalDanger/5 px-3 py-1.5 text-xs font-bold text-terminalDanger hover:bg-terminalDanger/20 disabled:opacity-40"
                    disabled={completePending || deletePending}
                    onClick={() => setConfirmDeleteId(selectedRoute.id)}
                    type="button"
                  >
                    [DELETE]
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
