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
      className="cursor-pointer select-none px-3 py-2 text-left text-[10px] uppercase tracking-wider text-terminalMuted hover:text-terminalAccent"
      onClick={() => onSort(k)}
    >
      {label} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </th>
  );
}

function AsciiBar({ pct }: { pct: number }) {
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  const color = pct >= 75 ? 'text-terminalWarn' : pct >= 50 ? 'text-yellow-500' : 'text-terminalAccent';
  return (
    <span className={`font-mono text-xs ${color}`}>
      [{'█'.repeat(filled)}{'░'.repeat(empty)}] {String(pct).padStart(3, ' ')}%
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
    <div className="flex h-[calc(100vh-56px)] flex-col font-mono">
      <div className="flex flex-wrap items-center gap-3 border-b border-terminalBorder bg-terminalPanel2 p-4">
        <div className="flex items-center gap-2 rounded border border-terminalBorder bg-terminal px-3 py-1.5 text-xs">
          <span className="text-terminalAccent">{'>'}</span>
          <input
            className="bg-transparent text-terminalText placeholder-terminalMuted focus:outline-none"
            placeholder="search address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(['ALL', 'ACTIVE', 'CRITICAL', 'DAMAGED'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              className={`rounded border px-2 py-1 text-[10px] font-bold transition-colors ${
                filterStatus === s
                  ? 'border-terminalAccent bg-terminalAccent/10 text-terminalAccent'
                  : 'border-terminalBorder text-terminalMuted hover:border-terminalAccent'
              }`}
              onClick={() => setFilterStatus(s)}
              type="button"
            >
              [{s}]
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-terminalMuted">{filtered.length} / {bins.length} records</span>
      </div>

      <div className="t-scroll flex-1 overflow-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 bg-terminalPanel2">
            <tr className="border-b border-terminalBorder">
              <SortHeader k="address" label="ADDRESS" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader k="status" label="STATUS" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader k="fill" label="FILL_LEVEL" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-terminalMuted">NEEDS_COLL</th>
              <SortHeader k="updated" label="LAST_UPDATED" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((bin) => (
              <tr key={bin.id} className="border-b border-terminalBorder/50 hover:bg-terminalPanel2/60">
                <td className="px-3 py-2 text-terminalText">{bin.address}</td>
                <td className="px-3 py-2">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                    bin.status === 'ACTIVE'
                      ? 'border-terminalAccent text-terminalAccent'
                      : bin.status === 'DAMAGED'
                      ? 'border-terminalDanger text-terminalDanger'
                      : 'border-terminalWarn text-terminalWarn'
                  }`}>
                    [{bin.status}]
                  </span>
                </td>
                <td className="px-3 py-2"><AsciiBar pct={bin.currentFillLevel} /></td>
                <td className="px-3 py-2">
                  <span className={bin.needsCollection ? 'text-terminalWarn' : 'text-terminalMuted'}>
                    {bin.needsCollection ? '[YES]' : '[NO]'}
                  </span>
                </td>
                <td className="px-3 py-2 text-terminalMuted">{formatDateTime(bin.lastUpdated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-terminalMuted">
            {'// no results matching filter'}
          </div>
        )}
      </div>
    </div>
  );
}
