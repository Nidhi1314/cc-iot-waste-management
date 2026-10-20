import { useEffect, useRef } from 'react';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={(event) => {
        if (canClose && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-terminalBorder bg-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isPending
                  ? 'animate-pulse bg-terminalWarn'
                  : result?.success
                    ? 'bg-terminalAccent'
                    : 'bg-terminalDanger'
              }`}
            />
            <span className="text-sm font-bold text-terminalText">
              Predictive route
            </span>
          </div>
          <button
            className="rounded-full border border-terminalBorder px-3 py-1 text-xs text-terminalMuted hover:border-terminalDanger hover:text-terminalDanger disabled:cursor-not-allowed disabled:opacity-30"
            disabled={!canClose}
            onClick={onClose}
            type="button"
            title={canClose ? 'Close' : 'Wait for the API response'}
          >
            Close
          </button>
        </div>

        <div
          ref={bodyRef}
          className="t-scroll h-96 overflow-auto bg-slate-50 p-5 text-sm leading-relaxed"
        >
          <div className="font-bold text-terminalAccent">
            Predictive route request
          </div>
          <div className="text-terminalMuted">
            Horizon: 24 hours | Input: current bin data and trained model
          </div>
          <div className="my-2 text-terminalBorder">{'─'.repeat(54)}</div>

          {isPending ? (
            <>
              <div className="font-semibold text-terminalAccent2">Request in progress</div>
              <div className="text-terminalMuted">
                The service is estimating future fill levels and optimizing collection stops...
              </div>
              <div className="mt-1 text-terminalWarn">
                Waiting for the API response
                <span className="cursor-blink"> _</span>
              </div>
            </>
          ) : result ? (
            <div className="mt-1">
              {result.success ? (
                <>
                  <div className="font-bold text-terminalAccent">
                    Request complete
                  </div>
                  <div className="mt-0.5 break-all text-terminalMuted">
                    {result.message}
                  </div>
                  <div className="mt-1 text-terminalMuted">
                    Values above are from the completed request.
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold text-terminalDanger">
                    Request failed
                  </div>
                  <div className="mt-0.5 break-all text-terminalDanger">
                    {result.message}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-terminalWarn">
              Waiting for the request result...
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-terminalBorder bg-white px-5 py-3 text-xs text-terminalMuted">
          <span>
            {isPending
              ? 'request in progress...'
              : result?.success
                ? 'completed successfully'
                : result
                  ? 'completed with error'
                  : 'waiting for response...'}
          </span>
          <span className={canClose ? 'text-terminalAccent' : 'opacity-40'}>
            {canClose             ? 'Ready to close' : 'processing...'}
          </span>
        </div>
      </div>
    </div>
  );
}
