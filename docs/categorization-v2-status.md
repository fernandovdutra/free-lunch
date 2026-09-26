# Categorization v2 implementation status

This branch is a **draft for review** against [the implementation plan](free-lunch-implementation-plan.md). It is not deployment ready. The user selected the existing ChatGPT daily task for AI categorization and merchant research; paid OpenAI Platform integration is intentionally deferred. No production data, schedule, billing, or deployment was changed.

## Delivered on the branch

- Pure deterministic evaluator with explicit merchant slug mappings, service-specific and boundary-aware matching, confirmed-rule priority, protected manual/split/transfer states, and assignable leaf validation.
- Authenticated app callables and MCP tools sharing preview/apply/undo, a paged review queue, evidence submission, versioned confirmed rules, immutable proposal chunks, audited historical operation, Cloud Tasks dispatch and repair sweep.
- Transaction edit sheet with staged category selection, current/past/future scope, preview counts, paged matches, progress, and undo; rules editing and a Needs Review view.
- Assisted mode by default: automatic Anthropic finance/report calls are gated behind explicit legacy transition settings. The existing ChatGPT daily task is the intended research/report owner. No new paid model adapter, API key, or budget is activated.
- Additive v2 metadata migration CLI with dry run, cursor, manifest, and idempotence; no production migration executed.

## Acceptance matrix

| Case | Status | Evidence or remaining work |
| --- | --- | --- |
| C01 | Pass | Explicit slug mapping and decision tests. |
| C02 | Pass | Merchant boundary/specificity tests. |
| C03 | Pass | Rule target and normalization tests. |
| C04 | Partial | Confirmed precedence unit tests; end-to-end import rule test pending. |
| C05 | Partial | Emulator stale/current and historical edit checks; concurrent category/identity and import races pending. |
| C06 | Partial | Prior rule assignments are eligible; second correction scenario pending. |
| C07 | Partial | Leaf validation and low confidence tests; all malformed/non-finite paths pending. |
| C08 | Pass | Leaf registry tests including root leaves and emulator category validation. |
| C09 | Partial | App scopes and persisted future rule; synthetic next import test pending. |
| C10 | Pass | Emulator preview and chunk completion for 512 historical transactions. |
| C11 | Pass | Emulator idempotent apply, retry after proposal expiry, and repeatable chunk processing. |
| C12 | Partial | Emulator undo with later edit and rule disable; crash/undo overlap pending. |
| C13 | Partial | Bank deterministic path; manual, ICS and scheduled convergence pending. |
| C14 | Partial | Split/transfer protection; financial totals regression pending. |
| C15 | Partial | Callable role resolution and Firestore emulator checks; cross-owner and old client v2 flat-field restrictions pending. |
| C16 | Pending | Category archive/reassignment workflow. |
| C17 | Partial | Assisted evidence is stored as unverified agent-supplied; source verification/identity dedupe pending. |
| C18 | Deferred | Paid API adapter and failure modes excluded by user decision. |
| C19 | Deferred | Paid API budget reservations excluded by user decision. |
| C20 | Partial | Assisted research provenance distinct from confirmed rule; malicious content tests pending. |
| C21 | Pending | Daily/MTD report freshness and DST parity. |
| C22 | Pending | Explicit advisor acknowledgment persistence and suppression. |
| C23 | Partial | Backend scheduled report paths default off; live schedule ownership/delivery not validated. |
| C24 | Partial | Emulator migration dry-run/idempotence; old client v2 flat-field protection and rollback drill pending. |
| C25 | Partial | Playwright mobile correction flow passed CI; keyboard, screen reader, partial failure, and rollback coverage pending. |

## Review and rollout limits

1. Keep this PR in draft. Complete P4 category lifecycle, all import paths, stale-version checks, old cached PWA protection, and financial aggregates before deployment. Firestore still permits legacy direct flat category edits for compatibility, including on v2 records. The staged security tightening described in the plan has not happened.
2. The ChatGPT task was inspected and already instructs categorization and public merchant research. Validate its connected tool access, pagination, report delivery, and single ownership in a supported environment before changing live schedules. Merely gating backend report functions does not migrate on-demand narrative or advisor memory behavior.
3. Paid API integration, budget accounting, research source verification, and provider tests are intentionally deferred. Assisted submitted evidence is a proposal, not a verified source or permission to establish a future rule.
4. Run the migration dry run against an approved backup and inspect the manifest before any production apply. Then rehearse rollback, monitor Cloud Tasks/index provisioning and permissions, and stage backend/client/security deployment. No production migration has run.
5. Local Playwright browser installation failed because the Chromium archive was unavailable/truncated in this environment. The mobile flow passed [Quality run #44](https://github.com/fernandovdutra/free-lunch/actions/runs/36106805032). No passing mobile screenshot was exported.

## Verification

- [Quality run #44](https://github.com/fernandovdutra/free-lunch/actions/runs/36106805032) passed all three jobs: root/functions checks and tests, Firestore emulator, and mobile Playwright flow.
- Firestore emulator: 2 rules tests and 3 command/migration tests passed, including 512 historical transactions.
- Root typecheck and lint passed (0 errors; existing warnings).
