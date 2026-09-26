import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { invalidateFinancialData } from '@/lib/queryKeys';
import { listCategorizationReviewQueue, previewCategorizationChange, applyCategorizationChange,
  type ReviewItem } from '@/lib/categorizationCommands';
import type { Category } from '@/types';

export function CategorizationReviewCard({ categories }: { categories: Category[] }) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>();
  const [scanned, setScanned] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [remember, setRemember] = useState<Record<string, boolean>>({});
  const { isReadOnly } = useAuth();
  const queryClient = useQueryClient();

  const load = async (next?: string, reset = false) => {
    setBusy(true); setError(null);
    try {
      const { data } = await listCategorizationReviewQueue({ ...(next ? { cursor: next } : {}), pageSize: 200 });
      setItems((prev) => reset ? data.unresolved : [...prev, ...data.unresolved]);
      setCursor(data.nextCursor);
      setScanned((prev) => (reset ? 0 : prev) + data.scanned);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load review queue'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(undefined, true); }, []);

  const groups = useMemo(() => {
    const map = new Map<string, ReviewItem[]>();
    for (const item of items) {
      const key = item.merchant || item.description || 'Unknown merchant';
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()].sort((a, b) =>
      b[1].reduce((sum, item) => sum + Math.abs(item.amount), 0) -
      a[1].reduce((sum, item) => sum + Math.abs(item.amount), 0)
    );
  }, [items]);
  const assignable = categories.filter((cat) => cat.id !== 'uncategorized' &&
    !categories.some((child) => child.parentId === cat.id));

  const apply = async (merchant: string, transactionId: string) => {
    const categoryId = choices[merchant];
    if (!categoryId || saving) return;
    setSaving(merchant); setError(null);
    try {
      const { data: preview } = await previewCategorizationChange({ transactionId, categoryId,
        past: remember[merchant] ?? false, future: remember[merchant] ?? false });
      await applyCategorizationChange({ proposalId: preview.proposalId, operationId: crypto.randomUUID() });
      invalidateFinancialData(queryClient);
      await load(undefined, true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(null); }
  };

  const copyTask = async () => {
    try {
      await navigator.clipboard.writeText('Using my connected Free Lunch tools, page through get_categorization_review until complete. Research unfamiliar public merchants on the web, use only verified existing category IDs, and correct clear unresolved transactions. Preserve manual choices, splits and transfers; leave ambiguity for my review. Report coverage and remaining questions.');
    } catch { setError('Copy unavailable on this device'); }
  };

  return <div className="border border-rule bg-surface p-4 text-[12px] text-textMid">
    <div className="font-mono text-[11px] text-textHi">NEEDS REVIEW · {items.length}{cursor ? '+' : ''}</div>
    <p className="mt-2">Scanned {scanned} transactions{cursor ? ' so far' : ' in the full history'}. Unclear merchants can be researched by the existing ChatGPT daily task.</p>
    <button type="button" onClick={() => { void copyTask(); }} className="my-3 border border-rule px-3 py-2">Copy ChatGPT task prompt</button>
    {error && <p role="alert" className="mb-2 text-red-600">{error}</p>}
    {groups.map(([merchant, rows]) => <div className="border-t border-rule py-3" key={merchant}>
      <div className="font-medium text-textHi">{merchant} · {rows.length} transaction{rows.length === 1 ? '' : 's'} · €{rows.reduce((sum, row) => sum + Math.abs(row.amount), 0).toFixed(2)}</div>
      <div className="mt-1 truncate">{rows[0]?.date?.slice(0, 10)} · {rows[0]?.description}</div>
      {!isReadOnly && <div className="mt-2 flex flex-wrap items-center gap-2">
        <select aria-label={`Category for ${merchant}`} value={choices[merchant] ?? ''}
          onChange={(e) => { setChoices((prev) => ({ ...prev, [merchant]: e.target.value })); }}
          className="min-w-0 border border-rule bg-bg p-2">
          <option value="">Choose category</option>
          {assignable.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        {rows[0]?.merchant && <label className="flex items-center gap-1"><input type="checkbox" checked={remember[merchant] ?? false}
          onChange={(e) => { setRemember((prev) => ({ ...prev, [merchant]: e.target.checked })); }} />Past + future</label>}
        <button type="button" disabled={!choices[merchant] || !!saving} onClick={() => { if (rows[0]) void apply(merchant, rows[0].id); }}
          className="border border-accent px-3 py-2 disabled:opacity-40">{saving === merchant ? 'Saving…' : 'Apply'}</button>
      </div>}
    </div>)}
    {cursor && <button type="button" disabled={busy} onClick={() => { void load(cursor); }} className="border border-rule px-3 py-2 disabled:opacity-40">{busy ? 'Loading…' : 'Load more history'}</button>}
    {busy && items.length === 0 && <p>Loading review queue…</p>}
    {!busy && !cursor && items.length === 0 && <p>No unresolved transactions found.</p>}
  </div>;
}
