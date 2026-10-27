import { useState } from 'react';

type Props = {
  onSimulateDay: () => Promise<{ status?: string; message?: string }>;
  onResetBins: () => Promise<{ status?: string; message?: string }>;
  isPendingSimulate: boolean;
  isPendingReset: boolean;
};

type LogEntry = { type: 'req' | 'res' | 'err'; text: string };

function getResultMessage(status: string | undefined, action: 'simulate' | 'reset') {
  if (status !== 'success') {
    return action === 'simulate'
      ? 'Simulation could not be completed.'
      : 'Bins could not be reset.';
  }

  return action === 'simulate'
    ? 'Simulation successful: generator-specific fill and sensor readings were recorded for the next day.'
    : 'Reset successful: all bin fill levels are now 0%.';
}

export function SimulationTab({ onSimulateDay, onResetBins, isPendingSimulate, isPendingReset }: Props) {
  const [log, setLog] = useState<LogEntry[]>([
    { type: 'res', text: 'WasteWise simulation console ready' },
    { type: 'res', text: 'Use the actions below to run demo scenarios' },
  ]);
  const [confirmReset, setConfirmReset] = useState(false);

  const addLog = (entry: LogEntry) => setLog((prev) => [...prev, entry]);

  const handleSimulate = async () => {
    addLog({ type: 'req', text: '> POST /simulate-next-day' });
    try {
      const result = await onSimulateDay();
      addLog({ type: 'res', text: `< 200 OK` });
      addLog({ type: 'res', text: `< ${getResultMessage(result.status, 'simulate')}` });
    } catch (err) {
      addLog({ type: 'err', text: `< ERROR: ${(err as Error).message}` });
    }
  };

  const handleReset = async () => {
    setConfirmReset(false);
    addLog({ type: 'req', text: '> POST /reset-bins' });
    try {
      const result = await onResetBins();
      addLog({ type: 'res', text: `< 200 OK` });
      addLog({ type: 'res', text: `< ${getResultMessage(result.status, 'reset')}` });
    } catch (err) {
      addLog({ type: 'err', text: `< ERROR: ${(err as Error).message}` });
    }
  };

  const clearLog = () => setLog([{ type: 'res', text: '// log cleared' }]);
  const isAnyPending = isPendingSimulate || isPendingReset;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col gap-4 overflow-auto p-5">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        ⚠ Demo mode — these operations modify database state for presentation
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Simulate card */}
        <div className="rounded-2xl border border-terminalBorder bg-terminalPanel p-5 shadow-sm">
          <p className="text-base font-bold text-terminalText">Simulate one day</p>
          <p className="mt-2 text-sm leading-6 text-terminalMuted">
            Simulates 24 hours of waste generation using each generator type, capacity, and waste category.
            A sensor reading is recorded for every active generator using the configured collection threshold.
          </p>
          <button
            className="mt-4 w-full rounded-full border border-terminalAccent bg-terminalAccent py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isAnyPending}
            onClick={handleSimulate}
            type="button"
          >
            {isPendingSimulate ? 'Running...' : 'Run simulation'}
          </button>
        </div>

        {/* Reset card */}
        <div className="rounded-2xl border border-terminalBorder bg-terminalPanel p-5 shadow-sm">
          <p className="text-base font-bold text-terminalText">Reset bin fill levels</p>
          <p className="mt-2 text-sm leading-6 text-terminalMuted">
            Sets all bin fill levels to 0% and clears needsCollection flags.
            Use to reset demo state before a new presentation run.
          </p>

          {confirmReset ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <span className="flex-1 text-sm font-medium text-red-800">Are you sure you want to reset the bins?</span>
              <button
                className="rounded-full border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                disabled={isAnyPending}
                onClick={handleReset}
                type="button"
              >
                {isPendingReset ? 'Resetting...' : 'Confirm reset'}
              </button>
              <button
                className="rounded-full border border-terminalBorder bg-white px-3 py-1.5 text-xs text-terminalMuted hover:text-terminalText"
                onClick={() => setConfirmReset(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="mt-4 w-full rounded-full border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isAnyPending}
              onClick={() => setConfirmReset(true)}
              type="button"
            >
              Reset all bins
            </button>
          )}
        </div>
      </div>

      {/* Terminal output */}
      <div className="flex-1 rounded-2xl border border-terminalBorder bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-terminalBorder px-4 py-3 text-sm font-semibold text-terminalText">
          <span>Activity log</span>
          <button
            className="text-terminalMuted hover:text-terminalAccent"
            onClick={clearLog}
            type="button"
          >
            Clear
          </button>
        </div>
        <div className="t-scroll max-h-64 overflow-auto p-4 text-xs">
          {log.map((entry, i) => (
            <div
              key={i}
              className={
                entry.type === 'req'
                  ? 'text-terminalAccent'
                  : entry.type === 'err'
                  ? 'text-terminalDanger'
                  : 'text-terminalMuted'
              }
            >
              {entry.text}
            </div>
          ))}
          {isAnyPending && (
            <div className="text-terminalAccent">
              {'> '}<span className="cursor-blink">_</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
