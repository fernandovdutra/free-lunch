import { useState, type SyntheticEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PhosphorButton, StatusGlyph } from '@/components/redesign';

export function Login() {
  const { loginWithGoogle, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await loginWithGoogle();
      void navigate(from, { replace: true });
    } catch {
      setError('GOOGLE SIGN-IN FAILED');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-bg text-textHi">
      <div className="px-4 pt-4">
        <StatusGlyph label="READY" trailing={<span aria-hidden>▤</span>} />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <span aria-hidden className="cursor-blink mb-6 block h-7 w-7 bg-accent" />
        <h1 className="font-mono text-[40px] font-medium uppercase leading-none tracking-[0.08em] text-textHi">
          Free Lunch
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-textLo">
          Personal Finance, Smartly.
        </p>

        <div className="mt-12 flex w-full max-w-[280px] flex-col gap-3">
          <PhosphorButton onClick={() => void handleGoogle()} disabled={busy}>
            ▸ CONTINUE WITH GOOGLE
          </PhosphorButton>

          {import.meta.env.DEV && (
            <DevLoginFallback
              busy={busy}
              setBusy={setBusy}
              setError={setError}
              login={login}
              onSuccess={() => {
                void navigate(from, { replace: true });
              }}
            />
          )}

          {error && (
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-warn">
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

interface DevLoginFallbackProps {
  busy: boolean;
  setBusy: (b: boolean) => void;
  setError: (e: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  onSuccess: () => void;
}

function DevLoginFallback({ busy, setBusy, setError, login, onSuccess }: DevLoginFallbackProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      onSuccess();
    } catch {
      setError('INVALID EMAIL OR PASSWORD');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mt-8 flex flex-col gap-2 border-t border-rule pt-6"
    >
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-textDim">
        ⓘ DEV ONLY — EMULATOR FALLBACK
      </p>
      <input
        type="email"
        aria-label="Email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
        placeholder="EMAIL"
        autoComplete="email"
        required
        className="h-10 rounded-[6px] border border-rule bg-surface px-3 font-mono text-[12px] text-textHi placeholder:text-textDim focus:border-ruleHi focus:outline-none"
      />
      <input
        type="password"
        aria-label="Password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
        placeholder="PASSWORD"
        autoComplete="current-password"
        required
        className="h-10 rounded-[6px] border border-rule bg-surface px-3 font-mono text-[12px] text-textHi placeholder:text-textDim focus:border-ruleHi focus:outline-none"
      />
      <PhosphorButton type="submit" disabled={busy}>
        ▸ DEV LOGIN
      </PhosphorButton>
    </form>
  );
}
