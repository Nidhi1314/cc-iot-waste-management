import React, { useState, useEffect } from 'react';
import {
  Map as MapIcon,
  LayoutDashboard,
  Trash2,
  Route as RouteIcon,
  Users,
  Sliders,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Leaf,
  MapPin,
  Calendar,
  Warehouse,
  ArrowLeftRight,
  Settings,
} from 'lucide-react';
import type { AuthUser, SmartBin, RouteItem, VehiclePublic } from '../../types/api';
import { OverviewTab } from './overview-tab';
import { MapTab } from './map-tab';
import { BinsTab } from './bins-tab';
import { RoutesTab } from './routes-tab';
import { OperatorsTab } from './operators-tab';
import { SimulationTab } from './simulation-tab';
import { LoadingState, ErrorState } from '../shared/states';
import type { GeneratorPayload } from '../../features/bins/api';
import { SettingsTab } from './settings-tab';
import { DestinationsTab } from './destinations-tab';
import { OperationsTab } from './operations-tab';
import type { Destination } from '../../features/destinations/api';
import type {
  CollectionPayload,
  CollectionRecord,
  ImpactSummary,
} from '../../features/collections/api';

import type {
  SystemSettings,
  UpdateSettingsRequest,
} from '../../features/settings/api';

type AdminTab =
  | 'overview'
  | 'map'
  | 'bins'
  | 'destinations'
  | 'routes'
  | 'operations'
  | 'operators'
  | 'simulation'
  | 'settings';

type AdminShellProps = {

onCreateGenerator: (
  data: GeneratorPayload,
) => Promise<void>;

onUpdateGenerator: (
  id: string,
  data: GeneratorPayload,
) => Promise<void>;

isSavingGenerator: boolean;

  user: AuthUser;
  settings: SystemSettings | null;
  settingsLoading: boolean;
  settingsError: string | null;
  onSaveSettings: (
    data: UpdateSettingsRequest,
  ) => Promise<void>;
  isSavingSettings: boolean;
  bins: SmartBin[];
  binsLoading: boolean;
  binsError: string | null;
  criticalBins: SmartBin[];
  routes: RouteItem[];
  routesLoading: boolean;
  routesError: string | null;
  activeRoutes: RouteItem[];
  operatorAccounts: VehiclePublic[];
  operatorsLoading: boolean;
  assignedVehicleId: string;
  onChangeAssignedVehicle: (id: string) => void;
  onGenerate: () => void;
  onGeneratePredictive: () => void;
  onGenerateOrganic: () => void;
  onCompleteRoute: (id: string) => void;
  onDeleteRoute: (id: string) => void;
  onSimulateDay: () => Promise<any>;
  onResetBins: () => Promise<any>;
  onTriggerSurge?: () => void;
  onEmptyBin?: (binId: string) => void;
  isPendingGenerate: boolean;
  isPendingPredictive: boolean;
  isPendingOrganic: boolean;
  completePending: boolean;
  deletePending: boolean;
  isPendingSimulate: boolean;
  isPendingReset: boolean;
  actionLog: string[];
  destinations: Destination[];
  collections: CollectionRecord[];
  impact: ImpactSummary | null;
  operationsError: string | null;
  onCreateCollection: (payload: CollectionPayload) => Promise<void>;
  onConfirmDelivery: (id: string) => Promise<void>;
  isSavingCollection: boolean;
  onLogout: () => void;
};

const NAV_ITEMS: { id: AdminTab; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'map', icon: MapIcon, label: 'Surveillance' },
  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'bins', icon: Trash2, label: 'Generators' },
  { id: 'destinations', icon: Warehouse, label: 'Destinations' },
  { id: 'routes', icon: RouteIcon, label: 'Routes' },
  { id: 'operations', icon: ArrowLeftRight, label: 'Collections & Impact' },
  { id: 'operators', icon: Users, label: 'Fleet Operators' },
  { id: 'simulation', icon: Sliders, label: 'Simulation' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function AdminShell(props: AdminShellProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('map');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAF6] font-sans text-[#0F172A]">
      {/* ================================================================= */}
      {/* 1. LEFT SIDEBAR: Clean, Professional Enterprise Navigation */}
      {/* ================================================================= */}
      <aside
        className="flex shrink-0 flex-col border-r border-[#E2E8F0] bg-white transition-all duration-200 z-30 shadow-sm"
        style={{ width: sidebarExpanded ? '230px' : '64px' }}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-3.5 py-4">
          {sidebarExpanded ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B4332] text-white shadow-sm">
                <Leaf className="h-4 w-4 text-[#52B788]" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-[#1B4332]">
                  Re<span className="text-[#2D6A4F]">Genix</span>
                </span>
                <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Climate-Tech Operations
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B4332] text-white">
              <Leaf className="h-4 w-4 text-[#52B788]" />
            </div>
          )}

          <button
            className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition"
            onClick={() => setSidebarExpanded((v) => !v)}
            type="button"
            title="Toggle sidebar"
          >
            {sidebarExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-2.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#1B4332] text-white shadow-sm'
                    : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                }`}
                onClick={() => setActiveTab(item.id)}
                type="button"
                title={item.label}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#52B788]' : 'text-[#64748B]'}`} />
                {sidebarExpanded && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Version & Footer */}
        <div className="border-t border-[#E2E8F0] p-3">
          {sidebarExpanded && (
            <div className="mb-2 px-1">
              <p className="text-[11px] font-medium text-[#475569]">ReGenix Core</p>
              <p className="text-[10px] font-mono text-[#94A3B8]">v2.4.0-enterprise</p>
            </div>
          )}
          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:border-[#FCA5A5] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition shadow-sm"
            onClick={props.onLogout}
            type="button"
            title="Sign out of console"
          >
            <LogOut className="h-3.5 w-3.5" />
            {sidebarExpanded && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ================================================================= */}
      {/* 2. MAIN WORKSPACE WITH FIXED TOP HEADER */}
      {/* ================================================================= */}
      <main className="flex flex-1 flex-col overflow-hidden bg-[#F8FAF6]">
        {/* Top Header: Fixed, clean white bar with system status, depot, date, profile */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-5 shadow-sm">
          {/* Left: System Status & Depot Zone */}
          <div className="flex items-center gap-4">
            {/* System Status Dot */}
            <div className="flex items-center gap-2 rounded-md border border-[#DCFCE7] bg-[#F0FDF4] px-2.5 py-1 text-xs font-semibold text-[#166534]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16A34A]" />
              </span>
              <span>Operational</span>
            </div>

            {/* Depot Zone */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#475569]">
              <MapPin className="h-3.5 w-3.5 text-[#2D6A4F]" />
              <span>Depot: <strong className="text-[#0F172A]">Manhattan Sector 04</strong></span>
            </div>
          </div>

          {/* Right: Date/Time & User Profile */}
          <div className="flex items-center gap-4">
            {/* Date / Time */}
            {currentTime && (
              <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
                <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
                <span>{currentTime}</span>
              </div>
            )}

            {/* User Session Profile Badge */}
            <div className="flex items-center gap-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-xs">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1B4332] text-[11px] font-bold text-white">
                {props.user.userCode.slice(0, 2)}
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#0F172A] leading-tight">{props.user.userCode}</p>
                <p className="text-[10px] text-[#64748B] uppercase">{props.user.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Content Area */}
        <div className="relative flex-1 overflow-hidden">
          {activeTab === 'map' && (
            props.binsLoading ? (
              <div className="p-6"><LoadingState title="LOADING_GEOSPATIAL_NODES" /></div>
            ) : props.binsError ? (
              <div className="p-6"><ErrorState title="FAILED_TO_LOAD_NODES" description={props.binsError} /></div>
            ) : (
              <MapTab
                bins={props.bins}
                routes={props.routes}
                vehicles={props.operatorAccounts}
                assignedVehicleId={props.assignedVehicleId}
                onChangeAssignedVehicle={props.onChangeAssignedVehicle}
                onSimulateDay={props.onSimulateDay}
                onResetBins={props.onResetBins}
                onGenerateRoutes={props.onGenerate}
                onGeneratePredictive={props.onGeneratePredictive}
                onTriggerSurge={props.onTriggerSurge}
                onEmptyBin={props.onEmptyBin}
                isSimulating={props.isPendingSimulate}
                isResetting={props.isPendingReset}
                isRouting={props.isPendingGenerate}
                isPredictiveRouting={props.isPendingPredictive}
                activeRoutes={props.activeRoutes}
                criticalBins={props.criticalBins}
              />
            )
          )}

          {activeTab === 'overview' && (
            props.binsLoading || props.routesLoading || props.operatorsLoading ? (
              <div className="p-6"><LoadingState title="SYNCING_TELEMETRY_DATAFEED" /></div>
            ) : (
              <div className="h-full overflow-y-auto">
                <OverviewTab
                  bins={props.bins}
                  criticalBins={props.criticalBins}
                  routes={props.routes}
                  activeRoutes={props.activeRoutes}
                  operatorAccounts={props.operatorAccounts}
                />
              </div>
            )
          )}

          {activeTab === 'bins' && (
            props.binsLoading ? (
              <div className="p-6"><LoadingState title="FETCHING_BIN_REGISTRY" /></div>
            ) : props.binsError ? (
              <div className="p-6"><ErrorState title="FAILED_TO_LOAD_BINS" description={props.binsError} /></div>
            ) : (

<BinsTab
  bins={props.bins}
  onCreate={props.onCreateGenerator}
  onUpdate={props.onUpdateGenerator}
  isSaving={props.isSavingGenerator}
/>

            )
          )}

{activeTab === 'destinations' && (
  <DestinationsTab />
)}

          {activeTab === 'routes' && (
            props.routesLoading ? (
              <div className="p-6"><LoadingState title="CALCULATING_OPTIMAL_CVRP" /></div>
            ) : props.routesError ? (
              <div className="p-6"><ErrorState title="ROUTING_SERVICE_ERROR" description={props.routesError} /></div>
            ) : (
              <RoutesTab
                routes={props.routes}
                bins={props.bins}
                operatorAccounts={props.operatorAccounts}
                assignedVehicleId={props.assignedVehicleId}
                onChangeAssignedVehicle={props.onChangeAssignedVehicle}
                onGenerate={props.onGenerate}
                onGeneratePredictive={props.onGeneratePredictive}
                onGenerateOrganic={props.onGenerateOrganic}
                onCompleteRoute={props.onCompleteRoute}
                onDeleteRoute={props.onDeleteRoute}
                isPending={props.isPendingGenerate}
                isPredictivePending={props.isPendingPredictive}
                isOrganicPending={props.isPendingOrganic}
                completePending={props.completePending}
                deletePending={props.deletePending}
                actionLog={props.actionLog}
              />
            )
          )}

          {activeTab === 'operations' && (
            <OperationsTab
              bins={props.bins}
              routes={props.routes}
              destinations={props.destinations}
              collections={props.collections}
              impact={props.impact}
              onCreateCollection={props.onCreateCollection}
              onConfirmDelivery={props.onConfirmDelivery}
              saving={props.isSavingCollection}
              error={props.operationsError}
            />
          )}

          {activeTab === 'operators' && (
            props.operatorsLoading ? (
              <div className="p-6"><LoadingState title="RETRIEVING_FLEET_UNITS" /></div>
            ) : (
              <OperatorsTab operatorAccounts={props.operatorAccounts} />
            )
          )}

          {activeTab === 'simulation' && (
            <SimulationTab
              onSimulateDay={props.onSimulateDay}
              onResetBins={props.onResetBins}
              isPendingSimulate={props.isPendingSimulate}
              isPendingReset={props.isPendingReset}
            />
          )}

{activeTab === 'settings' && (
            props.settingsLoading ? (
              <div className="p-6">
                <LoadingState title="LOADING_SETTINGS" />
              </div>
            ) : props.settingsError ? (
              <div className="p-6">
                <ErrorState
                  title="FAILED_TO_LOAD_SETTINGS"
                  description={props.settingsError}
                />
              </div>
            ) : props.settings ? (
              <SettingsTab
                key={props.settings.updatedAt}
                settings={props.settings}
                onSave={props.onSaveSettings}
                isSaving={props.isSavingSettings}
              />
            ) : (
              <div className="p-6 text-terminalMuted">
                Settings are unavailable.
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
