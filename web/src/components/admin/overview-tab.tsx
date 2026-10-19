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
    <div className="rounded-lg border border-terminalBorder bg-terminalPanel p-4 font-mono">
      <p className="text-[10px] uppercase tracking-widest text-terminalMuted">{label}</p>
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
    <div className="space-y-6 p-6 font-mono">
      <div className="text-xs text-terminalMuted">
        <span className="text-terminalAccent">{'> '}</span>
        SYSTEM STATUS:{' '}
        <span className={criticalBins.length > 0 ? 'text-terminalWarn' : 'text-terminalAccent'}>
          {criticalBins.length > 0 ? 'ATTENTION_REQUIRED' : 'NOMINAL'}
        </span>
        {' '}|{' '}
        BINS: <span className="text-terminalText">{bins.length}</span>
        {' '}|{' '}
        CRITICAL: <span className={criticalBins.length > 0 ? 'text-terminalWarn' : 'text-terminalText'}>{criticalBins.length}</span>
        {' '}|{' '}
        ROUTES: <span className="text-terminalText">{activeRoutes.length}</span>
        <span className="cursor-blink text-terminalAccent"> _</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBlock label="TOTAL_BINS" value={bins.length} sub="units registered" />
        <StatBlock label="CRITICAL_BINS" value={criticalBins.length} sub="fill ≥ 75%" accent={criticalBins.length > 0} />
        <StatBlock label="ACTIVE_ROUTES" value={activeRoutes.length} sub="in progress" />
        <StatBlock label="OPERATORS" value={operatorAccounts.length} sub="accounts" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-terminalBorder bg-terminalPanel">
          <div className="t-panel-header flex items-center justify-between">
            <span>{'┌─'} CRITICAL_BINS {'─┐'}</span>
            <span className="text-terminalWarn">{criticalBins.length} flagged</span>
          </div>
          <div className="t-scroll max-h-48 overflow-auto p-3 text-xs">
            {criticalBins.length === 0 ? (
              <p className="text-terminalMuted">{'// no critical bins'}</p>
            ) : (
              criticalBins.slice(0, 8).map((bin) => (
                <div key={bin.id} className="flex items-center justify-between border-b border-terminalBorder py-1.5 last:border-0">
                  <span className="truncate text-terminalText">{bin.address}</span>
                  <span className="ml-3 shrink-0 text-terminalWarn">{bin.currentFillLevel}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-terminalBorder bg-terminalPanel">
          <div className="t-panel-header flex items-center justify-between">
            <span>{'┌─'} RECENT_ROUTES {'─┐'}</span>
            <span className="text-terminalMuted">{routes.length} total</span>
          </div>
          <div className="t-scroll max-h-48 overflow-auto p-3 text-xs">
            {routes.length === 0 ? (
              <p className="text-terminalMuted">{'// no routes generated'}</p>
            ) : (
              routes.slice(0, 8).map((route) => (
                <div key={route.id} className="flex items-center justify-between border-b border-terminalBorder py-1.5 last:border-0">
                  <span className="font-mono text-terminalText">RTE_{route.id.slice(0, 8).toUpperCase()}</span>
                  <span className={route.isCompleted ? 'text-terminalAccent' : 'text-terminalWarn'}>
                    [{route.isCompleted ? 'DONE' : 'ACTIVE'}]
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {damagedBins.length > 0 && (
        <div className="rounded-lg border border-terminalDanger bg-terminalDanger/5 p-3 font-mono text-xs">
          <p className="text-terminalDanger">[WARN] {damagedBins.length} bin(s) with DAMAGED or OUT_OF_SERVICE status:</p>
          <ul className="mt-2 space-y-1 text-terminalMuted">
            {damagedBins.map((b) => (
              <li key={b.id}>{'  > '}<span className="text-terminalText">{b.address}</span> [{b.status}]</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-terminalBorder bg-terminalPanel">
        <div className="t-panel-header">{'┌─'} OPERATOR_ACCOUNTS {'─┐'}</div>
        <div className="t-scroll max-h-40 overflow-auto p-3 text-xs">
          {operatorAccounts.length === 0 ? (
            <p className="text-terminalMuted">{'// no operators'}</p>
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
