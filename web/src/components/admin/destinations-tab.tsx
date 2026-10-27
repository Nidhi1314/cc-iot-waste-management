
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getDestinations,
  createDestination,
  updateDestination,
  type Destination,
  type DestinationPayload,
  type DestinationType,
  type WasteCategory,
} from '../../features/destinations/api';

const inputClass =
  'w-full rounded-xl border border-terminalBorder bg-white px-3 py-2 text-sm text-terminalText focus:border-terminalAccent focus:outline-none';

const labelClass =
  'mb-1 block text-xs font-semibold text-terminalMuted';

const categoryLabels: Record<WasteCategory, string> = {
  VEG_SCRAPS: 'Vegetable Scraps',
  COOKED_FOOD: 'Cooked Food',
  MIXED_ORGANIC: 'Mixed Organic',
};

const allCategories: WasteCategory[] = [
  'VEG_SCRAPS',
  'COOKED_FOOD',
  'MIXED_ORGANIC',
];

type FormState = {
  name: string;
  type: DestinationType;
  address: string;
  latitude: string;
  longitude: string;
  acceptedCategories: WasteCategory[];
  dailyCapacityKg: string;
  openFrom: string;
  openTo: string;
  active: boolean;
};

function makeForm(destination: Destination | null): FormState {
  return {
    name: destination?.name ?? '',
    type: destination?.type ?? 'BIOGAS',
    address: destination?.address ?? '',
    latitude: String(destination?.latitude ?? 28.6139),
    longitude: String(destination?.longitude ?? 77.209),
    acceptedCategories: destination
      ? [...destination.acceptedCategories]
      : ['VEG_SCRAPS', 'COOKED_FOOD', 'MIXED_ORGANIC'],
    dailyCapacityKg: String(destination?.dailyCapacityKg ?? 500),
    openFrom: destination?.openFrom ?? '08:00',
    openTo: destination?.openTo ?? '18:00',
    active: destination?.active ?? true,
  };
}

type FormProps = {
  destination: Destination | null;
  onSave: (payload: DestinationPayload) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
};

function DestinationForm({
  destination,
  onSave,
  onCancel,
  saving,
}: FormProps) {
  const [form, setForm] = useState<FormState>(
    () => makeForm(destination),
  );
  const [error, setError] = useState('');

  const setField = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError('');
  };

  const toggleCategory = (category: WasteCategory) => {
    setForm((previous) => ({
      ...previous,
      acceptedCategories: previous.acceptedCategories.includes(category)
        ? previous.acceptedCategories.filter((c) => c !== category)
        : [...previous.acceptedCategories, category],
    }));
  };

  const handleTypeChange = (type: DestinationType) => {
    setForm((previous) => ({
      ...previous,
      type,
      acceptedCategories:
        type === 'LIVESTOCK_FEED'
          ? ['VEG_SCRAPS']
          : previous.acceptedCategories,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const capacity = Number(form.dailyCapacityKg);

    if (!form.name.trim() || !form.address.trim()) {
      setError('Name and address are required.');
      return;
    }

    if (
      !form.latitude.trim() ||
      !form.longitude.trim() ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError('Enter valid latitude and longitude.');
      return;
    }

    if (
      !form.dailyCapacityKg.trim() ||
      !Number.isFinite(capacity) ||
      capacity <= 0
    ) {
      setError('Daily capacity must be greater than zero.');
      return;
    }

    if (form.acceptedCategories.length === 0) {
      setError('Select at least one accepted waste category.');
      return;
    }

    if (
      !form.openFrom ||
      !form.openTo ||
      form.openFrom >= form.openTo
    ) {
      setError('Closing time must be after opening time.');
      return;
    }

    const payload: DestinationPayload = {
      name: form.name.trim(),
      type: form.type,
      address: form.address.trim(),
      latitude,
      longitude,
      acceptedCategories: form.acceptedCategories,
      dailyCapacityKg: capacity,
      openFrom: form.openFrom,
      openTo: form.openTo,
      active: form.active,
    };

    try {
      await onSave(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save destination',
      );
    }
  };

  return (
    <div className="rounded-2xl border border-terminalBorder bg-terminalPanel p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-terminalText">
          {destination ? 'Edit Destination' : 'Add Destination'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-xl text-terminalMuted"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Facility Name *</label>
            <input
              required
              className={inputClass}
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Example Biogas Processing Unit"
            />
          </div>

          <div>
            <label className={labelClass}>Destination Type *</label>
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) =>
                handleTypeChange(e.target.value as DestinationType)
              }
            >
              <option value="BIOGAS">Biogas Plant</option>
              <option value="LIVESTOCK_FEED">Livestock Feed Hub</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Address *</label>
            <input
              required
              className={inputClass}
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Okhla, New Delhi"
            />
          </div>

          <div>
            <label className={labelClass}>Latitude *</label>
            <input
              required
              type="number"
              step="any"
              className={inputClass}
              value={form.latitude}
              onChange={(e) => setField('latitude', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Longitude *</label>
            <input
              required
              type="number"
              step="any"
              className={inputClass}
              value={form.longitude}
              onChange={(e) => setField('longitude', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Daily Capacity (kg) *</label>
            <input
              required
              type="number"
              min="0.01"
              step="any"
              className={inputClass}
              value={form.dailyCapacityKg}
              onChange={(e) =>
                setField('dailyCapacityKg', e.target.value)
              }
            />
          </div>

          <div>
            <label className={labelClass}>Facility Status</label>
            <select
              value={form.active ? 'active' : 'inactive'}
              onChange={(e) =>
                setField('active', e.target.value === 'active')
              }
              className={inputClass}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Opening Time *</label>
            <input
              required
              type="time"
              className={inputClass}
              value={form.openFrom}
              onChange={(e) => setField('openFrom', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Closing Time *</label>
            <input
              required
              type="time"
              className={inputClass}
              value={form.openTo}
              onChange={(e) => setField('openTo', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Accepted Waste Categories *</label>
          <div className="mt-2 flex flex-wrap gap-4">
            {allCategories.map((category) => {
              const disabled =
                form.type === 'LIVESTOCK_FEED' &&
                category !== 'VEG_SCRAPS';

              return (
                <label
                  key={category}
                  className="flex items-center gap-2 text-sm text-terminalText"
                >
                  <input
                    type="checkbox"
                    checked={form.acceptedCategories.includes(category)}
                    disabled={disabled}
                    onChange={() => toggleCategory(category)}
                    className="accent-blue-600"
                  />
                  {categoryLabels[category]}
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-terminalMuted">
            Livestock-feed hubs can only accept potentially
            feed-eligible vegetable scraps. Actual eligibility
            requires safety and contamination checks.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-terminalBorder pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="rounded-full border border-terminalBorder px-5 py-2 text-sm text-terminalMuted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-terminalAccent px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? 'Saving...'
              : destination
                ? 'Update Destination'
                : 'Create Destination'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function DestinationsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Destination | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  const destinationsQuery = useQuery({
    queryKey: ['destinations'],
    queryFn: getDestinations,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: DestinationPayload) => {
      if (editing) {
        return updateDestination(editing.id, payload);
      }
      return createDestination(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['destinations'],
      });
      setMessage(
        editing
          ? 'Destination updated successfully.'
          : 'Destination created successfully.',
      );
      setShowForm(false);
      setEditing(null);
    },
  });

  const destinations = destinationsQuery.data ?? [];

  const activeCount = destinations.filter((d) => d.active).length;

  const totalCapacity = destinations
    .filter((d) => d.active)
    .reduce((total, d) => total + d.dailyCapacityKg, 0);

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
    setMessage('');
  };

  const openEdit = (destination: Destination) => {
    setEditing(destination);
    setShowForm(true);
    setMessage('');
  };

  return (
    <div className="t-scroll h-full overflow-auto p-6">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-terminalText">
              Waste Destinations
            </h1>
            <p className="mt-1 text-sm text-terminalMuted">
              Manage biogas plants and livestock-feed hubs in Delhi NCR.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-terminalAccent px-5 py-2.5 text-sm font-semibold text-white"
          >
            + Add Destination
          </button>
        </div>

        {message && (
          <div role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[
            { label: 'Total Facilities', value: destinations.length },
            { label: 'Active Facilities', value: activeCount },
            {
              label: 'Active Daily Capacity',
              value: `${totalCapacity.toLocaleString()} kg`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-terminalBorder bg-terminalPanel p-5"
            >
              <p className="text-xs text-terminalMuted">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold text-terminalAccent">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {showForm && (
          <DestinationForm
            key={editing?.id ?? 'new'}
            destination={editing}
            onSave={async (payload) => {
              await saveMutation.mutateAsync(payload);
            }}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            saving={saveMutation.isPending}
          />
        )}

        {destinationsQuery.isLoading && (
          <p className="text-terminalMuted">Loading destinations...</p>
        )}

        {destinationsQuery.isError && (
          <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            Failed to load destinations:{' '}
            {(destinationsQuery.error as Error).message}
          </div>
        )}

        {!destinationsQuery.isLoading && !destinationsQuery.isError && (
          <div className="grid gap-4 lg:grid-cols-2">
            {destinations.map((destination) => (
              <div
                key={destination.id}
                className="rounded-2xl border border-terminalBorder bg-terminalPanel p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-terminalText">
                      {destination.name}
                    </p>
                    <p className="mt-1 text-xs text-terminalMuted">
                      {destination.address}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    destination.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {destination.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p>
                    <span className="text-terminalMuted">Type: </span>
                    <strong className="text-terminalText">
                      {destination.type === 'BIOGAS'
                        ? 'Biogas Plant'
                        : 'Livestock Feed Hub'}
                    </strong>
                  </p>
                  <p>
                    <span className="text-terminalMuted">Daily capacity: </span>
                    <strong className="text-terminalText">
                      {destination.dailyCapacityKg.toLocaleString()} kg
                    </strong>
                  </p>
                  <p>
                    <span className="text-terminalMuted">Operating hours: </span>
                    {destination.openFrom}–{destination.openTo}
                  </p>
                  <p className="text-terminalMuted">
                    Accepted waste:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {destination.acceptedCategories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800"
                      >
                        {categoryLabels[category]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex justify-end border-t border-terminalBorder pt-4">
                  <button
                    type="button"
                    onClick={() => openEdit(destination)}
                    className="rounded-full border border-terminalAccent px-4 py-2 text-xs font-semibold text-terminalAccent hover:bg-blue-50"
                  >
                    Edit Destination
                  </button>
                </div>
              </div>
            ))}

            {destinations.length === 0 && (
              <p className="text-sm text-terminalMuted">
                No destinations registered yet.
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-terminalMuted">
          Capacities represent configured daily intake limits, not waste
          received today. Delivery tracking and capacity usage will be
          added in the routing phase.
        </p>
      </div>
    </div>
  );
}
