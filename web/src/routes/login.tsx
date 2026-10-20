import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { login } from '../features/auth/api';
import { useSession } from '../features/auth/session-context';
import { ApiError } from '../lib/api-client';

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useSession();
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
      navigate({ to: '/dashboard' });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage('LOGIN_FAILED — check credentials');
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    mutation.mutate({ userCode, password });
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0b5cff 0%, #e0effe 100%)' }}
    >
      <section className="w-full max-w-sm">
        <div
          className="rounded-3xl border border-white/70 p-8 shadow-2xl"
          style={{
            background: 'var(--t-panel)',
            borderColor: '#f1f5f9',
            borderRadius: '24px',
          }}
        >
          <p className="text-xs font-medium" style={{ color: 'var(--t-muted)' }}>WasteWise operator portal</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--t-text)' }}>
            Sign in
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--t-muted)' }}>
            sign in with your operator account
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div>
              <label
                className="block text-xs font-semibold"
                style={{ color: 'var(--t-muted)' }}
              >
                User code
              </label>
              <div
                className="mt-1 flex items-center rounded-xl border px-3"
                style={{ background: 'var(--panel2)', borderColor: 'var(--t-border-bright)' }}
              >
                <input
                  className="w-full bg-transparent py-3 text-sm focus:outline-none"
                  style={{ color: 'var(--t-text)' }}
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  placeholder="OPERATOR-01"
                  autoComplete="username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold"
                style={{ color: 'var(--t-muted)' }}
              >
                Password
              </label>
              <div
                className="mt-1 flex items-center rounded-xl border px-3"
                style={{ background: 'var(--panel2)', borderColor: 'var(--t-border-bright)' }}
              >
                <input
                  className="w-full bg-transparent py-3 text-sm focus:outline-none"
                  style={{ color: 'var(--t-text)' }}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {errorMessage && (
              <div
                className="rounded-xl border px-3 py-2 text-xs"
                style={{
                  borderColor: 'var(--t-danger)',
                  background: 'var(--danger-glow)',
                  color: 'var(--t-danger)',
                }}
              >
                [ERR] {errorMessage}
              </div>
            )}

            <button
              className="w-full rounded-full border border-transparent py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: 'var(--purple)',
              }}
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[10px]" style={{ color: 'var(--t-soft)' }}>
          WasteWise Fleet Management System
        </p>
      </section>
    </main>
  );
}
