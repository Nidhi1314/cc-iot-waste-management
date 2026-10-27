
import { useMemo, useState } from 'react';
import type { SmartBin } from '../../types/api';
import { formatDateTime } from '../../lib/utils';

import { GeneratorForm } from './generator-form';
import type { GeneratorPayload } from '../../features/bins/api';


type Props = {
  bins: SmartBin[];
  onCreate: (data: GeneratorPayload) => Promise<void>;
  onUpdate: (
    id: string,
    data: GeneratorPayload,
  ) => Promise<void>;
  isSaving: boolean;
};


type FilterType =
  | 'ALL'
  | 'RESTAURANT'
  | 'HOTEL'
  | 'CANTEEN'
  | 'VEGETABLE_MARKET';

type SortKey = 'name' | 'fill' | 'daily' | 'updated';

const generatorLabels: Record<string, string> = {
  RESTAURANT: 'Restaurant',
  HOTEL: 'Hotel',
  CANTEEN: 'Canteen',
  VEGETABLE_MARKET: 'Vegetable Market',
};

const wasteLabels: Record<string, string> = {
  VEG_SCRAPS: 'Vegetable Scraps',
  COOKED_FOOD: 'Cooked Food',
  MIXED_ORGANIC: 'Mixed Organic',
};

function WasteBadge({ category }: { category: string | null }) {
  const colors: Record<string, string> = {
    VEG_SCRAPS: 'bg-green-100 text-green-800',
    COOKED_FOOD: 'bg-orange-100 text-orange-800',
    MIXED_ORGANIC: 'bg-purple-100 text-purple-800',
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        colors[category ?? ''] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {wasteLabels[category ?? ''] ?? 'Not classified'}
    </span>
  );
}

function FillBar({ bin }: { bin: SmartBin }) {
  const pct = bin.currentFillLevel;
  const critical = bin.needsCollection;

  const color = critical
    ? 'bg-amber-500'
    : pct >= 50
      ? 'bg-blue-400'
      : 'bg-emerald-500';

  return (
    <div className="flex min-w-32 items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold">
        {pct}%
      </span>
    </div>
  );
}


export function BinsTab({
  bins,
  onCreate,
  onUpdate,
  isSaving,
}: Props) {
  const [editingGenerator, setEditingGenerator] =
    useState<SmartBin | null>(null);

  const [showForm, setShowForm] = useState(false);

  const handleSaveGenerator = async (
    data: GeneratorPayload,
  ) => {
    if (editingGenerator) {
      await onUpdate(editingGenerator.id, data);
    } else {
      await onCreate(data);
    }

    setShowForm(false);
    setEditingGenerator(null);
  };

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [descending, setDescending] = useState(false);

  const totalDailyKg = bins.reduce(
    (sum, bin) => sum + (bin.estDailyKg ?? 0),
    0,
  );

  const criticalCount = bins.filter(
    (bin) => bin.needsCollection,
  ).length;

  const feedEligibleCount = bins.filter(
    (bin) => bin.wasteCategory === 'VEG_SCRAPS',
  ).length;

  const filteredBins = useMemo(() => {
    const query = search.toLowerCase().trim();

    const results = bins.filter((bin) => {
      const matchesSearch =
        (bin.generatorName ?? '').toLowerCase().includes(query) ||
        bin.address.toLowerCase().includes(query);

      const matchesType =
        filterType === 'ALL' ||
        bin.generatorType === filterType;

      return matchesSearch && matchesType;
    });

    results.sort((a, b) => {
      let comparison = 0;

      if (sortKey === 'name') {
        comparison = (a.generatorName ?? a.address)
          .localeCompare(b.generatorName ?? b.address);
      }

      if (sortKey === 'fill') {
        comparison = a.currentFillLevel - b.currentFillLevel;
      }

      if (sortKey === 'daily') {
        comparison = (a.estDailyKg ?? 0) - (b.estDailyKg ?? 0);
      }

      if (sortKey === 'updated') {
        comparison =
          new Date(a.lastUpdated).getTime() -
          new Date(b.lastUpdated).getTime();
      }

      return descending ? -comparison : comparison;
    });

    return results;
  }, [bins, search, filterType, sortKey, descending]);

  const changeSort = (key: SortKey) => {
    if (sortKey === key) {
      setDescending((value) => !value);
    } else {
      setSortKey(key);
      setDescending(key !== 'name');
    }
  };

  const filters: FilterType[] = [
    'ALL',
    'RESTAURANT',
    'HOTEL',
    'CANTEEN',
    'VEGETABLE_MARKET',
  ];

  return (
    <div className="t-scroll h-full overflow-auto p-6">
      <div className="space-y-6">

        {/* Heading */}
        <div>

<button
  type="button"
  onClick={() => {
    setEditingGenerator(null);
    setShowForm(true);
  }}
  className="mb-4 rounded-full bg-terminalAccent px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
>
  + Add Generator
</button>

          <h1 className="text-2xl font-bold text-terminalText">
            Organic Waste Generators
          </h1>
          <p className="mt-1 text-sm text-terminalMuted">
            Monitor organic waste production and collection
            requirements across Delhi NCR.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: 'Total Generators',
              value: bins.length,
              sub: 'Registered pickup points',
            },
            {
              label: 'Estimated Daily Waste',
              value: `${totalDailyKg.toLocaleString()} kg`,
              sub: 'Combined daily estimate',
            },
            {
              label: 'Need Collection',
              value: criticalCount,
              sub: 'Currently flagged',
            },
            {
              label: 'Vegetable Scrap Sources',
              value: feedEligibleCount,
              sub: 'Potential feed stream',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-terminalBorder bg-terminalPanel p-5 shadow-sm"
            >
              <p className="text-xs font-semibold text-terminalMuted">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-terminalAccent">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-terminalMuted">
                {item.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-terminalBorder bg-terminalPanel p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search generators or locations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-56 flex-1 rounded-xl border border-terminalBorder bg-white px-4 py-2.5 text-sm text-terminalText outline-none focus:border-terminalAccent"
            />

            <select
              value={filterType}
              onChange={(event) =>
                setFilterType(event.target.value as FilterType)
              }
              className="rounded-xl border border-terminalBorder bg-white px-4 py-2.5 text-sm text-terminalText"
            >
              {filters.map((type) => (
                <option key={type} value={type}>
                  {type === 'ALL'
                    ? 'All Generator Types'
                    : generatorLabels[type]}
                </option>
              ))}
            </select>

            <span className="text-xs text-terminalMuted">
              {filteredBins.length} records
            </span>
          </div>
        </div>


        {showForm && (
  <GeneratorForm
    key={editingGenerator?.id ?? 'new'}
    generator={editingGenerator}
    isSaving={isSaving}
    onSave={handleSaveGenerator}
    onCancel={() => {
      setShowForm(false);
      setEditingGenerator(null);
    }}
  />
)}


        {/* Generator table */}
        <div className="overflow-hidden rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
          <div className="flex items-center justify-between border-b border-terminalBorder px-5 py-4">
            <h2 className="font-bold text-terminalText">
              Registered Generators
            </h2>
            <span className="text-xs text-terminalMuted">
              Delhi NCR
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-terminalPanel2">
                <tr>
                <th className="px-4 py-3 text-xs font-semibold text-terminalMuted">
  Actions
</th>
                  <th
                    className="cursor-pointer px-4 py-3 text-xs font-semibold text-terminalMuted"
                    onClick={() => changeSort('name')}
                  >
                    Generator ↕
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-terminalMuted">
                    Type
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-terminalMuted">
                    Waste Category
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-xs font-semibold text-terminalMuted"
                    onClick={() => changeSort('daily')}
                  >
                    Daily Waste ↕
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-xs font-semibold text-terminalMuted"
                    onClick={() => changeSort('fill')}
                  >
                    Fill Level ↕
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-terminalMuted">
                    Pickup Window
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-terminalMuted">
                    Collection
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-xs font-semibold text-terminalMuted"
                    onClick={() => changeSort('updated')}
                  >
                    Last Updated ↕
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredBins.map((bin) => (
                  <tr
                    key={bin.id}
                    className="border-t border-terminalBorder/60 hover:bg-blue-50/50"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-terminalText">
                        {bin.generatorName ?? 'Unnamed Generator'}
                      </p>
                      <p className="mt-1 text-xs text-terminalMuted">
                        {bin.address}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-xs font-medium text-terminalText">
                        {generatorLabels[bin.generatorType ?? ''] ?? 'Unknown'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <WasteBadge category={bin.wasteCategory} />
                    </td>

                    <td className="px-4 py-4 font-semibold text-terminalText">
                      {bin.estDailyKg ?? '—'}
                      {bin.estDailyKg !== null ? ' kg' : ''}
                    </td>

                    <td className="px-4 py-4">
                      <FillBar bin={bin} />
                    </td>

                    <td className="px-4 py-4 text-xs text-terminalText">
                      {bin.pickupWindowStart && bin.pickupWindowEnd
                        ? `${bin.pickupWindowStart} – ${bin.pickupWindowEnd}`
                        : 'Not scheduled'}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          bin.needsCollection
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {bin.needsCollection ? 'Needs pickup' : 'Normal'}
                      </span>

                      {bin.status !== 'ACTIVE' && (
                        <p className="mt-1 text-xs text-red-600">
                          {bin.status.replaceAll('_', ' ')}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 text-xs text-terminalMuted">
                      {formatDateTime(bin.lastUpdated)}
                    </td>


<td className="px-4 py-4">
  <button
    type="button"
    onClick={() => {
      setEditingGenerator(bin);
      setShowForm(true);
    }}
    className="rounded-full border border-terminalAccent px-4 py-1.5 text-xs font-semibold text-terminalAccent hover:bg-blue-50"
  >
    Edit
  </button>
</td>

                  </tr>
                ))}
              </tbody>
            </table>

            {filteredBins.length === 0 && (
              <div className="p-8 text-center text-terminalMuted">
                No generators match your filters.
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-terminalMuted">
          Demo information: Daily waste quantities are
          estimates. Vegetable scraps are only potentially
          feed-eligible and require contamination and
          regulatory checks before livestock use.
        </p>
      </div>
    </div>
  );
}
