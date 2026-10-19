import { useState } from 'react';
import type { SmartBin, RouteItem } from '../../types/api';
import { WasteMap } from '../map/waste-map';
import { formatDateTime } from '../../lib/utils';

type Props = {
  bins: SmartBin[];
  routes: RouteItem[];
};

function FillBar({ pct }: { pct: number }) {
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  const color = pct >= 75 ? 'text-terminalWarn' : 'text-terminalAccent';
  return (
    <span className={`font-mono text-xs ${color}`}>
      [{'█'.repeat(filled)}{'░'.repeat(empty)}] {pct}%
    </span>
  );
}

export function MapTab({ bins, routes }: Props) {
  const [selectedBinId, setSelectedBinId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');

  const selectedBin = bins.find((b) => b.id === selectedBinId) ?? null;
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  return (
    <div className="relative flex h-[calc(100vh-56px)] font-mono">
      <div className="flex-1">
        <WasteMap
          bins={bins}
          route={selectedRoute}
          onSelectBin={setSelectedBinId}
          selectedBinId={selectedBinId}
          theme="dark"
          className="h-full w-full"
        />
      </div>

      {/* Floating route selector */}
      <div className="absolute left-3 top-3 z-[999] rounded border border-terminalBorder bg-terminal p-2">
        <p className="mb-1 text-[10px] uppercase tracking-widest text-terminalMuted">ROUTE_OVERLAY</p>
        <div className="relative">
          <select
            className="w-full appearance-none rounded-lg border border-terminalBorder bg-terminalPanel2 px-2 py-1 pr-6 text-xs text-terminalText focus:border-terminalAccent focus:outline-none"
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
        <div className="slide-up absolute right-3 top-3 z-[999] w-72 rounded border border-terminalBorder bg-terminal p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-terminalMuted">BIN_DETAIL</p>
            <button
              className="text-terminalMuted hover:text-terminalDanger"
              onClick={() => setSelectedBinId(null)}
              type="button"
            >
              [×]
            </button>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div>
              <span className="text-terminalMuted">ADDRESS: </span>
              <span className="text-terminalText">{selectedBin.address}</span>
            </div>
            <div>
              <span className="text-terminalMuted">FILL_LVL: </span>
              <FillBar pct={selectedBin.currentFillLevel} />
            </div>
            <div>
              <span className="text-terminalMuted">STATUS: </span>
              <span className={
                selectedBin.status === 'ACTIVE'
                  ? 'text-terminalAccent'
                  : selectedBin.status === 'DAMAGED'
                  ? 'text-terminalDanger'
                  : 'text-terminalWarn'
              }>
                [{selectedBin.status}]
              </span>
            </div>
            <div>
              <span className="text-terminalMuted">NEEDS_COLL: </span>
              <span className={selectedBin.needsCollection ? 'text-terminalWarn' : 'text-terminalAccent'}>
                {selectedBin.needsCollection ? '[YES]' : '[NO]'}
              </span>
            </div>
            <div>
              <span className="text-terminalMuted">CAPACITY: </span>
              <span className="text-terminalText">{selectedBin.maxCapacityKg}kg</span>
            </div>
            <div>
              <span className="text-terminalMuted">UPDATED: </span>
              <span className="text-terminalText">{formatDateTime(selectedBin.lastUpdated)}</span>
            </div>
            <div>
              <span className="text-terminalMuted">LAT/LNG: </span>
              <span className="text-terminalText">{selectedBin.latitude.toFixed(5)}, {selectedBin.longitude.toFixed(5)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[999] rounded border border-terminalBorder bg-terminal p-2 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-terminalAccent"><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> NORMAL</div>
        <div className="flex items-center gap-1.5 text-terminalWarn"><span className="inline-block h-2 w-2 rounded-full bg-yellow-400" /> CRITICAL</div>
        <div className="flex items-center gap-1.5 text-terminalDanger"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> DAMAGED</div>
      </div>
    </div>
  );
}
