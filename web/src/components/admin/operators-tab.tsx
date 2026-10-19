import type { VehiclePublic } from '../../types/api';
import { formatDateTime } from '../../lib/utils';

type Props = { operatorAccounts: VehiclePublic[] };

export function OperatorsTab({ operatorAccounts }: Props) {
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col font-mono">
      <div className="border-b border-terminalBorder bg-terminalPanel2 px-5 py-3 text-[10px] uppercase tracking-widest text-terminalMuted">
        {'┌─'} OPERATOR_ACCOUNTS {'─┐'} — {operatorAccounts.length} records
      </div>

      <div className="t-scroll flex-1 overflow-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 bg-terminalPanel2">
            <tr className="border-b border-terminalBorder">
              <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-terminalMuted">USER_CODE</th>
              <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-terminalMuted">ROLE</th>
              <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-terminalMuted">MAX_CAPACITY</th>
              <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-terminalMuted">CREATED_AT</th>
              <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-terminalMuted">ID</th>
            </tr>
          </thead>
          <tbody>
            {operatorAccounts.map((op) => (
              <tr key={op.id} className="border-b border-terminalBorder/50 hover:bg-terminalPanel2/60">
                <td className="px-4 py-2.5 font-bold text-terminalText">{op.userCode}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                    op.role === 'ADMIN'
                      ? 'border-terminalAccent2 text-terminalAccent2'
                      : 'border-terminalAccent text-terminalAccent'
                  }`}>
                    [{op.role}]
                  </span>
                </td>
                <td className="px-4 py-2.5 text-terminalText">{op.maxCapacityKg} kg</td>
                <td className="px-4 py-2.5 text-terminalMuted">{formatDateTime(op.createdAt)}</td>
                <td className="px-4 py-2.5 text-[11px] text-terminalMuted">{op.id.slice(0, 16)}…</td>
              </tr>
            ))}
          </tbody>
        </table>

        {operatorAccounts.length === 0 && (
          <div className="p-8 text-center text-terminalMuted">
            {'// no operator accounts found'}
          </div>
        )}
      </div>
    </div>
  );
}
