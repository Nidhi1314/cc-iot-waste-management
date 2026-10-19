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
      style={{ background: 'var(--t-bg)', fontFamily: '"JetBrains Mono", monospace' }}
    >
      <section className="w-full max-w-sm">
        <div
          className="rounded border p-6"
          style={{
            background: 'var(--t-panel)',
            borderColor: 'var(--t-border)',
          }}
        >
          <p className="text-xs" style={{ color: 'var(--t-muted)' }}>wastewise-auth v1.0</p>
          <p className="mt-1 text-xl font-bold" style={{ color: 'var(--t-accent)' }}>
            {'> '}AUTHENTICATE
            <span className="cursor-blink" style={{ color: 'var(--t-accent)' }}>_</span>
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--t-muted)' }}>
            sign in with your operator account
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div>
              <label
                className="block text-[10px] uppercase tracking-widest"
                style={{ color: 'var(--t-muted)' }}
              >
                USER_CODE:
              </label>
              <div
                className="mt-1 flex items-center rounded border px-3"
                style={{ background: 'var(--t-bg)', borderColor: 'var(--t-border-bright)' }}
              >
                <span className="mr-2 text-sm" style={{ color: 'var(--t-accent)' }}>{'>'}</span>
                <input
                  className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
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
                className="block text-[10px] uppercase tracking-widest"
                style={{ color: 'var(--t-muted)' }}
              >
                PASSWORD:
              </label>
              <div
                className="mt-1 flex items-center rounded border px-3"
                style={{ background: 'var(--t-bg)', borderColor: 'var(--t-border-bright)' }}
              >
                <span className="mr-2 text-sm" style={{ color: 'var(--t-accent)' }}>{'>'}</span>
                <input
                  className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
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
                className="rounded border px-3 py-2 text-xs"
                style={{
                  borderColor: 'var(--t-danger)',
                  background: 'rgba(255,68,68,0.08)',
                  color: 'var(--t-danger)',
                }}
              >
                [ERR] {errorMessage}
              </div>
            )}

            <button
              className="w-full rounded border py-2.5 text-xs font-bold uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                borderColor: 'var(--t-accent)',
                background: mutation.isPending ? 'rgba(0,255,65,0.15)' : 'rgba(0,255,65,0.08)',
                color: 'var(--t-accent)',
              }}
              disabled={mutation.isPending}
              type="submit"
            >
              {mutation.isPending ? '> AUTHENTICATING...' : '[AUTHENTICATE]'}
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
