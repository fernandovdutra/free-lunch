import { useState, type SyntheticEvent } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function Login() {
  const { loginWithGoogle, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';
  const showDevForm = import.meta.env.DEV && searchParams.get('dev') === '1';

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
      <div className="flex items-center gap-2 px-5 pt-5">
        <span aria-hidden className="font-mono text-[11px] text-textLo">▸</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-textLo">
          READY
        </span>
        <span
          aria-hidden
          className="cursor-blink ml-1 inline-block"
          style={{ width: 10, height: 14, backgroundColor: 'var(--accent)' }}
        />
      </div>

      <main className="flex flex-1 flex-col px-7 pb-10">
        <div className="flex flex-1 flex-col justify-center">
          <h1
            className="font-sans font-medium text-textHi"
            style={{ fontSize: 42, lineHeight: 1, letterSpacing: '-0.03em' }}
          >
            <span className="block">Free</span>
            <span className="block">Lunch</span>
          </h1>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-textLo">
            Personal Finance, Smartly.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={busy}
            className="press flex h-[52px] w-full items-center justify-center gap-3 border border-rule bg-surface px-5 font-sans text-[15px] font-medium text-textHi disabled:cursor-not-allowed disabled:opacity-50"
            style={{ letterSpacing: '-0.01em' }}
          >
            <GoogleGlyph />
            Continue with Google
          </button>

          {error && (
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-warn">
              {error}
            </p>
          )}

          {showDevForm && (
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
        </div>
      </main>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.5l6.3 5.3A20 20 0 0 0 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
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
      className="mt-4 flex flex-col gap-2 border-t border-rule pt-4"
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
      <button
        type="submit"
        disabled={busy}
        className="press flex h-10 w-full items-center justify-center border border-rule bg-surface font-mono text-[11px] uppercase tracking-[0.08em] text-textHi disabled:cursor-not-allowed disabled:opacity-50"
      >
        ▸ DEV LOGIN
      </button>
    </form>
  );
}
