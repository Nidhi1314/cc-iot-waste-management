import { useState } from 'react';
import type { AuthUser, SmartBin, RouteItem, VehiclePublic } from '../../types/api';
import { OverviewTab } from './overview-tab';
import { MapTab } from './map-tab';
import { BinsTab } from './bins-tab';
import { RoutesTab } from './routes-tab';
import { OperatorsTab } from './operators-tab';
import { SimulationTab } from './simulation-tab';
import { LoadingState, ErrorState } from '../shared/states';

type AdminTab = 'overview' | 'map' | 'bins' | 'routes' | 'operators' | 'simulation';

type AdminShellProps = {
  user: AuthUser;
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
  onCompleteRoute: (id: string) => void;
  onDeleteRoute: (id: string) => void;
  onSimulateDay: () => Promise<{ message?: string }>;
  onResetBins: () => Promise<{ message?: string }>;
  isPendingGenerate: boolean;
  isPendingPredictive: boolean;
  completePending: boolean;
  deletePending: boolean;
  isPendingSimulate: boolean;
  isPendingReset: boolean;
  actionLog: string[];
  onLogout: () => void;
};

const NAV_ITEMS: { id: AdminTab; icon: string; label: string }[] = [
  { id: 'overview',    icon: '⌂',   label: 'Overview' },
  { id: 'map',         icon: '◈',   label: 'Surveillance' },
  { id: 'bins',        icon: '⬡',   label: 'Bins' },
  { id: 'routes',      icon: '⟳',   label: 'Routes' },
  { id: 'operators',   icon: '⚙',   label: 'Operators' },
  { id: 'simulation',  icon: '◎',   label: 'Simulation' },
];

export function AdminShell(props: AdminShellProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div
      className="flex h-screen overflow-hidden bg-terminal"
      style={{ background: 'var(--t-bg)', color: 'var(--t-text)' }}
    >
      {/* Sidebar */}
      <aside
        className="flex shrink-0 flex-col border-r border-terminalBorder bg-terminalPanel transition-all duration-200"
        style={{ width: sidebarExpanded ? '200px' : '52px' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-terminalBorder px-3 py-4">
          {sidebarExpanded && (
          <span className="text-sm font-extrabold tracking-tight text-terminalAccent">
            WW <span className="text-terminalText">WasteWise</span>
            </span>
          )}
          <button
            className="ml-auto rounded p-1 text-terminalMuted hover:text-terminalAccent"
            onClick={() => setSidebarExpanded((v) => !v)}
            type="button"
            title="Toggle sidebar"
          >
            {sidebarExpanded ? '◂' : '▸'}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-terminalAccent text-white shadow-sm'
                    : 'text-terminalMuted hover:bg-terminalPanel2 hover:text-terminalText'
                }`}
                onClick={() => setActiveTab(item.id)}
                type="button"
                title={item.label}
              >
                <span className="w-4 shrink-0 text-center text-sm">{item.icon}</span>
                {sidebarExpanded && (
                  <span className="truncate text-xs font-semibold">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-terminalBorder p-3">
          {sidebarExpanded && (
            <p className="mb-2 truncate text-xs text-terminalMuted">
              {props.user.userCode} [{props.user.role}]
            </p>
          )}
          <button
            className="flex w-full items-center gap-2 rounded-xl border border-terminalBorder px-3 py-2 text-xs font-medium text-terminalMuted hover:border-terminalDanger hover:bg-red-50 hover:text-terminalDanger"
            onClick={props.onLogout}
            type="button"
            title="Logout"
          >
            <span>⏻</span>
            {sidebarExpanded && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-terminalBorder bg-terminalPanel px-5 py-3 text-xs text-terminalMuted">
          <span>
            <span className="font-semibold text-terminalText">WasteWise</span>
            <span className="px-2 text-slate-300">/</span>
            <span className="capitalize">{activeTab}</span>
          </span>
          <span className="flex flex-wrap items-center gap-2 text-[11px]">
            <span>Bins <strong className="text-terminalText">{props.bins.length}</strong></span>
            <span className="text-slate-300">|</span>
            <span className={props.criticalBins.length > 0 ? 'rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800' : 'text-terminalMuted'}>
              Critical <strong>{props.criticalBins.length}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>Routes <strong className="text-terminalText">{props.activeRoutes.length}</strong></span>
          </span>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            props.binsLoading || props.routesLoading || props.operatorsLoading ? (
              <div className="p-6"><LoadingState title="LOADING_SYSTEM_DATA" /></div>
            ) : (
              <div className="t-scroll h-full overflow-auto">
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

          {activeTab === 'map' && (
            props.binsLoading ? (
              <div className="p-6"><LoadingState title="LOADING_BIN_DATA" /></div>
            ) : props.binsError ? (
              <div className="p-6"><ErrorState title="FAILED_TO_LOAD_BINS" description={props.binsError} /></div>
            ) : (
              <MapTab bins={props.bins} routes={props.routes} />
            )
          )}

          {activeTab === 'bins' && (
            props.binsLoading ? (
              <div className="p-6"><LoadingState title="LOADING_BINS" /></div>
            ) : props.binsError ? (
              <div className="p-6"><ErrorState title="FAILED_TO_LOAD_BINS" description={props.binsError} /></div>
            ) : (
              <BinsTab bins={props.bins} />
            )
          )}

          {activeTab === 'routes' && (
            props.routesLoading ? (
              <div className="p-6"><LoadingState title="LOADING_ROUTES" /></div>
            ) : props.routesError ? (
              <div className="p-6"><ErrorState title="FAILED_TO_LOAD_ROUTES" description={props.routesError} /></div>
            ) : (
              <RoutesTab
                routes={props.routes}
                bins={props.bins}
                operatorAccounts={props.operatorAccounts}
                assignedVehicleId={props.assignedVehicleId}
                onChangeAssignedVehicle={props.onChangeAssignedVehicle}
                onGenerate={props.onGenerate}
                onGeneratePredictive={props.onGeneratePredictive}
                onCompleteRoute={props.onCompleteRoute}
                onDeleteRoute={props.onDeleteRoute}
                isPending={props.isPendingGenerate}
                isPredictivePending={props.isPendingPredictive}
                completePending={props.completePending}
                deletePending={props.deletePending}
                actionLog={props.actionLog}
              />
            )
          )}

          {activeTab === 'operators' && (
            props.operatorsLoading ? (
              <div className="p-6"><LoadingState title="LOADING_OPERATORS" /></div>
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
        </div>
      </main>
    </div>
  );
}
