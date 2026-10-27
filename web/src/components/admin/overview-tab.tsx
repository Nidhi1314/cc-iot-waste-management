import {
  Trash2,
  AlertTriangle,
  Truck,
  Users,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import type { SmartBin, RouteItem, VehiclePublic } from '../../types/api';
import { formatDateTime } from '../../lib/utils';

type Props = {
  bins: SmartBin[];
  criticalBins: SmartBin[];
  routes: RouteItem[];
  activeRoutes: RouteItem[];
  operatorAccounts: VehiclePublic[];
};

function StatBlock({
  label,
  value,
  sub,
  icon: Icon,
  variant = 'pine',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'pine' | 'red' | 'forest' | 'amber';
}) {
  const colorMap = {
    pine: 'text-[#1B4332] bg-[#F0FDF4] border-[#DCFCE7]',
    red: 'text-[#DC2626] bg-[#FEF2F2] border-[#FEE2E2]',
    forest: 'text-[#2D6A4F] bg-[#F0FDF4] border-[#DCFCE7]',
    amber: 'text-[#D97706] bg-[#FFFBEB] border-[#FEF3C7]',
  };

  const textMap = {
    pine: 'text-[#1B4332]',
    red: 'text-[#DC2626]',
    forest: 'text-[#2D6A4F]',
    amber: 'text-[#D97706]',
  };

  return (
    <div className="rounded-lg p-5 border border-[#E2E8F0] bg-[#FFFFFF] shadow-sm transition hover:border-[#CBD5E1]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-md border ${colorMap[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={`mt-3 text-2xl font-bold ${textMap[variant]}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-[#64748B]">{sub}</p>}
    </div>
  );
}

export function OverviewTab({ bins, criticalBins, routes, activeRoutes, operatorAccounts }: Props) {
  const damagedBins = bins.filter((b) => b.status === 'DAMAGED' || b.status === 'OUT_OF_SERVICE');
  const avgFillLevel = bins.length > 0
    ? Math.round(bins.reduce((acc, b) => acc + b.currentFillLevel, 0) / bins.length)
    : 0;

  return (
    <div className="space-y-5 p-6 max-w-7xl mx-auto bg-[#F8FAF6]">
      {/* Top operational banner */}
      <div className="rounded-lg p-4 border border-[#E2E8F0] bg-white shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0FDF4] border border-[#DCFCE7] text-[#1B4332]">
            <TrendingUp className="h-5 w-5 text-[#2D6A4F]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#0F172A]">Operations Overview & Telemetry Health</h1>
            <p className="text-xs text-[#475569]">
              Live CVRP route optimization across Delhi Central Hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1 text-xs font-semibold text-[#0F172A]">
            Sector Avg Fill: <strong className="text-[#1B4332]">{avgFillLevel}%</strong>
          </span>
          <span className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider border ${
            criticalBins.length > 0
              ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]'
              : 'bg-[#F0FDF4] text-[#166534] border-[#DCFCE7]'
          }`}>
            {criticalBins.length > 0 ? `${criticalBins.length} Critical Units` : 'Grid Nominal'}
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatBlock
          label="Total Smart Bins"
          value={bins.length}
          sub="Registered Smart Nodes"
          icon={Trash2}
          variant="pine"
        />
        <StatBlock
          label="High-Risk Overfill"
          value={criticalBins.length}
          sub="Threshold ≥ 75%"
          icon={AlertTriangle}
          variant={criticalBins.length > 0 ? 'red' : 'forest'}
        />
        <StatBlock
          label="Active Routes"
          value={Math.min(activeRoutes.length, operatorAccounts.length)}
          sub={`${Math.min(activeRoutes.length, operatorAccounts.length)} of ${operatorAccounts.length} units dispatched`}
          icon={Truck}
          variant="forest"
        />
        <StatBlock
          label="Fleet Operators"
          value={operatorAccounts.length}
          sub="Authorized units"
          icon={Users}
          variant="amber"
        />
      </div>

      {/* Main Grid: Critical Bins & Recent Routes */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Critical Bins List */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
            <div className="flex items-center gap-2 text-[#0F172A]">
              <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
              <span className="font-bold text-xs uppercase tracking-wider">Critical Overflow Bins</span>
            </div>
            <span className="rounded bg-[#FEF2F2] border border-[#FEE2E2] px-2 py-0.5 text-[11px] font-bold text-[#DC2626]">
              {criticalBins.length} Units Flagged
            </span>
          </div>

          <div className="mt-3 max-h-56 overflow-y-auto space-y-2 pr-1">
            {criticalBins.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-xs text-[#475569]">
                <CheckCircle2 className="h-4 w-4 mr-2 text-[#2D6A4F]" />
                All smart containers within safe operating limits (&lt;75%)
              </div>
            ) : (
              criticalBins.map((bin) => (
                <div
                  key={bin.id}
                  className="flex items-center justify-between rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs transition hover:border-[#CBD5E1]"
                >
                  <div className="truncate pr-3">
                    <p className="font-semibold text-[#0F172A] truncate">{bin.address}</p>
                    <p className="text-[11px] text-[#64748B]">
                      ID: #{bin.id.slice(0, 8)} • Max: {bin.maxCapacityKg}kg
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-[#FEF2F2] border border-[#FEE2E2] px-2 py-0.5 text-xs font-bold text-[#DC2626]">
                    {bin.currentFillLevel}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Routes List */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
            <div className="flex items-center gap-2 text-[#0F172A]">
              <Truck className="h-4 w-4 text-[#2D6A4F]" />
              <span className="font-bold text-xs uppercase tracking-wider">Recent Dispatched Routes</span>
            </div>
            <span className="text-xs text-[#64748B]">{routes.length} total</span>
          </div>

          <div className="mt-3 max-h-56 overflow-y-auto space-y-2 pr-1">
            {routes.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-xs text-[#64748B]">
                No routes dispatched. Run CVRP optimizer in Surveillance.
              </div>
            ) : (
              routes.slice(0, 8).map((route) => (
                <div
                  key={route.id}
                  className="flex items-center justify-between rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs transition hover:border-[#CBD5E1]"
                >
                  <div>
                    <span className="font-mono font-bold text-[#1B4332]">
                      RTE_{route.id.slice(0, 8).toUpperCase()}
                    </span>
                    <p className="text-[11px] text-[#475569] mt-0.5">
                      {route.waypointsOrder.length} stops • {formatDateTime(route.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      route.isCompleted
                        ? 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]'
                        : 'bg-[#F0FDF4] text-[#166534] border-[#DCFCE7]'
                    }`}
                  >
                    {route.isCompleted ? 'COMPLETED' : 'IN TRANSIT'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Damaged Alert if any - No Emojis! */}
      {damagedBins.length > 0 && (
        <div className="rounded-lg border border-[#FED7AA] bg-[#FFF7ED] p-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-[#C2410C]">
            <AlertTriangle className="h-4 w-4" />
            <span>{damagedBins.length} Smart Container(s) Require Hardware Maintenance:</span>
          </div>
          <ul className="mt-2 space-y-1 text-[#7C2D12] font-mono">
            {damagedBins.map((b) => (
              <li key={b.id}>
                &gt; {b.address} [{b.status}]
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fleet Operator Accounts Strip */}
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
          <div className="flex items-center gap-2 text-[#0F172A]">
            <Users className="h-4 w-4 text-[#2D6A4F]" />
            <span className="font-bold text-xs uppercase tracking-wider">Authorized Fleet & Operator Units</span>
          </div>
          <span className="text-xs text-[#64748B]">{operatorAccounts.length} Units</span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {operatorAccounts.map((op) => (
            <div
              key={op.id}
              className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172A]">{op.userCode}</span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                    op.role === 'ADMIN'
                      ? 'border-[#DCFCE7] bg-[#F0FDF4] text-[#1B4332]'
                      : 'border-[#DCFCE7] bg-[#F0FDF4] text-[#2D6A4F]'
                  }`}
                >
                  {op.role}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-[#475569]">
                <span>Payload: {op.maxCapacityKg} kg</span>
                <span className="text-[#2D6A4F] font-semibold">Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
