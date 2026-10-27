
import { useState, type FormEvent } from 'react';

import type {
  SmartBin,
  GeneratorType,
  WasteCategory,
  BinStatus,
} from '../../types/api';

import type {
  GeneratorPayload,
} from '../../features/bins/api';

type Props = {
  generator: SmartBin | null;
  onSave: (data: GeneratorPayload) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
};

const inputClass =
  'w-full rounded-xl border border-terminalBorder bg-white px-3 py-2 text-sm text-terminalText focus:border-terminalAccent focus:outline-none';

const labelClass =
  'mb-1 block text-xs font-semibold text-terminalMuted';

type FormState = {
  generatorName: string;
  generatorType: GeneratorType;
  wasteCategory: WasteCategory;
  address: string;
  latitude: string;
  longitude: string;
  estDailyKg: string;
  totalDepthCm: string;
  maxCapacityKg: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  contactName: string;
  contactPhone: string;
  status: BinStatus;
};

function initialState(generator: SmartBin | null): FormState {
  return {
    generatorName: generator?.generatorName ?? '',
    generatorType: generator?.generatorType ?? 'RESTAURANT',
    wasteCategory: generator?.wasteCategory ?? 'COOKED_FOOD',
    address: generator?.address ?? '',
    latitude: String(generator?.latitude ?? 28.6139),
    longitude: String(generator?.longitude ?? 77.209),
    estDailyKg: String(generator?.estDailyKg ?? 30),
    totalDepthCm: String(generator?.totalDepthCm ?? 100),
    maxCapacityKg: String(generator?.maxCapacityKg ?? 150),
    pickupWindowStart:
      generator?.pickupWindowStart ?? '09:00',
    pickupWindowEnd:
      generator?.pickupWindowEnd ?? '18:00',
    contactName: generator?.contactName ?? '',
    contactPhone: generator?.contactPhone ?? '',
    status: generator?.status ?? 'ACTIVE',
  };
}

export function GeneratorForm({
  generator,
  onSave,
  onCancel,
  isSaving,
}: Props) {
  const [form, setForm] = useState<FormState>(
    () => initialState(generator),
  );

  const [error, setError] = useState('');

  const edit = (key: keyof FormState, value: string) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError('');

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const estDailyKg = Number(form.estDailyKg);
    const totalDepthCm = Number(form.totalDepthCm);
    const maxCapacityKg = Number(form.maxCapacityKg);

    if (
      !form.generatorName.trim() ||
      !form.address.trim()
    ) {
      setError('Generator name and address are required.');
      return;
    }

    if (
      !form.latitude.trim() ||
      !form.longitude.trim() ||
      !form.estDailyKg.trim() ||
      !form.totalDepthCm.trim() ||
      !form.maxCapacityKg.trim()
    ) {
      setError('Complete all numeric fields.');
      return;
    }

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError('Enter valid latitude and longitude.');
      return;
    }

    if (
      !Number.isFinite(estDailyKg) ||
      estDailyKg <= 0 ||
      !Number.isFinite(totalDepthCm) ||
      totalDepthCm <= 0 ||
      !Number.isFinite(maxCapacityKg) ||
      maxCapacityKg <= 0
    ) {
      setError('Daily waste, depth, and capacity must be positive.');
      return;
    }

    if (
      !form.pickupWindowStart ||
      !form.pickupWindowEnd ||
      form.pickupWindowStart >= form.pickupWindowEnd
    ) {
      setError('Pickup end time must be after start time.');
      return;
    }

    const payload: GeneratorPayload = {
      generatorName: form.generatorName.trim(),
      generatorType: form.generatorType,
      wasteCategory: form.wasteCategory,
      address: form.address.trim(),
      latitude,
      longitude,
      estDailyKg,
      totalDepthCm,
      maxCapacityKg,
      pickupWindowStart: form.pickupWindowStart,
      pickupWindowEnd: form.pickupWindowEnd,
      contactName: form.contactName.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      status: form.status,
    };

    try {
      await onSave(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save generator',
      );
    }
  };

  return (
    <div className="rounded-2xl border border-terminalBorder bg-terminalPanel p-6 shadow-lg">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-terminalText">
            {generator ? 'Edit Generator' : 'Add Generator'}
          </h2>

          <p className="mt-1 text-xs text-terminalMuted">
            Register a simulated organic waste pickup point.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-xl text-terminalMuted hover:text-terminalText"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Generator name *</label>
            <input
              required
              className={inputClass}
              value={form.generatorName}
              onChange={(e) =>
                edit('generatorName', e.target.value)
              }
              placeholder="Example: Delhi Organic Kitchen"
            />
          </div>

          <div>
            <label className={labelClass}>Generator type *</label>
            <select
              className={inputClass}
              value={form.generatorType}
              onChange={(e) =>
                edit('generatorType', e.target.value)
              }
            >
              <option value="RESTAURANT">Restaurant</option>
              <option value="HOTEL">Hotel</option>
              <option value="CANTEEN">Canteen</option>
              <option value="VEGETABLE_MARKET">Vegetable Market</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Waste category *</label>
            <select
              className={inputClass}
              value={form.wasteCategory}
              onChange={(e) =>
                edit('wasteCategory', e.target.value)
              }
            >
              <option value="COOKED_FOOD">Cooked Food</option>
              <option value="VEG_SCRAPS">Vegetable Scraps</option>
              <option value="MIXED_ORGANIC">Mixed Organic</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Estimated waste (kg/day) *</label>
            <input
              type="number"
              required
              min="0.01"
              step="any"
              className={inputClass}
              value={form.estDailyKg}
              onChange={(e) =>
                edit('estDailyKg', e.target.value)
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Address *</label>
            <input
              required
              className={inputClass}
              value={form.address}
              onChange={(e) => edit('address', e.target.value)}
              placeholder="Greater Kailash, New Delhi"
            />
          </div>

          <div>
            <label className={labelClass}>Latitude *</label>
            <input
              type="number"
              step="any"
              required
              className={inputClass}
              value={form.latitude}
              onChange={(e) => edit('latitude', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Longitude *</label>
            <input
              type="number"
              step="any"
              required
              className={inputClass}
              value={form.longitude}
              onChange={(e) => edit('longitude', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Bin depth (cm) *</label>
            <input
              type="number"
              min="0.01"
              step="any"
              required
              className={inputClass}
              value={form.totalDepthCm}
              onChange={(e) => edit('totalDepthCm', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Maximum capacity (kg) *</label>
            <input
              type="number"
              min="0.01"
              step="any"
              required
              className={inputClass}
              value={form.maxCapacityKg}
              onChange={(e) => edit('maxCapacityKg', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Pickup window start *</label>
            <input
              type="time"
              required
              className={inputClass}
              value={form.pickupWindowStart}
              onChange={(e) =>
                edit('pickupWindowStart', e.target.value)
              }
            />
          </div>

          <div>
            <label className={labelClass}>Pickup window end *</label>
            <input
              type="time"
              required
              className={inputClass}
              value={form.pickupWindowEnd}
              onChange={(e) =>
                edit('pickupWindowEnd', e.target.value)
              }
            />
          </div>

          <div>
            <label className={labelClass}>Contact name</label>
            <input
              className={inputClass}
              value={form.contactName}
              onChange={(e) => edit('contactName', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Contact phone</label>
            <input
              type="tel"
              className={inputClass}
              value={form.contactPhone}
              onChange={(e) => edit('contactPhone', e.target.value)}
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => edit('status', e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="DAMAGED">Damaged</option>
              <option value="OUT_OF_SERVICE">Out of service</option>
            </select>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-terminalBorder pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-full border border-terminalBorder px-5 py-2 text-sm text-terminalMuted"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-terminalAccent px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSaving
              ? 'Saving...'
              : generator
                ? 'Update Generator'
                : 'Create Generator'}
          </button>
        </div>
      </form>
    </div>
  );
}
