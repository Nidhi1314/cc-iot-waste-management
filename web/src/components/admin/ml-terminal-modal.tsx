import { useEffect, useRef } from 'react';
import { Terminal, CheckCircle2, AlertOctagon, X, Sparkles } from 'lucide-react';

type Result = { success: boolean; message: string };

type Props = {
  isOpen: boolean;
  isPending: boolean;
  actionLog: string[];
  logStartIndex: number;
  onClose: () => void;
};

export function MlTerminalModal({
  isOpen,
  isPending,
  actionLog,
  logStartIndex,
  onClose,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const completedEntry = actionLog
    .slice(logStartIndex)
    .reverse()
    .find(
      (entry) =>
        entry.includes('[OK] predictive result:') ||
        entry.includes('[ERR]'),
    );
  const result: Result | null = completedEntry
    ? {
        success: completedEntry.includes('[OK]'),
        message: completedEntry,
      }
    : null;

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [isPending, completedEntry]);

  if (!isOpen) return null;

  const canClose = !isPending && result !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 backdrop-blur-sm p-4"
      onClick={(event) => {
        if (canClose && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F0FDF4] border border-[#DCFCE7] text-[#1B4332]">
              <Sparkles className="h-4 w-4 text-[#2D6A4F]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Random Forest ML Inference Stream
              </span>
              <p className="text-[10px] text-[#64748B]">24-Hour CVRP Predictive Horizon</p>
            </div>
          </div>
          <button
            className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition disabled:opacity-30"
            disabled={!canClose}
            onClick={onClose}
            type="button"
            title={canClose ? 'Close' : 'Waiting for model response'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={bodyRef}
          className="h-96 overflow-y-auto bg-[#0F172A] p-5 font-mono text-xs leading-relaxed text-[#94A3B8]"
        >
          <div className="text-[#52B788] font-bold flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5" />
            <span>CONNECTED TO ML SERVICE :8000</span>
          </div>
          <div className="text-[#64748B] text-[11px] mt-1">
            Model: Random Forest Regressor • Features: [bin_id_encoded, hour, is_weekend]
          </div>
          <div className="my-3 border-b border-[#334155]" />

          {isPending ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#52B788] font-bold">
                <span className="h-2 w-2 rounded-full bg-[#52B788] animate-ping" />
                <span>Simulating 24-hour fill accretion trajectory...</span>
              </div>
              <div className="text-[#94A3B8]">
                Querying historical fill patterns & identifying bins exceeding 75% capacity...
              </div>
              <div className="text-[#FBBF24] flex items-center gap-1.5">
                <span>Executing OR-Tools CVRP solver</span>
                <span className="cursor-blink font-bold">_</span>
              </div>
            </div>
          ) : result ? (
            <div className="mt-2 space-y-2">
              {result.success ? (
                <>
                  <div className="flex items-center gap-2 text-[#52B788] font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Inference & CVRP Routing Solved Successfully</span>
                  </div>
                  <div className="rounded-md border border-[#2D6A4F]/40 bg-[#143527] p-3 text-[#E2E8F0]">
                    {result.message}
                  </div>
                  <div className="text-[#64748B] text-[11px]">
                    Route waypoints committed to PostgreSQL database and active on surveillance map.
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-[#F87171] font-bold">
                    <AlertOctagon className="h-4 w-4" />
                    <span>Prediction Engine Raised Exception</span>
                  </div>
                  <div className="rounded-md border border-[#DC2626]/40 bg-[#450A0A] p-3 text-[#FCA5A5]">
                    {result.message}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-[#FBBF24]">Awaiting inference cycle...</div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3 text-xs text-[#475569]">
          <span className="font-mono text-[11px]">
            {isPending
              ? 'STATUS: COMPUTING MATRIX...'
              : result?.success
              ? 'STATUS: OPTIMIZED'
              : 'STATUS: IDLE'}
          </span>
          <button
            onClick={onClose}
            disabled={!canClose}
            className="rounded-md bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#143527] transition disabled:opacity-40"
            type="button"
          >
            {canClose ? 'Dismiss Terminal' : 'Processing...'}
          </button>
        </div>
      </div>
    </div>
  );
}
