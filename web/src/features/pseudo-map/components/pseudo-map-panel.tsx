import { useMemo } from 'react';
import type { RouteItem, SmartBin } from '../../../types/api';
import { classNames } from '../../../lib/utils';

type Props = {
  bins: SmartBin[];
  selectedRoute: RouteItem | null;
  selectedBinId: string | null;
  onSelectBin: (binId: string) => void;
};

const WIDTH = 700;
const HEIGHT = 320;
const PADDING = 20;

export function PseudoMapPanel({
  bins,
  selectedRoute,
  selectedBinId,
  onSelectBin,
}: Props) {
  const positions = useMemo(
    () => (bins.length === 0 ? new Map<string, Point>() : normalizeBins(bins)),
    [bins],
  );

  if (bins.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-panel p-4 text-sm text-soft">
        No bin data available for pseudo-map.
      </div>
    );
  }

  const routePoints = selectedRoute
    ? [...selectedRoute.waypointsOrder]
        .sort((a, b) => a.step - b.step)
        .map((waypoint) => {
          const point = positions.get(waypoint.binId);
          return point ? { ...point, step: waypoint.step, binId: waypoint.binId } : null;
        })
        .filter((item): item is Point & { step: number; binId: string } => Boolean(item))
    : [];

  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-main">Pseudo-Map</h3>
        <p className="text-xs text-soft">x=longitude, y=latitude</p>
      </div>

      <svg className="h-auto w-full rounded-md bg-mapBg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {routePoints.length > 1 ? (
          <polyline
            fill="none"
            points={routePoints.map((p) => `${p.x},${p.y}`).join(' ')}
            stroke="#0b5cff"
            strokeWidth="2"
          />
        ) : null}

        {bins.map((bin) => {
          const point = positions.get(bin.id);
          if (!point) return null;

          return (
            <g key={bin.id} onClick={() => onSelectBin(bin.id)}>
              <circle
                className={classNames(
                  'cursor-pointer transition',
                  selectedBinId === bin.id ? 'stroke-2' : 'stroke-1',
                )}
                cx={point.x}
                cy={point.y}
                fill={getBinColor(bin)}
                r={selectedBinId === bin.id ? 7 : 5}
                stroke="#ffffff"
              />
            </g>
          );
        })}

        {/* Step etiketlerini (Ziyaret Sırası) dairelerin üzerine çiziyoruz */}
        {routePoints.map((point) => (
          <text
            key={`step-${point.binId}`}
            x={point.x}
            y={point.y - 12} // Dairenin biraz yukarısı
            fontSize="10"
            fill="#0f172a"
            fontWeight="bold"
            textAnchor="middle"
            className="pointer-events-none drop-shadow-md"
          >
            {point.step}
          </text>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success" /> Active Normal
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-warning" /> Needs Collection
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-danger" /> Damaged / Out of Service
        </span>
      </div>
    </div>
  );
}

type Point = { x: number; y: number };

function normalizeBins(bins: SmartBin[]) {
  const latitudes = bins.map((bin) => bin.latitude);
  const longitudes = bins.map((bin) => bin.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const latRange = Math.max(maxLat - minLat, 0.000001);
  const lngRange = Math.max(maxLng - minLng, 0.000001);

  const map = new Map<string, Point>();
  for (const bin of bins) {
    const x = PADDING + ((bin.longitude - minLng) / lngRange) * (WIDTH - 2 * PADDING);
    const y =
      PADDING + (1 - (bin.latitude - minLat) / latRange) * (HEIGHT - 2 * PADDING);
    map.set(bin.id, { x, y });
  }
  return map;
}

function getBinColor(bin: SmartBin) {
  if (bin.status === 'DAMAGED' || bin.status === 'OUT_OF_SERVICE') return '#dc2626';
  if (bin.needsCollection) return '#d97706';
  return '#15803d';
}
