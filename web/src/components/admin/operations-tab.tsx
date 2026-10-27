import { useState, type FormEvent } from 'react';
import type { SmartBin, RouteItem } from '../../types/api';
import type { Destination } from '../../features/destinations/api';
import type {
  CollectionPayload,
  CollectionRecord,
  ImpactSummary,
} from '../../features/collections/api';
import { formatDateTime } from '../../lib/utils';

type Props = {
  bins: SmartBin[];
  routes: RouteItem[];
  destinations: Destination[];
  collections: CollectionRecord[];
  impact: ImpactSummary | null;
  onCreateCollection: (payload: CollectionPayload) => Promise<void>;
  onConfirmDelivery: (collectionId: string) => Promise<void>;
  saving: boolean;
  error: string | null;
};

const fieldClass =
  'w-full rounded-xl border border-terminalBorder bg-white px-3 py-2 text-sm text-terminalText';

export function OperationsTab({
  bins,
  routes,
  destinations,
  collections,
  impact,
  onCreateCollection,
  onConfirmDelivery,
  saving,
  error,
}: Props) {
  const [binId, setBinId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [measuredKg, setMeasuredKg] = useState('');
  const [contaminationPercent, setContaminationPercent] = useState('0');
  const [formError, setFormError] = useState('');
  const destinationById = new Map(destinations.map((destination) => [destination.id, destination]));

  const selectRoute = (value: string) => {
    setRouteId(value);
    const route = routes.find((candidate) => candidate.id === value);
    if (route?.destinationId) setDestinationId(route.destinationId);
  };

  const deliver = async (id: string) => {
    setFormError('');
    try {
      await onConfirmDelivery(id);
    } catch (deliveryError) {
      setFormError((deliveryError as Error).message);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const kg = Number(measuredKg);
    const contamination = Number(contaminationPercent);
    if (!binId || !destinationId || !Number.isFinite(kg) || kg <= 0) {
      setFormError('Choose a generator and destination and enter a positive measured weight.');
      return;
    }
    if (!Number.isFinite(contamination) || contamination < 0 || contamination > 100) {
      setFormError('Contamination must be between 0 and 100 percent.');
      return;
    }
    setFormError('');
    try {
      await onCreateCollection({
        binId,
        ...(routeId ? { routeId } : {}),
        destinationId,
        measuredKg: kg,
        contaminationPercent: contamination,
      });
      setBinId('');
      setRouteId('');
      setDestinationId('');
      setMeasuredKg('');
      setContaminationPercent('0');
    } catch (submitError) {
      setFormError((submitError as Error).message);
    }
  };

  return (
    <div className="t-scroll h-full space-y-5 overflow-auto p-5">
      <section className="rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
        <div className="t-panel-header">Record collection</div>
        <form className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={submit}>
          <label className="text-xs font-semibold text-terminalMuted">
            Generator
            <select className={`${fieldClass} mt-1`} value={binId} onChange={(event) => setBinId(event.target.value)} required>
              <option value="">Select a generator</option>
              {bins.map((bin) => <option key={bin.id} value={bin.id}>{bin.generatorName || bin.address}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-terminalMuted">
            Route (optional)
            <select className={`${fieldClass} mt-1`} value={routeId} onChange={(event) => selectRoute(event.target.value)}>
              <option value="">Manual / no route</option>
              {routes.filter((route) => !route.isCompleted && route.destinationId && (!binId || route.waypointsOrder.some((waypoint) => waypoint.binId === binId))).map((route) => (
                <option key={route.id} value={route.id}>
                  {route.id.slice(0, 8)} — {route.waypointsOrder.length} stops
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-terminalMuted">
            Delivery destination
            <select className={`${fieldClass} mt-1`} value={destinationId} onChange={(event) => setDestinationId(event.target.value)} required>
              <option value="">Select a destination</option>
              {destinations.filter((destination) => destination.active).map((destination) => (
                <option key={destination.id} value={destination.id}>{destination.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-terminalMuted">
            Measured waste (kg)
            <input className={`${fieldClass} mt-1`} min="0.01" step="0.01" type="number" value={measuredKg} onChange={(event) => setMeasuredKg(event.target.value)} required />
          </label>
          <label className="text-xs font-semibold text-terminalMuted">
            Contamination (%)
            <input className={`${fieldClass} mt-1`} min="0" max="100" step="0.1" type="number" value={contaminationPercent} onChange={(event) => setContaminationPercent(event.target.value)} required />
          </label>
          <div className="flex items-end">
            <button className="w-full rounded-full bg-terminalAccent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Record collection'}
            </button>
          </div>
          {(formError || error) && <p className="text-sm text-terminalDanger md:col-span-2 xl:col-span-3">{formError || error}</p>}
        </form>
      </section>

      <section className="rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
        <div className="t-panel-header">Impact analytics</div>
        {!impact ? (
          <p className="p-4 text-sm text-terminalMuted">Impact metrics are unavailable.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
            <Metric label="Delivered waste" value={`${impact.deliveredKg.toFixed(1)} kg`} />
            <Metric label="Completed trips" value={impact.completedTrips} />
            <Metric label="Recorded distance" value={`${impact.totalDistanceKm.toFixed(1)} km`} />
            <Metric label="Confirmed deliveries" value={impact.confirmedDeliveries} />
            <Metric label="Avg. contamination" value={`${impact.avgContaminationPercent.toFixed(1)}%`} />
          </div>
        )}
        {impact && <p className="px-4 pb-4 text-xs text-terminalMuted">{impact.pendingDeliveries} collection record(s) still need delivery confirmation.</p>}
      </section>

      <section className="rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
        <div className="t-panel-header">Collection and delivery ledger</div>
        {collections.length === 0 ? (
          <p className="p-4 text-sm text-terminalMuted">No collection records yet.</p>
        ) : (
          <div className="t-scroll overflow-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="text-terminalMuted">
                <tr className="border-b border-terminalBorder">
                  <th className="p-3">Generator</th><th className="p-3">Destination</th><th className="p-3">Weight</th>
                  <th className="p-3">Contamination</th><th className="p-3">Collected</th><th className="p-3">Delivery</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((record) => {
                  const bin = bins.find((candidate) => candidate.id === record.binId);
                  const destination = destinationById.get(record.destinationId);
                  return (
                    <tr className="border-b border-terminalBorder/60 text-terminalText" key={record.id}>
                      <td className="p-3">{bin?.generatorName || bin?.address || record.binId.slice(0, 8)}</td>
                      <td className="p-3">{destination?.name || record.destinationId.slice(0, 8)}</td>
                      <td className="p-3">{record.measuredKg.toFixed(1)} kg</td>
                      <td className="p-3">{record.contaminationPercent.toFixed(1)}%</td>
                      <td className="p-3">{formatDateTime(record.collectedAt)}</td>
                      <td className="p-3">
                        {record.status === 'DELIVERED' ? (
                          <span className="text-emerald-700">Delivered {record.deliveredAt ? formatDateTime(record.deliveredAt) : ''}</span>
                        ) : (
                          <button className="rounded-full border border-terminalAccent px-3 py-1 font-semibold text-terminalAccent disabled:opacity-50" disabled={saving} onClick={() => void deliver(record.id)} type="button">
                            Confirm delivery
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-terminalBorder bg-white p-3">
      <p className="text-[11px] text-terminalMuted">{label}</p>
      <p className="mt-1 text-lg font-bold text-terminalAccent">{value}</p>
    </div>
  );
}
