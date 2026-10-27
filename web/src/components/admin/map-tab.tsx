import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  AlertTriangle,
  Leaf,
  Navigation,
  Sparkles,
  RotateCcw,
  FastForward,
  Flame,
  X,
  Thermometer,
  Wind,
  Battery,
  CheckCircle2,
  Radio,
  Layers,
} from 'lucide-react';
import type { SmartBin, RouteItem, VehiclePublic } from '../../types/api';
import { WasteMap } from '../map/waste-map';
import { getSensorHistory } from '../../features/sensors/api';

type MapTabProps = {
  bins: SmartBin[];
  routes: RouteItem[];
  vehicles: VehiclePublic[];
  assignedVehicleId: string;
  onChangeAssignedVehicle: (id: string) => void;
  onSimulateDay: () => Promise<any>;
  onResetBins: () => Promise<any>;
  onGenerateRoutes: () => void;
  onGeneratePredictive: () => void;
  onTriggerSurge?: () => void;
  onEmptyBin?: (binId: string) => void;
  isSimulating: boolean;
  isResetting: boolean;
  isRouting: boolean;
  isPredictiveRouting: boolean;
  activeRoutes: RouteItem[];
  criticalBins: SmartBin[];
};

export function MapTab({
  bins,
  routes,
  vehicles,
  assignedVehicleId,
  onChangeAssignedVehicle,
  onSimulateDay,
  onResetBins,
  onGenerateRoutes,
  onGeneratePredictive,
  onTriggerSurge,
  onEmptyBin,
  isSimulating,
  isResetting,
  isRouting,
  isPredictiveRouting,
  activeRoutes,
  criticalBins,
}: MapTabProps) {
  const [selectedBinId, setSelectedBinId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');

  const selectedBin = bins.find((b) => b.id === selectedBinId) ?? null;
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0] ?? null;

  // Selected bin sensor history for sparkline
  const { data: sensorHistory } = useQuery({
    queryKey: ['sensors', 'history', selectedBinId],
    queryFn: () => getSensorHistory(selectedBinId!, 16),
    enabled: Boolean(selectedBinId),
  });

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalFleet = Math.max(vehicles.length, 3);
    const activeTrucks = activeRoutes.filter((r) => !r.isCompleted && r.assignedCarId).length;
    const fleetUtilizationPct = Math.round((activeTrucks / totalFleet) * 100);

    const highRiskCount = criticalBins.length;

    const estimatedKmSaved = Math.round(bins.length * 2.4);
    const co2AvoidedKg = Math.round(estimatedKmSaved * 0.27);
    const fuelSavingsPct = 24.8;

    return {
      activeTrucks,
      totalFleet,
      fleetUtilizationPct,
      highRiskCount,
      co2AvoidedKg,
      fuelSavingsPct,
    };
  }, [vehicles, activeRoutes, criticalBins, bins]);

  // Selected bin telemetry
  const binTelemetry = useMemo(() => {
    if (!selectedBin) return null;
    const fill = selectedBin.currentFillLevel;
    const isCritical = fill >= 80;
    const isWarning = fill >= 60;

    const tempC = (20.5 + (fill / 100) * 17.5 + Math.sin(fill) * 1.2).toFixed(1);
    const methanePpm = Math.round(45 + Math.pow(fill / 100, 2.4) * 1350);
    const headspaceCm = Math.round(selectedBin.totalDepthCm * (1 - fill / 100));
    const batteryVolts = (3.75 + ((selectedBin.id.charCodeAt(0) % 40) / 100)).toFixed(2);

    return {
      fill,
      isCritical,
      isWarning,
      tempC,
      methanePpm,
      headspaceCm,
      batteryVolts,
    };
  }, [selectedBin]);

  // Sparkline SVG path
  const sparklineSvg = useMemo(() => {
    if (!selectedBin) return null;
    const data =
      sensorHistory && sensorHistory.length >= 2
        ? [...sensorHistory].reverse().map((r) => r.fillPercentage)
        : [
            Math.max(5, selectedBin.currentFillLevel - 30),
            Math.max(10, selectedBin.currentFillLevel - 20),
            Math.max(15, selectedBin.currentFillLevel - 15),
            Math.max(20, selectedBin.currentFillLevel - 8),
            selectedBin.currentFillLevel,
          ];

    const width = 320;
    const height = 48;
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - (val / 100) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${points.join(' L ')}`;
    const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

    return { pathD, areaD, width, height };
  }, [selectedBin, sensorHistory]);

  const binsById = useMemo(() => new Map(bins.map((b) => [b.id, b])), [bins]);

  const isAnyActionPending = isSimulating || isResetting || isRouting || isPredictiveRouting;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#F8FAF6]">
      {/* ================================================================= */}
      {/* MAIN MAP SECTION (65-70% width) - Clean, Uncluttered Canvas */}
      {/* ================================================================= */}
      <section className="flex flex-1 flex-col h-full min-w-0 p-4">
        {/* Map Frame */}
        <div className="relative flex-1 w-full rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
          <WasteMap
            bins={bins}
            route={selectedRoute}
            onSelectBin={(id) => setSelectedBinId(id)}
            selectedBinId={selectedBinId}
            className="h-full w-full"
          />

          {/* Compact Bottom Cartography Status Bar */}
          <div className="absolute bottom-3 left-3 z-[400] flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white/95 px-3 py-1.5 text-[11px] font-medium text-[#475569] shadow-sm backdrop-blur-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#2D6A4F]" />
              <span>Manhattan Sector 04</span>
            </span>
            <span className="text-[#CBD5E1]">|</span>
            <span>{bins.length} Telemetry Nodes</span>
            <span className="text-[#CBD5E1]">|</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full bg-[#2D6A4F]" />
              <span>Route Polyline</span>
            </span>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* RIGHT TELEMETRY & CONTROL SIDEBAR (30-35% width) - Structured Panel */}
      {/* ================================================================= */}
      <aside className="w-[390px] xl:w-[430px] shrink-0 border-l border-[#E2E8F0] bg-white h-full overflow-y-auto flex flex-col">
        {/* Panel Header */}
        <div className="border-b border-[#E2E8F0] px-5 py-3.5 bg-[#F8FAFC]">
          <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
            Operations & Telemetry Control
          </h2>
          <p className="text-[11px] text-[#475569]">
            Live CVRP heuristic dispatch and IoT container surveillance
          </p>
        </div>

        <div className="flex-1 p-5 space-y-5 overflow-y-auto">
          {/* ============================================================= */}
          {/* A) REAL-TIME KPI CARDS (3 clean rectangular cards) */}
          {/* ============================================================= */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              Real-Time Metrics
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Card 1: Fleet Utilization */}
              <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-3 shadow-eco-sm">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span className="text-[10px] font-semibold uppercase">Fleet</span>
                  <Truck className="h-3.5 w-3.5 text-[#2D6A4F]" />
                </div>
                <p className="mt-1 text-base font-bold text-[#0F172A]">
                  {kpis.fleetUtilizationPct}%
                </p>
                <p className="text-[10px] text-[#475569] truncate">
                  {kpis.activeTrucks}/{kpis.totalFleet} Active
                </p>
              </div>

              {/* Card 2: High-Risk Bins */}
              <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-3 shadow-eco-sm">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span className="text-[10px] font-semibold uppercase">High Risk</span>
                  <AlertTriangle
                    className={`h-3.5 w-3.5 ${
                      kpis.highRiskCount > 0 ? 'text-[#DC2626]' : 'text-[#2D6A4F]'
                    }`}
                  />
                </div>
                <p
                  className={`mt-1 text-base font-bold ${
                    kpis.highRiskCount > 0 ? 'text-[#DC2626]' : 'text-[#0F172A]'
                  }`}
                >
                  {kpis.highRiskCount}
                </p>
                <p className="text-[10px] text-[#475569] truncate">
                  {kpis.highRiskCount > 0 ? '≥ 80% Fill' : 'All Nominal'}
                </p>
              </div>

              {/* Card 3: Route Carbon Savings */}
              <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-3 shadow-eco-sm">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span className="text-[10px] font-semibold uppercase">Carbon</span>
                  <Leaf className="h-3.5 w-3.5 text-[#2D6A4F]" />
                </div>
                <p className="mt-1 text-base font-bold text-[#1B4332]">
                  +{kpis.fuelSavingsPct}%
                </p>
                <p className="text-[10px] text-[#475569] truncate">
                  -{kpis.co2AvoidedKg}kg CO₂
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* B) ACTION CONSOLE (Clean rectangular buttons, NO emojis) */}
          {/* ============================================================= */}
          <div className="space-y-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">
                Dispatch & Simulation Console
              </h3>
              <span className="text-[10px] text-[#64748B]">OR-Tools Engine</span>
            </div>

            {/* Vehicle Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                Assigned Fleet Vehicle:
              </label>
              <select
                value={assignedVehicleId}
                onChange={(e) => onChangeAssignedVehicle(e.target.value)}
                disabled={isAnyActionPending}
                className="w-full rounded-md border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs text-[#0F172A] focus:border-[#2D6A4F] focus:outline-none"
              >
                <option value="">-- Select Vehicle Unit --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.userCode} ({v.maxCapacityKg} kg capacity) [{v.role}]
                  </option>
                ))}
              </select>
            </div>

            {/* Main Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Solve CVRP Route */}
              <button
                onClick={onGenerateRoutes}
                disabled={isAnyActionPending || !assignedVehicleId}
                className="flex items-center justify-center gap-1.5 rounded-md border border-[#2D6A4F] bg-[#F0FDF4] px-3 py-2 text-xs font-semibold text-[#1B4332] hover:bg-[#DCFCE7] transition disabled:opacity-50"
                type="button"
                title="Dispatch standard CVRP heuristic route"
              >
                <Navigation className={`h-3.5 w-3.5 ${isRouting ? 'animate-spin' : ''}`} />
                <span>{isRouting ? 'Solving...' : 'Solve CVRP'}</span>
              </button>

              {/* AI Route Optimization */}
              <button
                onClick={onGeneratePredictive}
                disabled={isAnyActionPending || !assignedVehicleId}
                className="flex items-center justify-center gap-1.5 rounded-md bg-[#1B4332] px-3 py-2 text-xs font-semibold text-white hover:bg-[#143527] transition disabled:opacity-50"
                type="button"
                title="Dispatch AI Random Forest + OR-Tools CVRP solver"
              >
                <Sparkles
                  className={`h-3.5 w-3.5 text-[#52B788] ${
                    isPredictiveRouting ? 'animate-spin' : ''
                  }`}
                />
                <span>{isPredictiveRouting ? 'Optimizing...' : 'AI Route Optimization'}</span>
              </button>

              {/* Simulate Organic Surge */}
              {onTriggerSurge ? (
                <button
                  onClick={onTriggerSurge}
                  disabled={isAnyActionPending}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-[#FED7AA] bg-[#FFF7ED] px-3 py-1.5 text-xs font-semibold text-[#C2410C] hover:bg-[#FFEDD5] transition disabled:opacity-50"
                  type="button"
                  title="Simulate high-volume food spoil event in local cluster"
                >
                  <Flame className="h-3.5 w-3.5 text-[#C2410C]" />
                  <span>Simulate Surge</span>
                </button>
              ) : (
                <button
                  onClick={onSimulateDay}
                  disabled={isAnyActionPending}
                  className="flex items-center justify-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] transition disabled:opacity-50"
                  type="button"
                  title="Advance simulation by 24 hours"
                >
                  <FastForward className="h-3.5 w-3.5 text-[#64748B]" />
                  <span>Advance 24h</span>
                </button>
              )}

              {/* Reset Grid */}
              <button
                onClick={onResetBins}
                disabled={isAnyActionPending}
                className="flex items-center justify-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition disabled:opacity-50"
                type="button"
                title="Reset all bin fill levels to 0%"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? 'Resetting...' : 'Reset Grid'}</span>
              </button>
            </div>
          </div>

          {/* ============================================================= */}
          {/* C) SELECTED BIN INSPECTOR (Inline Card) */}
          {/* ============================================================= */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Selected Bin Inspector
              </h3>
              {selectedBin && (
                <button
                  onClick={() => setSelectedBinId(null)}
                  className="text-[11px] text-[#64748B] hover:text-[#0F172A] flex items-center gap-1"
                  type="button"
                >
                  <X className="h-3 w-3" />
                  <span>Close</span>
                </button>
              )}
            </div>

            {selectedBin && binTelemetry ? (
              <div className="rounded-lg border border-[#CBD5E1] bg-white p-4 shadow-sm space-y-3">
                {/* Bin Header */}
                <div className="flex items-start justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#1B4332]">
                      NODE #{selectedBin.id.slice(0, 8).toUpperCase()}
                    </span>
                    <p className="text-xs font-medium text-[#0F172A] leading-snug">
                      {selectedBin.address}
                    </p>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      binTelemetry.isCritical
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : binTelemetry.isWarning
                        ? 'bg-[#FEF3C7] text-[#D97706]'
                        : 'bg-[#DCFCE7] text-[#2D6A4F]'
                    }`}
                  >
                    {selectedBin.status}
                  </span>
                </div>

                {/* Fill Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#64748B]">Current Fill Level</span>
                    <span className="font-mono font-bold text-[#0F172A]">
                      {selectedBin.currentFillLevel}% ({((selectedBin.currentFillLevel / 100) * selectedBin.maxCapacityKg).toFixed(1)} / {selectedBin.maxCapacityKg} kg)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        binTelemetry.isCritical
                          ? 'bg-[#DC2626]'
                          : binTelemetry.isWarning
                          ? 'bg-[#D97706]'
                          : 'bg-[#2D6A4F]'
                      }`}
                      style={{ width: `${Math.min(100, selectedBin.currentFillLevel)}%` }}
                    />
                  </div>
                </div>

                {/* Sensor Readings Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                    <div className="flex items-center gap-1.5 text-[#64748B]">
                      <Thermometer className="h-3 w-3 text-[#D97706]" />
                      <span className="text-[10px]">Core Temp</span>
                    </div>
                    <p className="font-mono text-sm font-bold text-[#0F172A] mt-0.5">
                      {binTelemetry.tempC} °C
                    </p>
                  </div>

                  <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                    <div className="flex items-center gap-1.5 text-[#64748B]">
                      <Wind className="h-3 w-3 text-[#2D6A4F]" />
                      <span className="text-[10px]">Methane VOC</span>
                    </div>
                    <p className="font-mono text-sm font-bold text-[#0F172A] mt-0.5">
                      {binTelemetry.methanePpm} ppm
                    </p>
                  </div>

                  <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                    <div className="flex items-center gap-1.5 text-[#64748B]">
                      <Battery className="h-3 w-3 text-[#2D6A4F]" />
                      <span className="text-[10px]">Battery</span>
                    </div>
                    <p className="font-mono text-xs font-bold text-[#0F172A] mt-0.5">
                      {binTelemetry.batteryVolts}V
                    </p>
                  </div>

                  <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                    <div className="flex items-center gap-1.5 text-[#64748B]">
                      <Radio className="h-3 w-3 text-[#64748B]" />
                      <span className="text-[10px]">Headspace</span>
                    </div>
                    <p className="font-mono text-xs font-bold text-[#0F172A] mt-0.5">
                      {binTelemetry.headspaceCm} cm
                    </p>
                  </div>
                </div>

                {/* 24h Trend Sparkline */}
                {sparklineSvg && (
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase font-semibold">
                      24-Hour Telemetry Trend
                    </span>
                    <div className="mt-1 rounded border border-[#E2E8F0] bg-[#F8FAFC] p-1.5">
                      <svg
                        viewBox={`0 0 ${sparklineSvg.width} ${sparklineSvg.height}`}
                        className="w-full h-10 overflow-visible"
                      >
                        <path d={sparklineSvg.areaD} fill="#2D6A4F" fillOpacity="0.12" />
                        <path
                          d={sparklineSvg.pathD}
                          fill="none"
                          stroke="#2D6A4F"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Inspector Actions */}
                <div className="pt-1 flex gap-2">
                  <button
                    onClick={() => {
                      if (assignedVehicleId) {
                        onGeneratePredictive();
                      } else if (vehicles[0]?.id) {
                        onChangeAssignedVehicle(vehicles[0].id);
                        onGeneratePredictive();
                      }
                    }}
                    disabled={isAnyActionPending}
                    className="flex-1 rounded-md bg-[#1B4332] py-1.5 text-xs font-semibold text-white hover:bg-[#143527] transition disabled:opacity-50"
                    type="button"
                  >
                    Force Route Dispatch
                  </button>
                  {onEmptyBin && (
                    <button
                      onClick={() => onEmptyBin(selectedBin.id)}
                      className="rounded-md border border-[#CBD5E1] px-2.5 py-1.5 text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] transition"
                      type="button"
                      title="Mark collected / empty bin"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#2D6A4F]" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5 text-center text-xs text-[#64748B]">
                <Radio className="mx-auto h-5 w-5 text-[#94A3B8] mb-1.5" />
                <p className="font-medium text-[#475569]">No Node Selected</p>
                <p className="text-[11px] mt-0.5">
                  Click any smart container on the map to inspect live sensor readings and dispatch collection.
                </p>
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* D) ROUTE MANIFEST / WAYPOINT LIST */}
          {/* ============================================================= */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Route Manifest
              </h3>
              {routes.length > 0 && (
                <span className="text-[10px] font-mono text-[#64748B]">
                  {routes.length} Active Route(s)
                </span>
              )}
            </div>

            {/* Route Selector Dropdown */}
            {routes.length > 0 ? (
              <div className="space-y-2.5">
                <select
                  value={selectedRoute?.id ?? ''}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  className="w-full rounded-md border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs text-[#0F172A] focus:border-[#2D6A4F] focus:outline-none"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      RTE_{r.id.slice(0, 8).toUpperCase()} ({r.waypointsOrder.length} stops) [
                      {r.isCompleted ? 'COMPLETED' : 'IN TRANSIT'}]
                    </option>
                  ))}
                </select>

                {/* Waypoint Ordered List */}
                {selectedRoute && (
                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#475569] border-b border-[#F1F5F9] pb-1.5">
                      <span className="font-medium">
                        Total Distance:{' '}
                        <strong className="text-[#0F172A]">
                          {selectedRoute.totalDistanceKm != null
                            ? `${selectedRoute.totalDistanceKm.toFixed(2)} km`
                            : 'OSRM Pending'}
                        </strong>
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          selectedRoute.isCompleted
                            ? 'bg-[#F1F5F9] text-[#64748B]'
                            : 'bg-[#DCFCE7] text-[#2D6A4F]'
                        }`}
                      >
                        {selectedRoute.isCompleted ? 'Finished' : 'En Route'}
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-xs font-mono">
                      {[...selectedRoute.waypointsOrder]
                        .sort((a, b) => a.step - b.step)
                        .map((wp) => {
                          const bin = binsById.get(wp.binId);
                          return (
                            <div
                              key={`${selectedRoute.id}-${wp.step}`}
                              className="flex items-center justify-between rounded bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-[#1B4332] w-5">#{wp.step}</span>
                                <span className="truncate text-[#0F172A] font-sans text-[11px]">
                                  {bin?.address ?? wp.binId.slice(0, 10)}
                                </span>
                              </div>
                              <span className="text-[#2D6A4F] font-bold shrink-0 ml-2">
                                +{wp.collectedKg} kg
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center text-xs text-[#64748B]">
                <Layers className="mx-auto h-4 w-4 text-[#94A3B8] mb-1" />
                <p>No active route scheduled.</p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                  Click &apos;Solve CVRP&apos; or &apos;AI Route Optimization&apos; to dispatch.
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
