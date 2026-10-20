import type { SmartBin, RouteItem, VehiclePublic } from '../../types/api';
import { formatDateTime } from '../../lib/utils';

type Props = {
  bins: SmartBin[];
  criticalBins: SmartBin[];
  routes: RouteItem[];
  activeRoutes: RouteItem[];
  operatorAccounts: VehiclePublic[];
};

function StatBlock({ label, value, sub, accent }: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-terminalBorder bg-terminalPanel p-5 shadow-sm">
      <p className="text-xs font-semibold text-terminalMuted">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ? 'text-terminalWarn' : 'text-terminalAccent'}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-[11px] text-terminalMuted">{sub}</p> : null}
    </div>
  );
}

export function OverviewTab({ bins, criticalBins, routes, activeRoutes, operatorAccounts }: Props) {
  const damagedBins = bins.filter((b) => b.status === 'DAMAGED' || b.status === 'OUT_OF_SERVICE');

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-terminalMuted">
        <span className="font-semibold text-terminalText">System status</span>
        <span className={criticalBins.length > 0 ? 'rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800' : 'rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800'}>
          {criticalBins.length > 0 ? 'Attention required' : 'Nominal'}
        </span>
        <span className="h-4 border-l border-slate-200" />
        <span>Bins <strong className="text-terminalText">{bins.length}</strong></span>
        <span className="h-4 border-l border-slate-200" />
        <span>Critical <strong className={criticalBins.length > 0 ? 'text-terminalWarn' : 'text-terminalText'}>{criticalBins.length}</strong></span>
        <span className="h-4 border-l border-slate-200" />
        <span>Routes <strong className="text-terminalText">{activeRoutes.length}</strong></span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBlock label="Total bins" value={bins.length} sub="Units registered" />
        <StatBlock label="Critical bins" value={criticalBins.length} sub="Fill ≥ 75%" accent={criticalBins.length > 0} />
        <StatBlock label="Active routes" value={activeRoutes.length} sub="In progress" />
        <StatBlock label="Operators" value={operatorAccounts.length} sub="Accounts" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
          <div className="t-panel-header flex items-center justify-between">
            <span>Critical bins</span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{criticalBins.length} flagged</span>
          </div>
          <div className="t-scroll max-h-48 overflow-auto p-3 text-xs">
            {criticalBins.length === 0 ? (
              <p className="text-terminalMuted">No critical bins</p>
            ) : (
              criticalBins.slice(0, 8).map((bin) => (
                <div key={bin.id} className="flex items-center justify-between border-b border-terminalBorder py-2.5 last:border-0">
                  <span className="truncate text-terminalText">{bin.address}</span>
                  <span className="ml-3 shrink-0 rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">{bin.currentFillLevel}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
          <div className="t-panel-header flex items-center justify-between">
            <span>Recent routes</span>
            <span className="text-terminalMuted">{routes.length} total</span>
          </div>
          <div className="t-scroll max-h-48 overflow-auto p-3 text-xs">
            {routes.length === 0 ? (
              <p className="text-terminalMuted">No routes generated</p>
            ) : (
              routes.slice(0, 8).map((route) => (
                <div key={route.id} className="flex items-center justify-between border-b border-terminalBorder py-2.5 last:border-0">
                  <span className="font-mono text-terminalText">RTE_{route.id.slice(0, 8).toUpperCase()}</span>
                  <span className={route.isCompleted ? 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700' : 'rounded-full bg-terminalAccent px-2.5 py-1 text-xs font-semibold text-white'}>
                    {route.isCompleted ? 'Done' : 'Active'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {damagedBins.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">⚠ {damagedBins.length} bin(s) need attention due to damaged or out-of-service status:</p>
          <ul className="mt-2 space-y-1 text-terminalMuted">
            {damagedBins.map((b) => (
              <li key={b.id}>{'  > '}<span className="text-terminalText">{b.address}</span> [{b.status}]</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
        <div className="t-panel-header">Operator accounts</div>
        <div className="t-scroll max-h-40 overflow-auto p-3 text-xs">
          {operatorAccounts.length === 0 ? (
            <p className="text-terminalMuted">No operators</p>
          ) : (
            operatorAccounts.map((op) => (
              <div key={op.id} className="flex items-center justify-between border-b border-terminalBorder py-1.5 last:border-0">
                <span className="text-terminalText">{op.userCode}</span>
                <div className="flex items-center gap-3">
                  <span className="text-terminalMuted">{op.maxCapacityKg}kg</span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                    op.role === 'ADMIN'
                      ? 'border-terminalAccent2 text-terminalAccent2'
                      : 'border-terminalAccent text-terminalAccent'
                  }`}>
                    [{op.role}]
                  </span>
                  <span className="text-terminalMuted">{formatDateTime(op.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
