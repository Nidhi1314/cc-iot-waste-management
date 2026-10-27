import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Building2,
  AlertTriangle,
  Leaf,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
} from 'lucide-react';
import type { SmartBin } from '../../types/api';
import { formatDateTime } from '../../lib/utils';
import { GeneratorForm } from './generator-form';
import type { GeneratorPayload } from '../../features/bins/api';

type Props = {
  bins: SmartBin[];
  onCreate: (data: GeneratorPayload) => Promise<void>;
  onUpdate: (id: string, data: GeneratorPayload) => Promise<void>;
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
  const styles: Record<string, string> = {
    VEG_SCRAPS: 'bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7]',
    COOKED_FOOD: 'bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7]',
    MIXED_ORGANIC: 'bg-[#FAF5FF] text-[#7E22CE] border border-[#F3E8FF]',
  };

  return (
    <span
      className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold ${
        styles[category ?? ''] ?? 'bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]'
      }`}
    >
      {wasteLabels[category ?? ''] ?? 'Not classified'}
    </span>
  );
}

function FillBar({ bin }: { bin: SmartBin }) {
  const pct = bin.currentFillLevel;
  const critical = bin.needsCollection || pct >= 75;

  const color = critical
    ? 'bg-[#DC2626]'
    : pct >= 50
    ? 'bg-[#D97706]'
    : 'bg-[#2D6A4F]';

  return (
    <div className="flex min-w-[130px] items-center gap-2.5">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs font-bold text-[#0F172A]">
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
  const [editingGenerator, setEditingGenerator] = useState<SmartBin | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSaveGenerator = async (data: GeneratorPayload) => {
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

  const criticalCount = bins.filter((bin) => bin.needsCollection).length;

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
        filterType === 'ALL' || bin.generatorType === filterType;

      return matchesSearch && matchesType;
    });

    results.sort((a, b) => {
      let comparison = 0;

      if (sortKey === 'name') {
        comparison = (a.generatorName ?? a.address).localeCompare(
          b.generatorName ?? b.address,
        );
      }

      if (sortKey === 'fill') {
        comparison = a.currentFillLevel - b.currentFillLevel;
      }

      if (sortKey === 'daily') {
        comparison = (a.estDailyKg ?? 0) - (b.estDailyKg ?? 0);
      }

      if (sortKey === 'updated') {
        comparison =
          new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
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
    <div className="flex h-full flex-col gap-5 overflow-auto p-6 max-w-7xl mx-auto bg-[#F8FAF6] text-[#0F172A]">
      {/* Top Banner & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
            Organic Waste Generators
          </h1>
          <p className="text-xs text-[#475569]">
            Delhi NCR decentralized organic nodes, categories, and collection windows
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingGenerator(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white hover:bg-[#143527] transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Generator</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Generators</span>
            <Building2 className="h-4 w-4 text-[#2D6A4F]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F172A]">{bins.length}</p>
          <p className="text-[11px] text-[#475569]">Delhi NCR Active Network</p>
        </div>

        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Estimated Daily Waste</span>
            <Leaf className="h-4 w-4 text-[#2D6A4F]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#1B4332]">{totalDailyKg} kg</p>
          <p className="text-[11px] text-[#475569]">Projected aggregate volume</p>
        </div>

        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Pickup</span>
            <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#DC2626]">{criticalCount}</p>
          <p className="text-[11px] text-[#475569]">Requires collection dispatch</p>
        </div>

        <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Feed Eligible</span>
            <Leaf className="h-4 w-4 text-[#166534]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#166534]">{feedEligibleCount}</p>
          <p className="text-[11px] text-[#475569]">Veg scraps diversion pipeline</p>
        </div>
      </div>

      {/* Form Drawer / Modal */}
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

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3.5 shadow-sm">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <Search className="h-4 w-4 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search by generator name or Delhi address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-[#0F172A] placeholder-[#94A3B8] outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[#64748B]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="rounded-md border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs text-[#0F172A] focus:border-[#2D6A4F] focus:outline-none"
            >
              {filters.map((type) => (
                <option key={type} value={type}>
                  {type === 'ALL' ? 'All Generator Types' : generatorLabels[type]}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-[#64748B] font-mono">
            {filteredBins.length} records
          </span>
        </div>
      </div>

      {/* Generator Table */}
      <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3 bg-[#F8FAFC]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
            Registered Generators (Delhi NCR)
          </h2>
          <span className="text-[11px] text-[#64748B]">Live Grid Data</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569]">
              <tr>
                <th
                  className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-[#0F172A]"
                  onClick={() => changeSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>Generator / Location</span>
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Waste Category</th>
                <th
                  className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-[#0F172A]"
                  onClick={() => changeSort('daily')}
                >
                  <div className="flex items-center gap-1">
                    <span>Est. Daily</span>
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </th>
                <th
                  className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-[#0F172A]"
                  onClick={() => changeSort('fill')}
                >
                  <div className="flex items-center gap-1">
                    <span>Fill Level</span>
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </th>
                <th className="px-4 py-3 font-semibold">Pickup Window</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th
                  className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-[#0F172A]"
                  onClick={() => changeSort('updated')}
                >
                  <div className="flex items-center gap-1">
                    <span>Updated</span>
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredBins.map((bin) => (
                <tr key={bin.id} className="hover:bg-[#F8FAF6] transition">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#0F172A]">
                      {bin.generatorName ?? 'Unnamed Generator'}
                    </p>
                    <p className="text-[11px] text-[#64748B]">{bin.address}</p>
                  </td>

                  <td className="px-4 py-3 font-medium text-[#475569]">
                    {generatorLabels[bin.generatorType ?? ''] ?? 'Unknown'}
                  </td>

                  <td className="px-4 py-3">
                    <WasteBadge category={bin.wasteCategory} />
                  </td>

                  <td className="px-4 py-3 font-bold text-[#0F172A]">
                    {bin.estDailyKg !== null && bin.estDailyKg !== undefined
                      ? `${bin.estDailyKg} kg`
                      : '—'}
                  </td>

                  <td className="px-4 py-3">
                    <FillBar bin={bin} />
                  </td>

                  <td className="px-4 py-3 text-[#475569]">
                    {bin.pickupWindowStart && bin.pickupWindowEnd
                      ? `${bin.pickupWindowStart} – ${bin.pickupWindowEnd}`
                      : 'Not scheduled'}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        bin.needsCollection
                          ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]'
                          : 'bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7]'
                      }`}
                    >
                      {bin.needsCollection ? 'PICKUP REQUIRED' : 'NORMAL'}
                    </span>
                    {bin.status !== 'ACTIVE' && (
                      <p className="mt-0.5 text-[10px] text-[#EA580C]">
                        {bin.status.replaceAll('_', ' ')}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-[#64748B] text-[11px]">
                    {formatDateTime(bin.lastUpdated)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGenerator(bin);
                        setShowForm(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#475569] hover:border-[#1B4332] hover:text-[#1B4332] transition"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredBins.length === 0 && (
            <div className="p-8 text-center text-xs text-[#64748B]">
              No organic generators match your filter criteria.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-[11px] text-[#64748B]">
        <strong>Operational Notice:</strong> Daily waste quantities are estimates calibrated for Delhi NCR sectors. Vegetable scraps require contamination and regulatory clearance before distribution to authorized livestock feed hubs.
      </div>
    </div>
  );
}
