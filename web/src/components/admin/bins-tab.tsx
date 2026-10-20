import { useMemo, useState } from 'react';
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
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold text-terminalMuted hover:text-terminalAccent"
      onClick={() => onSort(k)}
    >
      {label} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </th>
  );
}

function AsciiBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? 'bg-amber-500' : pct >= 50 ? 'bg-blue-400' : 'bg-terminalAccent';
  return (
    <span className="flex min-w-32 items-center gap-3">
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </span>
      <span className="w-10 text-right text-xs font-semibold text-terminalText">{pct}%</span>
    </span>
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
    else if (filterStatus === 'DAMAGED') result = result.filter((b) => b.status === 'DAMAGED' || b.status === 'OUT_OF_SERVICE');

    return [...result].sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'address') comparison = a.address.localeCompare(b.address);
      else if (sortKey === 'fill') comparison = a.currentFillLevel - b.currentFillLevel;
      else if (sortKey === 'status') comparison = a.status.localeCompare(b.status);
      else if (sortKey === 'updated') comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [bins, search, filterStatus, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-terminalBorder bg-terminalPanel px-5 py-4">
        <div className="flex items-center gap-2 rounded-xl border border-terminalBorder bg-terminalPanel2 px-3 py-2 text-sm">
          <input
            className="bg-transparent text-terminalText placeholder-terminalMuted focus:outline-none"
            placeholder="Search address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(['ALL', 'ACTIVE', 'CRITICAL', 'DAMAGED'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterStatus === s
                  ? 'border-terminalAccent bg-terminalAccent text-white'
                  : 'border-terminalBorder bg-white text-terminalMuted hover:border-terminalAccent'
              }`}
              onClick={() => setFilterStatus(s)}
              type="button"
            >
              {s === 'ALL' ? 'All' : s === 'ACTIVE' ? 'Active' : s === 'CRITICAL' ? 'Critical' : 'Damaged'}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-terminalMuted">{filtered.length} / {bins.length} records</span>
      </div>

      <div className="t-scroll flex-1 overflow-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="sticky top-0 bg-terminalPanel2">
            <tr className="border-b border-terminalBorder">
              <SortHeader k="address" label="Address" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader k="status" label="Status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader k="fill" label="Fill level" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-3 text-xs font-semibold text-terminalMuted">Needs collection</th>
              <SortHeader k="updated" label="Last updated" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((bin) => (
              <tr key={bin.id} className="border-b border-terminalBorder/50 hover:bg-blue-50/70">
                <td className="px-4 py-3 text-terminalText">{bin.address}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    bin.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : bin.status === 'DAMAGED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {bin.status.replaceAll('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3"><AsciiBar pct={bin.currentFillLevel} /></td>
                <td className="px-4 py-3">
                  <span className={bin.needsCollection ? 'rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800' : 'text-terminalMuted'}>
                    {bin.needsCollection ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-terminalMuted">{formatDateTime(bin.lastUpdated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-terminalMuted">
            No bins match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
