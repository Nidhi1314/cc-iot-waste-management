import { useState } from 'react';
import {
  Sparkles,
  Truck,
  CheckCircle2,
  Trash2,
  Navigation,
  Leaf,
} from 'lucide-react';
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
  onGenerateOrganic: () => void;
  onCompleteRoute: (id: string) => void;
  onDeleteRoute: (id: string) => void;
  isPending: boolean;
  isPredictivePending: boolean;
  isOrganicPending: boolean;
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
  onGenerateOrganic,
  onCompleteRoute,
  onDeleteRoute,
  isPending,
  isPredictivePending,
  isOrganicPending,
  completePending,
  deletePending,
  actionLog,
}: Props) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [mlModalOpen, setMlModalOpen] = useState(false);
  const [mlLogStartIndex, setMlLogStartIndex] = useState(0);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0] ?? null;
  const binsById = new Map(bins.map((b) => [b.id, b]));
  const isAnyPending = isPending || isPredictivePending || isOrganicPending || completePending || deletePending;

  return (
    <div className="flex h-full flex-col gap-5 overflow-auto p-6 max-w-7xl mx-auto bg-[#F8FAF6] text-[#0F172A]">
      {/* Route Generator Console Card */}
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-[#E2E8F0] pb-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F0FDF4] border border-[#DCFCE7] text-[#1B4332]">
            <Navigation className="h-4 w-4 text-[#2D6A4F]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
              CVRP Heuristic Dispatcher
            </h2>
            <p className="text-xs text-[#475569]">
              Operations Research capacity-constrained routing engine
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-[#2D6A4F]" />
              <span>Assigned Fleet Vehicle</span>
            </label>
            <select
              className="rounded-md border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] focus:border-[#2D6A4F] focus:outline-none disabled:opacity-50"
              value={assignedVehicleId}
              onChange={(e) => onChangeAssignedVehicle(e.target.value)}
              disabled={isAnyPending}
            >
              <option value="">-- Choose Operator Vehicle --</option>
              {operatorAccounts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.userCode} ({d.maxCapacityKg} kg payload) [{d.role}]
                </option>
              ))}
            </select>
          </div>

          <button
            className="flex items-center gap-2 rounded-md border border-[#2D6A4F] bg-[#F0FDF4] px-4 py-2 text-xs font-semibold text-[#1B4332] hover:bg-[#DCFCE7] disabled:cursor-not-allowed disabled:opacity-40 transition shadow-sm"
            disabled={isAnyPending || !assignedVehicleId}
            onClick={onGenerateOrganic}
            type="button"
            title="Optimize route matching generators to licensed organic processing facilities"
          >
            <Leaf className="h-3.5 w-3.5 text-[#2D6A4F]" />
            <span>{isOrganicPending ? 'Optimizing Organic...' : 'Optimize Organic Route'}</span>
          </button>

          <button
            className="flex items-center gap-2 rounded-md bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white hover:bg-[#143527] disabled:cursor-not-allowed disabled:opacity-40 transition shadow-sm"
            disabled={isAnyPending || !assignedVehicleId}
            onClick={onGenerate}
            type="button"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>{isPending ? 'Calculating CVRP...' : 'Solve Heuristic Route'}</span>
          </button>

          <button
            className="flex items-center gap-2 rounded-md border border-[#2D6A4F] bg-[#F0FDF4] px-4 py-2 text-xs font-semibold text-[#1B4332] hover:bg-[#DCFCE7] disabled:cursor-not-allowed disabled:opacity-40 transition"
            disabled={isAnyPending || !assignedVehicleId}
            onClick={() => {
              setMlLogStartIndex(actionLog.length);
              setMlModalOpen(true);
              onGeneratePredictive();
            }}
            type="button"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#2D6A4F]" />
            <span>{isPredictivePending ? 'Predicting ML Trend...' : 'Predictive 24h Route (ML)'}</span>
          </button>
        </div>

        {actionLog.length > 0 && (
          <div className="mt-4 max-h-24 overflow-y-auto rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 font-mono text-[11px] text-[#475569] space-y-1">
            {actionLog.slice(-6).map((line, i) => (
              <div key={i} className={line.includes('[ERR]') ? 'text-[#DC2626] font-semibold' : 'text-[#0F172A]'}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Route List + Selected Details Split View */}
      <div className="grid flex-1 gap-5 lg:grid-cols-[1fr_1.3fr] min-h-[380px]">
        {/* Dispatched Routes List */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-3">
            <span className="font-bold text-xs uppercase tracking-wider text-[#0F172A]">Dispatched Routes</span>
            <span className="text-xs text-[#64748B]">{routes.length} total</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[420px]">
            {routes.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                No routes dispatched. Run solver above.
              </div>
            ) : (
              routes.map((route) => (
                <button
                  key={route.id}
                  className={`w-full rounded-md border p-3 text-left text-xs transition ${
                    selectedRoute?.id === route.id
                      ? 'border-[#2D6A4F] bg-[#F0FDF4]'
                      : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white'
                  }`}
                  onClick={() => setSelectedRouteId(route.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#1B4332]">
                      RTE_{route.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        route.isCompleted
                          ? 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]'
                          : 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
                      }`}
                    >
                      {route.isCompleted ? 'COMPLETED' : 'IN TRANSIT'}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#475569]">
                    <span>{route.waypointsOrder.length} stops</span>
                    <span>{formatDateTime(route.createdAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Selected Route Inspection Panel */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-3">
            <span className="font-bold text-xs uppercase tracking-wider text-[#0F172A]">Waypoint Manifest</span>
            {selectedRoute && (
              <span className="text-xs font-semibold text-[#1B4332]">
                {selectedRoute.waypointsOrder.length} stops scheduled
              </span>
            )}
          </div>

          {!selectedRoute ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[#64748B]">
              Select a route from the list to inspect stops.
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-[#F8FAFC] p-2.5 border border-[#E2E8F0]">
                    <span className="text-[10px] font-semibold text-[#64748B] uppercase">Route UUID</span>
                    <p className="font-mono font-bold text-[#0F172A] truncate">{selectedRoute.id}</p>
                  </div>
                  <div className="rounded-md bg-[#F8FAFC] p-2.5 border border-[#E2E8F0]">
                    <span className="text-[10px] font-semibold text-[#64748B] uppercase">Distance Estimate</span>
                    <p className="font-bold text-[#1B4332]">
                      {selectedRoute.totalDistanceKm != null ? `${selectedRoute.totalDistanceKm.toFixed(2)} km` : 'Pending OSRM'}
                    </p>
                  </div>
                </div>

                {/* Stop Order Sequence */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">Sequential Waypoint Sequence</p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs">
                    {[...selectedRoute.waypointsOrder]
                      .sort((a, b) => a.step - b.step)
                      .map((wp) => {
                        const bin = binsById.get(wp.binId);
                        return (
                          <div
                            key={`${selectedRoute.id}-${wp.step}`}
                            className="flex items-center justify-between rounded bg-white border border-[#E2E8F0] px-3 py-1.5"
                          >
                            <span className="text-[#1B4332] font-bold w-6">#{wp.step}</span>
                            <span className="flex-1 px-2 truncate text-[#0F172A] font-medium">
                              {bin?.address ?? wp.binId.slice(0, 12)}
                            </span>
                            <span className="text-[#2D6A4F] font-bold shrink-0">
                              {wp.collectedKg} kg
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-[#E2E8F0]">
                {!selectedRoute.isCompleted && (
                  <button
                    className="flex items-center gap-1.5 rounded-md bg-[#F0FDF4] border border-[#DCFCE7] px-3.5 py-1.5 text-xs font-semibold text-[#166534] hover:bg-[#DCFCE7] transition disabled:opacity-40"
                    disabled={completePending || deletePending}
                    onClick={() => onCompleteRoute(selectedRoute.id)}
                    type="button"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#2D6A4F]" />
                    <span>{completePending ? 'Completing...' : 'Mark Route Complete'}</span>
                  </button>
                )}

                {confirmDeleteId === selectedRoute.id ? (
                  <div className="flex items-center gap-2 rounded-md border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-1 text-xs">
                    <span className="font-semibold text-[#DC2626]">Confirm deletion?</span>
                    <button
                      className="rounded bg-[#DC2626] px-2 py-0.5 text-xs font-bold text-white hover:bg-[#B91C1C] transition"
                      disabled={deletePending}
                      onClick={() => {
                        onDeleteRoute(selectedRoute.id);
                        setConfirmDeleteId(null);
                        setSelectedRouteId(null);
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                    <button
                      className="rounded border border-[#CBD5E1] bg-white px-2 py-0.5 text-xs text-[#475569] hover:text-[#0F172A]"
                      onClick={() => setConfirmDeleteId(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-1.5 rounded-md border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2] transition disabled:opacity-40"
                    disabled={completePending || deletePending}
                    onClick={() => setConfirmDeleteId(selectedRoute.id)}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
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
