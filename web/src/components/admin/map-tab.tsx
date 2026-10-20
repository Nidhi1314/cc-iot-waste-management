import { useState } from 'react';
import type { SmartBin, RouteItem } from '../../types/api';
import { WasteMap } from '../map/waste-map';
import { formatDateTime } from '../../lib/utils';

type Props = {
  bins: SmartBin[];
  routes: RouteItem[];
};

function FillBar({ pct }: { pct: number }) {
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

export function MapTab({ bins, routes }: Props) {
  const [selectedBinId, setSelectedBinId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');

  const selectedBin = bins.find((b) => b.id === selectedBinId) ?? null;
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  return (
    <div className="relative flex h-[calc(100vh-56px)]">
      <div className="flex-1">
        <WasteMap
          bins={bins}
          route={selectedRoute}
          onSelectBin={setSelectedBinId}
          selectedBinId={selectedBinId}
          theme="light"
          className="h-full w-full"
        />
      </div>

      {/* Floating route selector */}
      <div className="absolute left-3 top-3 z-[999] rounded-2xl border border-terminalBorder bg-white p-3 shadow-lg">
        <p className="mb-1 text-xs font-semibold text-terminalMuted">Route overlay</p>
        <div className="relative">
          <select
            className="w-full appearance-none rounded-xl border border-terminalBorder bg-white px-3 py-2 pr-7 text-sm text-terminalText focus:border-terminalAccent focus:outline-none"
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
          >
            <option value="">-- none --</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                RTE_{r.id.slice(0, 8).toUpperCase()} [{r.isCompleted ? 'DONE' : 'ACTIVE'}]
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-terminalMuted">▾</span>
        </div>
      </div>

      {/* Bin detail panel */}
      {selectedBin && (
        <div className="slide-up absolute right-3 top-3 z-[999] w-72 rounded-2xl border border-terminalBorder bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-terminalMuted">Bin details</p>
            <button
              className="text-terminalMuted hover:text-terminalDanger"
              onClick={() => setSelectedBinId(null)}
              type="button"
            >
              ×
            </button>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div>
              <span className="text-terminalMuted">Address: </span>
              <span className="text-terminalText">{selectedBin.address}</span>
            </div>
            <div>
              <span className="text-terminalMuted">Fill level: </span>
              <FillBar pct={selectedBin.currentFillLevel} />
            </div>
            <div>
              <span className="text-terminalMuted">Status: </span>
              <span className={
                selectedBin.status === 'ACTIVE'
                  ? 'text-terminalAccent'
                  : selectedBin.status === 'DAMAGED'
                  ? 'text-terminalDanger'
                  : 'text-terminalWarn'
              }>
                {selectedBin.status.replaceAll('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-terminalMuted">Needs collection: </span>
              <span className={selectedBin.needsCollection ? 'text-terminalWarn' : 'text-terminalAccent'}>
                {selectedBin.needsCollection ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-terminalMuted">Capacity: </span>
              <span className="text-terminalText">{selectedBin.maxCapacityKg}kg</span>
            </div>
            <div>
              <span className="text-terminalMuted">Updated: </span>
              <span className="font-mono text-xs text-terminalText">{formatDateTime(selectedBin.lastUpdated)}</span>
            </div>
            <div>
              <span className="text-terminalMuted">LAT/LNG: </span>
              <span className="text-terminalText">{selectedBin.latitude.toFixed(5)}, {selectedBin.longitude.toFixed(5)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[999] rounded-2xl border border-terminalBorder bg-white p-3 text-xs shadow-lg">
        <div className="flex items-center gap-1.5 text-terminalAccent"><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Normal</div>
        <div className="flex items-center gap-1.5 text-terminalWarn"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> Critical</div>
        <div className="flex items-center gap-1.5 text-terminalDanger"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Damaged</div>
      </div>
    </div>
  );
}
