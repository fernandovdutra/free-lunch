// Lightweight timing instrumentation for diagnosing cold-start latency.
//
// `timed()` wraps an async call, logs `[perf] <label>: <ms>ms` to the console,
// and records it in a small sessionStorage-backed ring buffer that the
// (flag-gated) PerfOverlay can display on-device. Cheap and side-effect-free
// enough to leave always-on; the overlay only renders when `?perf=1`.

export interface PerfEntry {
  label: string;
  ms: number;
  /** epoch ms when the call finished */
  at: number;
}

const MAX_ENTRIES = 50;
const STORAGE_KEY = 'perf-log';
export const PERF_EVENT = 'perf-entry';

function load(): PerfEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PerfEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: PerfEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage may be unavailable (private mode) — ignore
  }
}

export function getPerfLog(): PerfEntry[] {
  return load();
}

export function clearPerfLog(): void {
  save([]);
}

function record(entry: PerfEntry): void {
  save([...load(), entry].slice(-MAX_ENTRIES));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<PerfEntry>(PERF_EVENT, { detail: entry }));
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** Measure an async call: logs and records the elapsed time, even on throw. */
export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = now();
  try {
    return await fn();
  } finally {
    const ms = Math.round(now() - start);
    // eslint-disable-next-line no-console
    console.info(`[perf] ${label}: ${ms}ms`);
    record({ label, ms, at: Date.now() });
  }
}
