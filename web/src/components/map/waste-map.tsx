import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { apiRequest } from '../../lib/api-client';
import type { SmartBin, RouteItem } from '../../types/api';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type WasteMapProps = {
  bins: SmartBin[];
  route?: RouteItem | null;
  onSelectBin?: (binId: string) => void;
  selectedBinId?: string | null;
  nextStopBinId?: string | null;
  completedBinIds?: Set<string>;
  justCompletedBinId?: string | null;
  theme: 'dark' | 'light';
  className?: string;
};

const TILE_DARK = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_LIGHT = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function getBinColor(bin: SmartBin, isDone: boolean) {
  if (isDone) return '#22c55e';
  if (bin.status === 'DAMAGED' || bin.status === 'OUT_OF_SERVICE') return '#ef4444';
  if (bin.needsCollection || bin.currentFillLevel >= 75) return '#f59e0b';
  return '#22c55e';
}

function FitBounds({ bins }: { bins: SmartBin[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || bins.length === 0) return;
    const bounds = L.latLngBounds(bins.map((b) => [b.latitude, b.longitude]));
    map.fitBounds(bounds, { padding: [40, 40] });
    fitted.current = true;
  }, [bins, map]);
  return null;
}

export function WasteMap({
  bins,
  route,
  onSelectBin,
  selectedBinId,
  nextStopBinId,
  completedBinIds,
  justCompletedBinId,
  theme,
  className = '',
}: WasteMapProps) {
  // Polyline shows only REMAINING stops (completed ones are trimmed off the front)
  const routePolyline = useMemo<[number, number][]>(() => {
    if (!route || bins.length === 0) return [];
    const binsById = new Map(bins.map((b) => [b.id, b]));
    const sorted = [...route.waypointsOrder].sort((a, b) => a.step - b.step);

    const stops =
      completedBinIds && completedBinIds.size > 0 && !route.isCompleted
        ? sorted.filter((wp) => !completedBinIds.has(wp.binId))
        : sorted;

    return stops
      .map((wp) => {
        const bin = binsById.get(wp.binId);
        return bin ? ([bin.latitude, bin.longitude] as [number, number]) : null;
      })
      .filter((p): p is [number, number] => p !== null);
  }, [route, bins, completedBinIds]);

  const center: [number, number] = bins.length > 0
  ? [bins[0].latitude, bins[0].longitude]
  : [28.6139, 77.2090];

  // OSRM state and fetching logic
  const [realRoutePolyline, setRealRoutePolyline] = useState<[number, number][]>([]);
  const [isRoutingFailed, setIsRoutingFailed] = useState(false);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  useEffect(() => {
    if (routePolyline.length < 2) {
      setRealRoutePolyline([]);
      setIsRoutingFailed(false);
      return;
    }

    const fetchRoute = async () => {
      setIsRoutingLoading(true);
      setIsRoutingFailed(false);

      try {
        // ORS expects [longitude, latitude]
        const coordinates = routePolyline.map(([lat, lng]) => [lng, lat]);
        const data = await apiRequest<{ coordinates: [number, number][] }>(
          '/routes/directions',
          { method: 'POST', body: { coordinates } },
        );

        // ORS returns [longitude, latitude], Leaflet needs [latitude, longitude].
        setRealRoutePolyline(
          data.coordinates.map(([lng, lat]) => [lat, lng]),
        );
      } catch (error) {
        console.error('Error fetching real route from ORS:', error);
        setIsRoutingFailed(true);
        setRealRoutePolyline([]);
      } finally {
        setIsRoutingLoading(false);
      }
    };

    // Add a small debounce to prevent spamming the API if state updates rapidly
    const timeoutId = setTimeout(() => {
      fetchRoute();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [routePolyline]);

  const polylineToDraw = (!isRoutingFailed && realRoutePolyline.length > 0) 
    ? realRoutePolyline 
    : routePolyline;

  return (
    <MapContainer
      center={center}
      zoom={15}
      className={`w-full h-full ${className}`}
      style={{ background: '#f8fafc' }}
      zoomControl={true}
    >
      <TileLayer
        url={theme === 'dark' ? TILE_DARK : TILE_LIGHT}
        attribution={TILE_ATTR}
        maxZoom={19}
      />
      <FitBounds bins={bins} />

      {polylineToDraw.length > 1 && (
        <Polyline
          positions={polylineToDraw}
          color={
            isRoutingLoading
              ? '#9ca3af' // gray while loading
              : route?.isCompleted
              ? '#94a3b8'
              : theme === 'dark'
              ? '#0b5cff'
              : '#2563eb'
          }
          weight={route?.isCompleted ? 2 : 4}
          opacity={route?.isCompleted ? 0.45 : isRoutingLoading ? 0.6 : 0.85}
          dashArray={route?.isCompleted || isRoutingLoading || isRoutingFailed ? '7 5' : undefined}
        />
      )}

      {bins.map((bin) => {
        const isSelected = selectedBinId === bin.id;
        const isNext = nextStopBinId === bin.id;
        const isDone = completedBinIds?.has(bin.id) ?? false;
        const isJustDone = justCompletedBinId === bin.id;
        const routeDone = route?.isCompleted ?? false;
        const color = getBinColor(bin, isDone || routeDone);

        return (
          <React.Fragment key={bin.id}>
            {/* Flash ring — animates outward opacity 1→0 on the just-completed bin */}
            {isJustDone && (
              <CircleMarker
                center={[bin.latitude, bin.longitude]}
                radius={20}
                pathOptions={{
                  color: '#22c55e',
                  fillColor: '#22c55e',
                  fillOpacity: 0.25,
                  weight: 2,
                  className: 'bin-done-flash',
                }}
                interactive={false}
              />
            )}
            <CircleMarker
              center={[bin.latitude, bin.longitude]}
              radius={isSelected ? 12 : isNext ? 14 : isDone ? 6 : 8}
              pathOptions={{
                color: isSelected ? '#ffffff' : isNext ? '#ffffff' : color,
                fillColor: color,
                fillOpacity: isDone ? 0.75 : routeDone ? 0.35 : 0.9,
                weight: isSelected ? 3 : isNext ? 3 : isDone ? 1 : 1.5,
              }}
              eventHandlers={{ click: () => onSelectBin?.(bin.id) }}
            >
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', minWidth: '160px' }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>{bin.address}</p>
                  <p style={{ color: '#64748b', marginBottom: 2 }}>
                    Fill:{' '}
                    <strong style={{ color: bin.currentFillLevel >= 75 ? '#d97706' : '#16a34a' }}>
                      {bin.currentFillLevel}%
                    </strong>
                  </p>
                  <p style={{ color: '#64748b' }}>Status: {bin.status}</p>
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}
