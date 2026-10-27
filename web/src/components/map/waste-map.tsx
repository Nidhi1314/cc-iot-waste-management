import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { apiRequest } from '../../lib/api-client';
import type { SmartBin, RouteItem } from '../../types/api';

type WasteMapProps = {
  bins: SmartBin[];
  route?: RouteItem | null;
  onSelectBin?: (binId: string) => void;
  selectedBinId?: string | null;
  nextStopBinId?: string | null;
  completedBinIds?: Set<string>;
  justCompletedBinId?: string | null;
  theme?: string;
  className?: string;
};

// OpenStreetMap tiles
const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Creates small, sleek circular badges:
 * - Normal (<60%): Clean forest/sage green (#2D6A4F)
 * - Warning (60-79%): Muted amber (#D97706)
 * - Critical (≥80%): Rust/coral red (#DC2626) with subtle alert pulse ring
 */
function createCustomBinIcon(
  bin: SmartBin,
  isSelected: boolean,
  isNext: boolean,
  isDone: boolean
) {
  const fill = bin.currentFillLevel;
  const isCritical = fill >= 80 || bin.status === 'DAMAGED' || bin.status === 'OUT_OF_SERVICE';
  const isWarning = fill >= 60 && fill < 80;

  let borderColor = '#2D6A4F';
  let bgColor = '#FFFFFF';
  let textColor = '#2D6A4F';
  let alertRingHtml = '';

  if (isCritical) {
    borderColor = '#DC2626';
    bgColor = '#FEF2F2';
    textColor = '#DC2626';
    alertRingHtml = `
      <span class="absolute inline-flex h-9 w-9 rounded-full bg-red-500/20 alert-radar-ring pointer-events-none"></span>
    `;
  } else if (isWarning || bin.needsCollection) {
    borderColor = '#D97706';
    bgColor = '#FFFBEB';
    textColor = '#D97706';
  } else if (isDone) {
    borderColor = '#94A3B8';
    bgColor = '#F1F5F9';
    textColor = '#64748B';
  }

  const selectionHalo = isSelected
    ? `<span class="absolute inline-flex h-10 w-10 rounded-full border-2 border-[#1B4332] pointer-events-none"></span>`
    : isNext
    ? `<span class="absolute inline-flex h-10 w-10 rounded-full border border-[#D97706] pointer-events-none"></span>`
    : '';

  const label = isDone ? 'OK' : `${fill}%`;

  const html = `
    <div class="eco-marker-container relative flex items-center justify-center">
      ${alertRingHtml}
      ${selectionHalo}
      <div class="eco-marker-badge flex items-center justify-center relative shadow-sm"
           style="background-color: ${bgColor}; border-color: ${borderColor}; color: ${textColor};">
        ${label}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-eco-bin-badge',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

function createDepotIcon(label: string = 'DEPOT') {
  const html = `
    <div class="relative flex items-center justify-center">
      <div class="flex items-center gap-1 rounded bg-[#1B4332] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md border border-white">
        <span>${label}</span>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'depot-map-marker',
    iconSize: [44, 20],
    iconAnchor: [22, 10],
  });
}

function FitBounds({ bins }: { bins: SmartBin[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || bins.length === 0) return;
    const bounds = L.latLngBounds(bins.map((b) => [b.latitude, b.longitude]));
    map.fitBounds(bounds, { padding: [30, 30] });
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
  className = '',
}: WasteMapProps) {
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

  const center: [number, number] =
    bins.length > 0 ? [bins[0].latitude, bins[0].longitude] : [28.6139, 77.2090];

  const [realRoutePolyline, setRealRoutePolyline] = useState<[number, number][]>([]);
  const [isRoutingFailed, setIsRoutingFailed] = useState(false);

  useEffect(() => {
    if (routePolyline.length < 2) {
      setRealRoutePolyline([]);
      setIsRoutingFailed(false);
      return;
    }

    const fetchRoute = async () => {
      setIsRoutingFailed(false);
      try {
        const coordinates = routePolyline.map(([lat, lng]) => [lng, lat]);
        const data = await apiRequest<{ coordinates: [number, number][] }>(
          '/routes/directions',
          { method: 'POST', body: { coordinates } },
        );
        setRealRoutePolyline(data.coordinates.map(([lng, lat]) => [lat, lng]));
      } catch {
        setIsRoutingFailed(true);
        setRealRoutePolyline([]);
      }
    };

    const timeoutId = setTimeout(fetchRoute, 350);
    return () => clearTimeout(timeoutId);
  }, [routePolyline]);

  const polylineToDraw =
    !isRoutingFailed && realRoutePolyline.length > 0 ? realRoutePolyline : routePolyline;

  const depotStartCoord = polylineToDraw.length > 0 ? polylineToDraw[0] : null;

  return (
    <MapContainer
      center={center}
      zoom={15}
      className={`w-full h-full ${className}`}
      style={{ background: '#EAF2EA' }}
      zoomControl={true}
    >
      <TileLayer
        url={OSM_TILES}
        attribution={OSM_ATTR}
        maxZoom={19}
        className="eco-map-tiles"
      />
      <FitBounds bins={bins} />

      {/* Clean Forest-Green Path (#2D6A4F) */}
      {polylineToDraw.length > 1 && (
        <>
          <Polyline
            positions={polylineToDraw}
            color="#2D6A4F"
            weight={3.5}
            opacity={0.9}
            lineCap="round"
            lineJoin="round"
          />
          <Polyline
            positions={polylineToDraw}
            color="#2D6A4F"
            weight={7}
            opacity={0.2}
            lineCap="round"
            lineJoin="round"
          />
        </>
      )}

      {/* Depot Marker */}
      {depotStartCoord && (
        <Marker position={depotStartCoord} icon={createDepotIcon('DEPOT START')} />
      )}

      {/* Small Sleek Circular Badges */}
      {bins.map((bin) => {
        const isSelected = selectedBinId === bin.id;
        const isNext = nextStopBinId === bin.id;
        const isDone = completedBinIds?.has(bin.id) ?? false;
        const customIcon = createCustomBinIcon(bin, isSelected, isNext, isDone);

        return (
          <Marker
            key={bin.id}
            position={[bin.latitude, bin.longitude]}
            icon={customIcon}
            eventHandlers={{
              click: () => onSelectBin?.(bin.id),
            }}
          >
            <Popup>
              <div className="font-sans text-xs min-w-[190px] p-0.5 text-[#0F172A]">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5 mb-1.5">
                  <span className="font-mono text-[11px] font-bold text-[#1B4332]">
                    NODE #{bin.id.slice(0, 6).toUpperCase()}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      bin.currentFillLevel >= 80
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : bin.currentFillLevel >= 60
                        ? 'bg-[#FEF3C7] text-[#D97706]'
                        : 'bg-[#DCFCE7] text-[#2D6A4F]'
                    }`}
                  >
                    {bin.currentFillLevel}% Fill
                  </span>
                </div>
                <p className="font-medium text-[#0F172A] leading-snug">{bin.address}</p>
                <div className="flex justify-between text-[#475569] text-[11px] mt-1.5 pt-1 border-t border-[#F1F5F9]">
                  <span>Payload: {bin.maxCapacityKg}kg</span>
                  <span className="font-semibold text-[#1B4332]">{bin.status}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectBin?.(bin.id)}
                  className="mt-2.5 w-full rounded-md bg-[#1B4332] py-1 text-center font-semibold text-white hover:bg-[#143527] transition text-[11px]"
                >
                  Inspect Telemetry
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
