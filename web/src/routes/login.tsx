import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Lock, User, ArrowRight, AlertOctagon, Leaf } from 'lucide-react';
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
    <main className="relative flex min-h-screen items-center justify-center p-4 bg-[#F8FAF6] font-sans text-[#0F172A]">
      <section className="relative w-full max-w-sm z-10">
        <div className="rounded-xl border border-[#E2E8F0] p-7 shadow-sm bg-white">
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B4332] text-white shadow-sm">
              <Leaf className="h-4 w-4 text-[#52B788]" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-[#1B4332]">
                Re<span className="text-[#2D6A4F]">Genix</span>
              </span>
              <p className="text-[10px] font-semibold tracking-wider text-[#64748B] uppercase">
                Enterprise Operations
              </p>
            </div>
          </div>

          <h1 className="text-base font-bold text-[#0F172A]">Sign In to Platform</h1>
          <p className="mt-1 text-xs text-[#475569] leading-relaxed">
            Intelligent organic waste management and dynamic fleet route optimization.
          </p>

          <form className="mt-5 space-y-3.5" onSubmit={submit}>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                User Code / ID
              </label>
              <div className="mt-1 flex items-center rounded-md border border-[#CBD5E1] bg-white px-3 transition focus-within:border-[#2D6A4F]">
                <User className="h-4 w-4 text-[#94A3B8] shrink-0 mr-2" />
                <input
                  className="w-full bg-transparent py-2 text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  placeholder="e.g. ADMIN-01 or DRIVER-01"
                  autoComplete="username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                Password
              </label>
              <div className="mt-1 flex items-center rounded-md border border-[#CBD5E1] bg-white px-3 transition focus-within:border-[#2D6A4F]">
                <Lock className="h-4 w-4 text-[#94A3B8] shrink-0 mr-2" />
                <input
                  className="w-full bg-transparent py-2 text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
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
              <div className="flex items-center gap-2 rounded-md border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-2 text-xs text-[#DC2626]">
                <AlertOctagon className="h-4 w-4 shrink-0 text-[#DC2626]" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#1B4332] py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#143527] transition disabled:opacity-50"
              disabled={mutation.isPending}
              type="submit"
            >
              <span>{mutation.isPending ? 'Authenticating...' : 'Access Command Center'}</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#52B788]" />
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-[#94A3B8]">
          ReGenix Climate-Tech &copy; 2026 • v2.4.0-enterprise
        </p>
      </section>
    </main>
  );
}
