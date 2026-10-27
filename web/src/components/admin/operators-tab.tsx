import { Users, Truck, ShieldCheck } from 'lucide-react';
import type { VehiclePublic } from '../../types/api';
import { formatDateTime } from '../../lib/utils';

type Props = { operatorAccounts: VehiclePublic[] };

export function OperatorsTab({ operatorAccounts }: Props) {
  return (
    <div className="flex h-full flex-col bg-[#F8FAF6] text-[#0F172A]">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-3.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F0FDF4] border border-[#DCFCE7] text-[#1B4332]">
            <Users className="h-4 w-4 text-[#2D6A4F]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
              Fleet Operator Registry
            </h2>
            <p className="text-xs text-[#475569]">Credentialed units & field collection vehicles</p>
          </div>
        </div>
        <span className="text-xs text-[#64748B]">
          <strong className="text-[#0F172A]">{operatorAccounts.length}</strong> Authorized Units
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="min-w-[700px] w-full text-left text-xs bg-white">
          <thead className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <tr>
              <th className="px-5 py-3 text-[#475569] font-semibold">User Code / Call Sign</th>
              <th className="px-5 py-3 text-[#475569] font-semibold">System Role</th>
              <th className="px-5 py-3 text-[#475569] font-semibold">Vehicle Payload Capacity</th>
              <th className="px-5 py-3 text-[#475569] font-semibold">Registration Date</th>
              <th className="px-5 py-3 text-[#475569] font-semibold">System UUID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {operatorAccounts.map((op) => (
              <tr key={op.id} className="transition hover:bg-[#F8FAFC]">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F0FDF4] text-[#1B4332]">
                      {op.role === 'ADMIN' ? (
                        <ShieldCheck className="h-4 w-4 text-[#1B4332]" />
                      ) : (
                        <Truck className="h-4 w-4 text-[#2D6A4F]" />
                      )}
                    </div>
                    <span className="font-bold text-[#0F172A]">{op.userCode}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                      op.role === 'ADMIN'
                        ? 'bg-[#F0FDF4] text-[#1B4332] border-[#DCFCE7]'
                        : 'bg-[#F0FDF4] text-[#166534] border-[#DCFCE7]'
                    }`}
                  >
                    {op.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-[#0F172A] font-semibold">
                  {op.maxCapacityKg} kg
                </td>
                <td className="px-5 py-3 text-[#475569] text-[11px]">
                  {formatDateTime(op.createdAt)}
                </td>
                <td className="px-5 py-3 font-mono text-[#64748B] text-[11px]">
                  {op.id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {operatorAccounts.length === 0 && (
          <div className="p-12 text-center text-[#64748B]">
            No operator accounts registered.
          </div>
        )}
      </div>
    </div>
  );
}
