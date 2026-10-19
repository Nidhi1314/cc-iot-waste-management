import type { VehiclePublic } from '../../../types/api';
import { formatDateTime } from '../../../lib/utils';

type Props = {
  operatorAccounts: VehiclePublic[];
};

export function OperatorAccountsTable({ operatorAccounts }: Props) {
  return (
    <div className="overflow-auto rounded-lg border border-line bg-panel">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-panel2 text-xs uppercase text-soft">
          <tr>
            <th className="px-3 py-2">User Code</th>
            <th className="px-3 py-2">Role</th>
            <th className="px-3 py-2">Max Capacity (kg)</th>
            <th className="px-3 py-2">Created At</th>
          </tr>
        </thead>
        <tbody>
          {operatorAccounts.map((account) => (
            <tr className="border-t border-line" key={account.id}>
              <td className="px-3 py-2 font-medium text-muted">
                {account.userCode}
              </td>
              <td className="px-3 py-2">{account.role}</td>
              <td className="px-3 py-2">{account.maxCapacityKg}</td>
              <td className="px-3 py-2 text-xs text-soft">
                {formatDateTime(account.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
