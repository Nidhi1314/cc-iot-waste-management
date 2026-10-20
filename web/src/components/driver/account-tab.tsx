import type { AuthUser } from '../../types/api';

type Props = { user: AuthUser; onLogout: () => void };

export function AccountTab({ user, onLogout }: Props) {
  return (
    <div className="t-scroll h-full overflow-auto bg-terminal p-5">
      <div className="rounded-2xl border border-terminalBorder bg-terminalPanel shadow-sm">
        <div className="t-panel-header">Operator profile</div>
        <div className="space-y-3 p-5 text-sm text-terminalMuted">
          <p>
            <span className="font-medium">User code: </span>
            <span className="text-terminalText font-bold">{user.userCode}</span>
          </p>
          <p>
            <span className="font-medium">Role: </span>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
              {user.role}
            </span>
          </p>
          <p>
            <span className="font-medium">ID: </span>
            <span className="font-mono text-xs text-terminalText">{user.id.slice(0, 20)}…</span>
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-terminalBorder bg-terminalPanel p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-terminalText">Session</p>
        <button
          className="w-full rounded-full border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
          onClick={onLogout}
          type="button"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
