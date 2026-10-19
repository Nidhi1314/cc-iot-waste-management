import type { AuthUser } from '../../types/api';

type Props = { user: AuthUser; onLogout: () => void };

export function AccountTab({ user, onLogout }: Props) {
  return (
    <div className="t-scroll h-full overflow-auto bg-terminal p-5 font-mono">
      <div className="rounded-lg border border-terminalBorder bg-terminalPanel">
        <div className="t-panel-header">{'┌─'} OPERATOR_PROFILE {'─┐'}</div>
        <div className="space-y-1.5 p-4 text-xs text-terminalMuted">
          <p>
            <span className="text-terminalAccent">USER_CODE: </span>
            <span className="text-terminalText font-bold">{user.userCode}</span>
          </p>
          <p>
            <span className="text-terminalAccent">ROLE: </span>
            <span className="rounded border border-terminalAccent px-1.5 py-0.5 text-[10px] text-terminalAccent">
              [{user.role}]
            </span>
          </p>
          <p>
            <span className="text-terminalAccent">ID: </span>
            <span className="text-terminalText">{user.id.slice(0, 20)}…</span>
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-terminalDanger/40 bg-terminalPanel p-4">
        <p className="mb-3 text-[10px] uppercase tracking-widest text-terminalMuted">SESSION_CONTROL</p>
        <button
          className="w-full rounded border border-terminalDanger/50 bg-terminalDanger/5 py-2.5 text-xs font-bold text-terminalDanger hover:bg-terminalDanger/15"
          onClick={onLogout}
          type="button"
        >
          [LOGOUT]
        </button>
      </div>
    </div>
  );
}
