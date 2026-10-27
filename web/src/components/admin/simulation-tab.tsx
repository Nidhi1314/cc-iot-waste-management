import { useState } from 'react';
import { FastForward, RotateCcw, AlertTriangle, Terminal } from 'lucide-react';

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
    ? 'Simulation successful: time advanced by one day and bin fill levels increased.'
    : 'Reset successful: all bin fill levels are now 0%.';
}

export function SimulationTab({
  onSimulateDay,
  onResetBins,
  isPendingSimulate,
  isPendingReset,
}: Props) {
  const [log, setLog] = useState<LogEntry[]>([
    { type: 'res', text: 'ReGenix Time Machine simulation engine online' },
    { type: 'res', text: 'Use controls below to trigger synthetic waste fill degradation scenarios' },
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

  const clearLog = () => setLog([{ type: 'res', text: '// console log cleared' }]);
  const isAnyPending = isPendingSimulate || isPendingReset;

  return (
    <div className="flex h-full flex-col gap-5 overflow-auto p-6 max-w-6xl mx-auto bg-[#F8FAF6] text-[#0F172A]">
      {/* Demo Warning Banner */}
      <div className="flex items-center gap-2.5 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3 text-xs text-[#C2410C] shadow-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-[#EA580C]" />
        <span>
          <strong>Live Database Simulation:</strong> Triggering operations here directly updates connected Neon PostgreSQL and FastAPI simulation models.
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Advance Simulation Card */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#FFF7ED] text-[#EA580C]">
              <FastForward className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Simulate 24-Hour Accumulation
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-[#475569]">
            Increments all 50 smart bins by 5–25% randomly, updating sensor telemetry and flagging units $\ge 75\%$ as critical overfill.
          </p>

          <button
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#1B4332] py-2 text-xs font-semibold text-white hover:bg-[#143527] disabled:opacity-40 transition shadow-sm"
            disabled={isAnyPending}
            onClick={handleSimulate}
            type="button"
          >
            <FastForward className={`h-4 w-4 ${isPendingSimulate ? 'animate-spin' : ''}`} />
            <span>{isPendingSimulate ? 'Advancing Time Machine...' : 'Execute 24h Advance'}</span>
          </button>
        </div>

        {/* Reset State Card */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#FEF2F2] text-[#DC2626]">
              <RotateCcw className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Network Grid Reset
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-[#475569]">
            Resets all bin fill levels to 0%, clears collection flags, and marks active routes completed. Perfect for starting a clean demo scenario.
          </p>

          {confirmReset ? (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-[#FEE2E2] bg-[#FEF2F2] p-2.5 text-xs">
              <span className="flex-1 font-semibold text-[#DC2626]">
                Confirm zeroing all 50 containers?
              </span>
              <button
                className="rounded bg-[#DC2626] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#B91C1C] transition disabled:opacity-40"
                disabled={isAnyPending}
                onClick={handleReset}
                type="button"
              >
                {isPendingReset ? 'Resetting...' : 'Yes, Reset All'}
              </button>
              <button
                className="rounded border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs text-[#475569] hover:text-[#0F172A]"
                onClick={() => setConfirmReset(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-[#FEE2E2] bg-[#FEF2F2] py-2 text-xs font-semibold text-[#DC2626] hover:bg-[#FEE2E2] transition disabled:opacity-40"
              disabled={isAnyPending}
              onClick={() => setConfirmReset(true)}
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Network to 0%</span>
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output Log */}
      <div className="flex-1 rounded-lg border border-[#E2E8F0] bg-white shadow-sm flex flex-col min-h-[220px] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-[#0F172A] font-bold">
            <Terminal className="h-3.5 w-3.5 text-[#2D6A4F]" />
            <span>SIMULATION CONSOLE LOG</span>
          </div>
          <button
            className="text-[#64748B] hover:text-[#0F172A] transition font-medium"
            onClick={clearLog}
            type="button"
          >
            Clear
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 max-h-56 bg-[#0F172A] text-[#94A3B8]">
          {log.map((entry, i) => (
            <div
              key={i}
              className={
                entry.type === 'req'
                  ? 'text-[#52B788] font-semibold'
                  : entry.type === 'err'
                  ? 'text-[#F87171] font-semibold'
                  : 'text-[#94A3B8]'
              }
            >
              {entry.text}
            </div>
          ))}
          {isAnyPending && (
            <div className="text-[#52B788]">
              {'> '}
              <span className="cursor-blink">_</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
