import type { VehiclePublic } from '../../types/api';
import { formatDateTime } from '../../lib/utils';

type Props = { operatorAccounts: VehiclePublic[] };

export function OperatorsTab({ operatorAccounts }: Props) {
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      <div className="border-b border-terminalBorder bg-terminalPanel px-5 py-4 text-sm font-semibold text-terminalText">
        Operator accounts <span className="ml-2 text-xs font-normal text-terminalMuted">{operatorAccounts.length} records</span>
      </div>

      <div className="t-scroll flex-1 overflow-auto">
        <table className="min-w-[680px] w-full text-left text-sm">
          <thead className="sticky top-0 bg-terminalPanel2">
            <tr className="border-b border-terminalBorder">
              <th className="px-4 py-3 text-xs font-semibold text-terminalMuted">User code</th>
              <th className="px-4 py-3 text-xs font-semibold text-terminalMuted">Role</th>
              <th className="px-4 py-3 text-xs font-semibold text-terminalMuted">Max capacity</th>
              <th className="px-4 py-3 text-xs font-semibold text-terminalMuted">Created at</th>
              <th className="px-4 py-3 text-xs font-semibold text-terminalMuted">ID</th>
            </tr>
          </thead>
          <tbody>
            {operatorAccounts.map((op) => (
              <tr key={op.id} className="border-b border-terminalBorder/50 hover:bg-blue-50/70">
                <td className="px-4 py-3 font-semibold text-terminalText">{op.userCode}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    op.role === 'ADMIN'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {op.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-terminalText">{op.maxCapacityKg} kg</td>
                <td className="px-4 py-3 font-mono text-xs text-terminalMuted">{formatDateTime(op.createdAt)}</td>
                <td className="px-4 py-3 font-mono text-xs text-terminalMuted">{op.id.slice(0, 16)}…</td>
              </tr>
            ))}
          </tbody>
        </table>

        {operatorAccounts.length === 0 && (
          <div className="p-8 text-center text-terminalMuted">
            No operator accounts found.
          </div>
        )}
      </div>
    </div>
  );
}
