import { useState } from 'react';
import type { RouteItem } from '../../../types/api';
import { formatDateTime } from '../../../lib/utils';

type Props = {
  routes: RouteItem[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  onCompleteRoute: (routeId: string) => void;
  onDeleteRoute?: (routeId: string) => void;
  canComplete: boolean;
  canDelete?: boolean;
  completePending: boolean;
  deletePending?: boolean;
};

export function RoutesPanel({
  routes,
  selectedRouteId,
  onSelectRoute,
  onCompleteRoute,
  onDeleteRoute,
  canComplete,
  canDelete,
  completePending,
  deletePending,
}: Props) {
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null);

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-lg border border-line bg-panel p-4">
        <h3 className="text-sm font-semibold text-main">Routes</h3>
        <ul className="mt-3 space-y-2">
          {routes.map((route) => (
            <li key={route.id}>
              <button
                className="w-full rounded-md border border-line bg-panel2 px-3 py-2 text-left text-sm hover:border-accent"
                onClick={() => onSelectRoute(route.id)}
                type="button"
              >
                <p className="font-medium text-main">
                  {selectedRouteId === route.id ? 'Selected: ' : ''}
                  Route {route.id.slice(0, 8)}
                </p>
                <p className="mt-1 text-xs text-soft">
                  Assigned Vehicle: {route.assignedCarId ?? 'Unassigned'}
                </p>
                <p className="text-xs text-soft">
                  Waypoints: {route.waypointsOrder.length} - {route.isCompleted ? 'Completed' : 'Active'}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-line bg-panel p-4">
        <h3 className="text-sm font-semibold text-main">Route Details</h3>
        {!selectedRoute ? (
          <p className="mt-3 text-sm text-soft">Select a route to inspect details.</p>
        ) : (
          <div className="mt-3 space-y-3 text-sm text-muted">
            <p>
              <span className="font-semibold">Route ID:</span> {selectedRoute.id}
            </p>
            <p>
              <span className="font-semibold">Assigned Vehicle:</span>{' '}
              {selectedRoute.assignedCarId ?? 'Unassigned'}
            </p>
            <p>
              <span className="font-semibold">Created:</span>{' '}
              {formatDateTime(selectedRoute.createdAt)}
            </p>
            <p>
              <span className="font-semibold">Status:</span>{' '}
              {selectedRoute.isCompleted ? 'Completed' : 'Active'}
            </p>

            <div>
              <p className="font-semibold">Waypoints</p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-auto rounded-md border border-line bg-panel2 p-2 text-xs">
                {selectedRoute.waypointsOrder.length === 0 ? (
                  <li className="text-soft">No waypoints available.</li>
                ) : (
                  [...selectedRoute.waypointsOrder]
                    .sort((a, b) => a.step - b.step)
                    .map((wp) => (
                      <li key={`${selectedRoute.id}-${wp.step}`}>
                        Step {wp.step} - Bin: {wp.binId} - Collected: {wp.collectedKg}kg
                      </li>
                    ))
                )}
              </ul>
            </div>

            <div className="flex gap-2 flex-wrap">
              {canComplete && !selectedRoute.isCompleted ? (
                <button
                  className="rounded-md bg-success px-3 py-2 text-xs font-semibold text-onAccent disabled:opacity-50"
                  disabled={completePending || deletePending}
                  onClick={() => onCompleteRoute(selectedRoute.id)}
                  type="button"
                >
                  {completePending ? 'Completing...' : 'Mark Route Completed'}
                </button>
              ) : null}

              {canDelete && onDeleteRoute ? (
                routeToDelete === selectedRoute.id ? (
                  <div className="flex items-center gap-2 rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2">
                    <span className="text-xs font-semibold text-red-500">Confirm delete?</span>
                    <button
                      className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                      disabled={deletePending}
                      onClick={() => {
                        onDeleteRoute(selectedRoute.id);
                        setRouteToDelete(null);
                      }}
                      type="button"
                    >
                      Yes
                    </button>
                    <button
                      className="rounded bg-panel2 px-2 py-1 text-xs font-bold text-main hover:bg-panel"
                      disabled={deletePending}
                      onClick={() => setRouteToDelete(null)}
                      type="button"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    className="rounded-md bg-danger px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                    disabled={completePending || deletePending}
                    onClick={() => setRouteToDelete(selectedRoute.id)}
                    type="button"
                  >
                    {deletePending ? 'Deleting...' : 'Delete Route'}
                  </button>
                )
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
