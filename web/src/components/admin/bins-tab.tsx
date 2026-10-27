import { useMemo, useState } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import type { SmartBin } from '../../types/api';
import { formatDateTime } from '../../lib/utils';

type Props = { bins: SmartBin[] };
type SortKey = 'address' | 'fill' | 'status' | 'updated';
type SortDir = 'asc' | 'desc';
type FilterStatus = 'ALL' | 'ACTIVE' | 'CRITICAL' | 'DAMAGED';

function SortHeader({
  k,
  label,
  sortKey,
  sortDir,
  onSort,
}: {
  k: SortKey;
  label: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isSorted = sortKey === k;
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold text-[#475569] hover:text-[#0F172A] transition"
      onClick={() => onSort(k)}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        {isSorted ? (
          sortDir === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-[#1B4332]" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-[#1B4332]" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </div>
    </th>
  );
}

function FillIndicator({ pct }: { pct: number }) {
  const isCritical = pct >= 80;
  const isWarning = pct >= 60 && pct < 80;

  return (
    <div className="flex min-w-[140px] items-center gap-2.5">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isCritical
              ? 'bg-[#DC2626]'
              : isWarning
              ? 'bg-[#D97706]'
              : 'bg-[#2D6A4F]'
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span
        className={`w-10 text-right font-mono text-xs font-bold ${
          isCritical ? 'text-[#DC2626]' : isWarning ? 'text-[#D97706]' : 'text-[#2D6A4F]'
        }`}
      >
        {pct}%
      </span>
    </div>
  );
}

export function BinsTab({ bins }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('fill');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    let result = bins;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) => b.address.toLowerCase().includes(q));
    }
    if (filterStatus === 'CRITICAL') result = result.filter((b) => b.currentFillLevel >= 75);
    else if (filterStatus === 'ACTIVE') result = result.filter((b) => b.status === 'ACTIVE');
    else if (filterStatus === 'DAMAGED')
      result = result.filter((b) => b.status === 'DAMAGED' || b.status === 'OUT_OF_SERVICE');

    return [...result].sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'address') comparison = a.address.localeCompare(b.address);
      else if (sortKey === 'fill') comparison = a.currentFillLevel - b.currentFillLevel;
      else if (sortKey === 'status') comparison = a.status.localeCompare(b.status);
      else if (sortKey === 'updated')
        comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [bins, search, filterStatus, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#F8FAF6] text-[#0F172A]">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-6 py-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs focus-within:border-[#2D6A4F]">
            <Search className="h-4 w-4 text-[#94A3B8]" />
            <input
              className="w-48 sm:w-64 bg-transparent text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
              placeholder="Search address or container ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-1">
            {(['ALL', 'ACTIVE', 'CRITICAL', 'DAMAGED'] as FilterStatus[]).map((s) => (
              <button
                key={s}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                  filterStatus === s
                    ? 'border-[#2D6A4F] bg-[#F0FDF4] text-[#1B4332]'
                    : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'
                }`}
                onClick={() => setFilterStatus(s)}
                type="button"
              >
                {s === 'ALL'
                  ? 'All Bins'
                  : s === 'ACTIVE'
                  ? 'Nominal'
                  : s === 'CRITICAL'
                  ? 'Critical (≥75%)'
                  : 'Damaged'}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs text-[#64748B]">
          Showing <strong className="text-[#0F172A]">{filtered.length}</strong> of {bins.length} containers
        </span>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-[800px] w-full text-left text-xs bg-white">
          <thead className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <tr>
              <SortHeader k="address" label="Address & Coordinates" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader k="status" label="Container Status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader k="fill" label="Fill Capacity" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-3 text-[#475569] font-semibold">Priority Flag</th>
              <th className="px-4 py-3 text-[#475569] font-semibold">Max Payload</th>
              <SortHeader k="updated" label="Last Telemetry Sync" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {filtered.map((bin) => (
              <tr key={bin.id} className="transition hover:bg-[#F8FAFC]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F0FDF4] text-[#2D6A4F]">
                      <Trash2 className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#0F172A]">{bin.address}</p>
                      <p className="font-mono text-[10px] text-[#64748B]">
                        LAT: {bin.latitude.toFixed(4)}, LNG: {bin.longitude.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      bin.status === 'ACTIVE'
                        ? 'bg-[#F0FDF4] text-[#166534] border-[#DCFCE7]'
                        : 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]'
                    }`}
                  >
                    {bin.status.replaceAll('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <FillIndicator pct={bin.currentFillLevel} />
                </td>
                <td className="px-4 py-3">
                  {bin.needsCollection || bin.currentFillLevel >= 75 ? (
                    <span className="rounded bg-[#FEF2F2] border border-[#FEE2E2] px-2 py-0.5 text-[10px] font-bold text-[#DC2626]">
                      URGENT
                    </span>
                  ) : (
                    <span className="text-[#64748B] text-[11px] font-medium">Standard</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-[#0F172A]">
                  {bin.maxCapacityKg} kg
                </td>
                <td className="px-4 py-3 text-[#475569] text-[11px]">
                  {formatDateTime(bin.lastUpdated)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-[#64748B]">
            No smart bins match your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
