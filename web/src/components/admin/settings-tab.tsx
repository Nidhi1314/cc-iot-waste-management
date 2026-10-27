
import { useEffect, useState } from 'react';
import type {
  SystemSettings,
  UpdateSettingsRequest,
} from '../../features/settings/api';

type Props = {
  settings: SystemSettings;
  onSave: (data: UpdateSettingsRequest) => Promise<void>;
  isSaving: boolean;
};

export function SettingsTab({
  settings,
  onSave,
  isSaving,
}: Props) {
  const [fillThreshold, setFillThreshold] = useState(
    settings.fillThreshold,
  );

  const [maxWasteAgeHours, setMaxWasteAgeHours] = useState(
    settings.maxWasteAgeHours,
  );

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setFillThreshold(settings.fillThreshold);
    setMaxWasteAgeHours(settings.maxWasteAgeHours);
  }, [
    settings.fillThreshold,
    settings.maxWasteAgeHours,
  ]);

  const hasChanges =
    fillThreshold !== settings.fillThreshold ||
    maxWasteAgeHours !== settings.maxWasteAgeHours;

  const handleSave = async () => {
    setMessage('');
    setError('');

    try {
      await onSave({
        fillThreshold,
        maxWasteAgeHours,
      });

      setMessage('Settings saved successfully!');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save settings',
      );
    }
  };

  const handleReset = () => {
    setFillThreshold(settings.fillThreshold);
    setMaxWasteAgeHours(settings.maxWasteAgeHours);
    setMessage('');
    setError('');
  };

  return (
    <div className="t-scroll h-full overflow-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-terminalText">
            Collection Settings
          </h1>

          <p className="mt-2 text-sm text-terminalMuted">
            Configure when waste generators should be
            flagged for collection.
          </p>
        </div>

        {/* Fill threshold */}
        <div className="rounded-2xl border border-terminalBorder bg-terminalPanel p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-terminalText">
                Collection Fill Threshold
              </h2>

              <p className="mt-1 text-sm text-terminalMuted">
                Flag bins when their fill level reaches
                this percentage.
              </p>
            </div>

            <span className="text-3xl font-bold text-terminalAccent">
              {fillThreshold}%
            </span>
          </div>

          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={fillThreshold}
            onChange={(e) => {
              setFillThreshold(Number(e.target.value));
              setMessage('');
            }}
            className="mt-6 w-full cursor-pointer accent-blue-600"
          />

          <div className="mt-2 flex justify-between text-xs text-terminalMuted">
            <span>10%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Waste age */}
        <div className="rounded-2xl border border-terminalBorder bg-terminalPanel p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-terminalText">
                Maximum Waste Age
              </h2>

              <p className="mt-1 text-sm text-terminalMuted">
                Planned maximum time organic waste
                should remain uncollected.
              </p>
            </div>

            <span className="text-3xl font-bold text-terminalAccent">
              {maxWasteAgeHours}h
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="72"
            step="1"
            value={maxWasteAgeHours}
            onChange={(e) => {
              setMaxWasteAgeHours(Number(e.target.value));
              setMessage('');
            }}
            className="mt-6 w-full cursor-pointer accent-blue-600"
          />

          <div className="mt-2 flex justify-between text-xs text-terminalMuted">
            <span>1 hour</span>
            <span>36 hours</span>
            <span>72 hours</span>
          </div>
        </div>

        {/* Rule preview */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="font-semibold text-blue-900">
            Collection Rule Preview
          </h3>

          <p className="mt-2 text-sm text-blue-800">
            A waste generator should be collected when
            its fill level reaches{' '}
            <strong>{fillThreshold}%</strong> OR
            its waste age reaches{' '}
            <strong>{maxWasteAgeHours} hours</strong>.
          </p>

          <p className="mt-2 text-xs text-blue-700">
            The fill threshold is enforced by the
            backend. Waste-age enforcement will be
            enabled after waste-age tracking is added.
          </p>
        </div>

        {/* Feedback */}
        {message && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="rounded-full border border-terminalBorder px-5 py-2.5 text-sm font-semibold text-terminalMuted hover:bg-terminalPanel2 disabled:opacity-40"
          >
            Discard Changes
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="rounded-full bg-terminalAccent px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
