import { useEffect, useState } from 'react';
import { clearPerfLog, getPerfLog, PERF_EVENT, type PerfEntry } from '@/lib/perf';

/**
 * On-device performance readout for diagnosing cold-start latency. Hidden by
 * default; enable by visiting any page with `?perf=1` (the flag is then
 * remembered in localStorage so it survives navigation). Renders the timings
 * captured by `timed()` so they can be read on a phone without a desktop
 * debugger. Disable via the "clear" button.
 */
function perfEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('perf') === '1') {
      window.localStorage.setItem('perf', '1');
      return true;
    }
    return window.localStorage.getItem('perf') === '1';
  } catch {
    return false;
  }
}

export function PerfOverlay() {
  const [enabled, setEnabled] = useState(perfEnabled);
  const [entries, setEntries] = useState<PerfEntry[]>(() => (enabled ? getPerfLog() : []));

  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      setEntries(getPerfLog());
    };
    window.addEventListener(PERF_EVENT, handler);
    return () => {
      window.removeEventListener(PERF_EVENT, handler);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        left: 8,
        right: 8,
        zIndex: 9999,
        maxHeight: '40vh',
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.85)',
        color: '#3f3',
        font: '11px/1.45 ui-monospace, monospace',
        padding: '8px 10px',
        borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <strong>perf · app-open timings</strong>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.removeItem('perf');
            } catch {
              // ignore
            }
            clearPerfLog();
            setEntries([]);
            setEnabled(false);
          }}
          style={{
            color: '#3f3',
            background: 'transparent',
            border: '1px solid #3f3',
            borderRadius: 4,
            padding: '0 6px',
          }}
        >
          clear
        </button>
      </div>
      {entries.length === 0 ? (
        <div>no measurements yet — open the app fresh…</div>
      ) : (
        [...entries].reverse().map((e, i) => (
          <div key={`${e.at}-${i}`}>
            {new Date(e.at).toLocaleTimeString()} · {e.label}:{' '}
            <strong>{e.ms}ms</strong>
          </div>
        ))
      )}
    </div>
  );
}
