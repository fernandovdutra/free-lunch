# Wealth net-worth import

One-off importer that loads a personal net-worth tracker (exported as TSV) into
the `users/{uid}/holdings` Firestore collection that the Wealth module reads.

**The raw data and any generated JSON are gitignored — only the scripts are
committed. Never commit real balances.**

## Files

| File | Committed | Purpose |
|---|---|---|
| `parse.mjs` | ✅ | Pure parser: transposed TSV → `Holding`s, FX-converted per date. No deps. |
| `mapping.mjs` | ✅ | Account → Holding mapping (name/platform/type/liquidity/symbol/include). Edit this to retune. |
| `analyze.mjs` | ✅ | Dry analysis: prints the mapping table + per-date reconciliation, writes `generated/holdings.generated.json`. |
| `import.mjs` | ✅ | Idempotent firebase-admin importer (emulator-first). |
| `parse.test.mjs` | ✅ | Smoke tests against a synthetic fixture (`node --test`). |
| `networth.raw.tsv` | 🚫 gitignored | The real exported data. |
| `generated/` | 🚫 gitignored | `_build_raw.mjs` (reconstructs the TSV) + emitted JSON. |

## Input format

Transposed: row 1 is `Metric | flag | <ISO dates…>`, each later row is an account
or a subtotal. Conventions:

- First two data rows are FX: `1 BTC in EUR`, `1 EUR in BRL`.
- `flag` column `= 1` → row is in **BRL** (÷ EUR/BRL per date).
- Rows named `BTC*` → cells are **unit counts** (× BTC/EUR per date).
- Everything else → **EUR**.
- Subtotal rows (see `SUBTOTALS` in `parse.mjs`) are skipped.
- The `Liabilities` marker row flips every following leaf to `kind: 'liability'`.

The parser **reconciles** the sum of leaf values against the sheet's own
`Assets` / `Liabilities` / `Total net worth` rows at every date; `analyze.mjs`
fails loudly on any mismatch, and `import.mjs` aborts if the latest net worth
doesn't tie out.

## Run

```bash
# from this directory; firebase-admin resolves from functions/node_modules
cd functions/scripts/wealth-import

# 1. (re)build the local TSV from the pasted data, if needed
node generated/_build_raw.mjs

# 2. dry analysis — mapping table + reconciliation (no Firestore)
node analyze.mjs                       # or: node analyze.mjs path/to/export.tsv

# 3. run the parser smoke tests
node --test

# 4. dry-run the importer (prints the write plan, no deps needed)
node import.mjs --uid=<UID> --dry-run

# 5. import to the emulator (start it first: npm run firebase:emulators)
FIRESTORE_EMULATOR_HOST=localhost:8080 GCLOUD_PROJECT=free-lunch-85447 \
  node import.mjs --uid=<UID>

# 6. import to PRODUCTION (requires a service-account credential)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
  node import.mjs --uid=<UID> --prod
```

Doc ids are deterministic (`<kind>-<slug(sheet row name)>`), so re-running
upserts the same docs rather than duplicating. History dates are stored as ISO
`YYYY-MM-DD` strings (the client `transformHolding` handles both strings and
Timestamps).
