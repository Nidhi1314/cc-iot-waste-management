import { useState } from 'react';

type Props = {
  onSimulateDay: () => Promise<{ message?: string }>;
  onResetBins: () => Promise<{ message?: string }>;
  isPendingSimulate: boolean;
  isPendingReset: boolean;
};

type LogEntry = { type: 'req' | 'res' | 'err'; text: string };

export function SimulationTab({ onSimulateDay, onResetBins, isPendingSimulate, isPendingReset }: Props) {
  const [log, setLog] = useState<LogEntry[]>([
    { type: 'res', text: '// WasteWise simulation console ready' },
    { type: 'res', text: '// Use commands below to run demo scenarios' },
  ]);
  const [confirmReset, setConfirmReset] = useState(false);

  const addLog = (entry: LogEntry) => setLog((prev) => [...prev, entry]);

  const handleSimulate = async () => {
    addLog({ type: 'req', text: '> POST /simulate-next-day' });
    try {
      const result = await onSimulateDay();
      addLog({ type: 'res', text: `< 200 OK` });
      addLog({ type: 'res', text: `< ${JSON.stringify(result)}` });
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
      addLog({ type: 'res', text: `< ${JSON.stringify(result)}` });
    } catch (err) {
      addLog({ type: 'err', text: `< ERROR: ${(err as Error).message}` });
    }
  };

  const clearLog = () => setLog([{ type: 'res', text: '// log cleared' }]);
  const isAnyPending = isPendingSimulate || isPendingReset;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col gap-4 overflow-auto p-5 font-mono">
      <div className="rounded-lg border border-terminalWarn bg-terminalWarn/5 px-4 py-2.5 text-xs text-terminalWarn">
        ⚠ DEMO_MODE — these operations modify database state for jury presentation
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Simulate card */}
        <div className="rounded-lg border border-terminalBorder bg-terminalPanel p-5">
          <p className="text-sm font-bold text-terminalAccent">[SIM] SIMULATE_TIME_+1_DAY</p>
          <p className="mt-2 text-xs text-terminalMuted">
            Increments all bin fill levels by 5–25% randomly. Flags bins ≥75% as needing collection.
            Useful for demonstrating reactive and predictive route generation.
          </p>
          <button
            className="mt-4 w-full rounded border border-terminalAccent bg-terminalAccent/10 py-2.5 text-xs font-bold text-terminalAccent hover:bg-terminalAccent/20 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isAnyPending}
            onClick={handleSimulate}
            type="button"
          >
            {isPendingSimulate ? '> EXECUTING...' : '[RUN_SIMULATION]'}
          </button>
        </div>

        {/* Reset card */}
        <div className="rounded-lg border border-terminalDanger/40 bg-terminalPanel p-5">
          <p className="text-sm font-bold text-terminalDanger">[RST] SAFE_RESET_BINS_TO_0%</p>
          <p className="mt-2 text-xs text-terminalMuted">
            Sets all bin fill levels to 0% and clears needsCollection flags.
            Use to reset demo state before a new presentation run.
          </p>

          {confirmReset ? (
            <div className="mt-4 flex items-center gap-3 rounded border border-terminalDanger bg-terminalDanger/10 p-3">
              <span className="flex-1 text-xs text-terminalDanger">CONFIRM_DESTRUCTIVE_OPERATION?</span>
              <button
                className="rounded-lg border border-terminalDanger px-3 py-1 text-xs font-bold text-terminalDanger hover:bg-terminalDanger/20 disabled:opacity-40"
                disabled={isAnyPending}
                onClick={handleReset}
                type="button"
              >
                {isPendingReset ? 'RESETTING...' : '[CONFIRM]'}
              </button>
              <button
                className="rounded-lg border border-terminalBorder px-3 py-1 text-xs text-terminalMuted hover:text-terminalText"
                onClick={() => setConfirmReset(false)}
                type="button"
              >
                [CANCEL]
              </button>
            </div>
          ) : (
            <button
              className="mt-4 w-full rounded border border-terminalDanger/50 bg-terminalDanger/5 py-2.5 text-xs font-bold text-terminalDanger hover:bg-terminalDanger/15 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isAnyPending}
              onClick={() => setConfirmReset(true)}
              type="button"
            >
              [RESET_ALL_BINS]
            </button>
          )}
        </div>
      </div>

      {/* Terminal output */}
      <div className="flex-1 rounded border border-terminalBorder bg-terminal">
        <div className="flex items-center justify-between border-b border-terminalBorder px-4 py-2 text-[10px] uppercase tracking-widest text-terminalMuted">
          <span>{'┌─'} CONSOLE_OUTPUT {'─┐'}</span>
          <button
            className="text-terminalMuted hover:text-terminalAccent"
            onClick={clearLog}
            type="button"
          >
            [CLEAR]
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
