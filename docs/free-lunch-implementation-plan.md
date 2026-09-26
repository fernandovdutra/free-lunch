# Free Lunch: categorization and OpenAI migration implementation plan

**Prepared:** 23 September 2026 · **Status:** ready for implementation handoff; no implementation or deployment performed by this plan.

**Implementation agent:** GPT-6 Sol, high reasoning effort. **Review:** return the completed PR to the planning/review agent for independent review before merging. This document specifies the work; starting that implementation is the next stage of the user's requested sequence.

## 1. Outcome and scope

Fernando should correct a merchant once, visibly decide whether the correction applies to the current transaction, past transactions, and future transactions, and trust the result. His explicit decisions must survive imports, AI jobs, retries, subsequent merchant corrections, and provider migrations. Unfamiliar merchants should be researched using a capable model and actual web evidence when paid backend research is enabled, or through the existing ChatGPT connector when using the subscription-assisted mode.

Deliver the complete categorization redesign, merchant research, category/rule integrity, import parity, historical repair tooling, and replacement or retirement of every active Anthropic-dependent finance workload. Preserve the existing account, bank integrations, shared-household permissions, OAuth connector, reports, and advisor memory.

Do not redesign the whole app, add a general-purpose agent framework, buy another subscription, or rewrite unrelated financial features. Consolidate financial aggregation only where required for correct categorization effects and the migrated reports.

### Baseline checked

- Original review: `free-lunch-categorization-review.md`, 21 September, commit `18dd9abd8b4a7023fa7554e17bf51b8cd21b5562`.
- Current repository main checked for this plan: `eed35eebcd2aefe18302e7537d0c31901168fd9a` (PR #102, incremental OAuth write authorization).
- The intervening diff touches four OAuth/documentation/test files; the reviewed categorization paths are unchanged. Preserve that OAuth work.
- Original verification: 71 existing categorization tests passed and four additional checks reproduced bugs. Those four checks asserted defective behavior and must become tests of corrected behavior, not be copied as passing acceptance tests.
- The repository deploys on push to main. Do not push directly to main or merge the implementation PR as part of implementation.
- Deployed Cloud Scheduler state, active ChatGPT schedules, production data distribution, and API-account billing were not inspected. Check these during the appropriate rollout stage; do not assume code exports mean a schedule is currently active.

## 2. OpenAI access and cost decision

### Verified product distinction

ChatGPT subscription sign-in and OpenAI Platform API-key authentication are separate. A Plus subscription can support Codex development within the plan's usage limits. It is not an API credit balance, and there is no Plus subscription API key that makes Firebase's Responses API calls free. API-key use is billed through the Platform account. Official documentation also describes Codex automation access tokens for Business and Enterprise; these are not a Plus entitlement or a replacement credential for general Responses API calls. [S1–S3]

GPT-6 Sol is documented as `gpt-6-sol`, supports `reasoning.effort: "high"`, structured outputs, and Responses API web search. Account availability must still be checked before paid live testing. [S4]

### Implement two explicit operating modes

| Mode | Where model work runs | Extra model API charge | Behavior |
|---|---|---|---|
| Subscription-assisted — default | ChatGPT through the existing Free Lunch MCP connector | No Free Lunch model API calls; ChatGPT plan limits still apply | App performs deterministic categorization and queues uncertain merchants. ChatGPT can retrieve the queue, search, and submit evidence/proposals or execute user-authorized corrections through the same command service. |
| OpenAI backend — optional | Firebase background workers using an OpenAI Platform project key | Metered API tokens and tools | App automatically researches unresolved merchants after import, with limits, deduplication, caching, and an explicit monthly budget. |

No claim of unlimited or always-on subscription automation. Existing ChatGPT scheduled reports may be retained where supported, but their actual tool access, write permissions, delivery behavior, and model selection must be validated. Do not promise that a scheduled ChatGPT task will run GPT-6 Sol High merely because those words appear in its instructions. Interactive agent selection and backend API model configuration are separate controls.

Do not build a proxy around ChatGPT session cookies, extracted login tokens, or undocumented subscription endpoints. A trusted, supported local Codex workflow is a separate option, but it is not a dependable Firebase inference service and is outside this implementation.

### Default configuration and cost controls

- New installation/default mode: `assisted`, backend inference disabled, model budget USD 0. Deploying the code must not create paid calls.
- Existing legacy provider jobs remain controlled by an explicit transition setting until cutover; never silently claim they are free or migrated.
- Include the fully functional OpenAI adapter and mocked integration tests in the PR. A missing key must not block deterministic categorization, editing, imports, or PR creation.
- Activation requires a Platform project key stored in Google Secret Manager plus an owner-selected positive budget. Credentials are entered through trusted setup, never committed or pasted into the PR.
- Suggested initial optional budget: USD 5/month for categorization research, with a separate allowance for backend narrative reports if enabled. This is a proposal, not spending authorization or a guaranteed monthly forecast.
- Account for input, cached input, output/reasoning tokens, web searches, and retries. Record actual usage per job. Use reservation accounting to prevent concurrent workers admitting work beyond the configured allowance; reconcile reservations after completion. If usage is unknown after a timeout, hold the reservation until reconciled.
- Enforce bounded request sizes, output allowances, tool use, and retry counts. Refuse new work when the remaining budget cannot cover a conservative request allowance. Provider billing may lag and hosted-tool token sizes vary, so describe the app budget as an admission control with bounded in-flight exposure, not an absolute provider billing guarantee. Use applicable Platform spend controls too.
- Do not silently downgrade difficult research to a weaker model when the budget is exhausted; queue it and explain why. No automatic paid-provider fallback in assisted mode.
- Firebase, storage, queue, and email costs remain separate in either mode.

### Initial model policy

| Workload | Proposed configuration | Rationale |
|---|---|---|
| Coding the implementation | GPT-6 Sol, high | Explicit user choice; selected in the agent runtime, not encoded as an app credential. |
| Known merchant / confirmed preference | No LLM | Deterministic, repeatable, no inference cost. |
| Difficult merchant research | `gpt-6-sol`, high, Responses + `web_search` | Strong reasoning and source-backed identity resolution. |
| Mapping already-established merchant facts | Deterministic mapping first; Sol medium only if needed | Avoid another model call when the taxonomy mapping is clear. |
| Daily/weekly report narrative, if backend enabled | Sol medium daily; Sol high weekly/on-demand | Metrics are computed by code; model explains changes. Keep configurable and evaluate. |
| Advisor memory | Deterministic facts + explicit user decisions; model suggestions only for interpretation | Prevent recurring inference charges and speculative memories. |

Keep model, reasoning, prompt version, output schema version, and tool settings in a central workload policy. Do not introduce Luna routing until evaluation supports it; there is no need to add a cheaper-model tier before basic quality is proven. Do not silently substitute another model if Sol is unavailable.

Illustrative price calculation, not a quote: the checked Sol Standard short-context rates are USD 2/million input tokens and USD 10/million output tokens; web search is USD 10/1,000 calls plus search-content tokens. A research item with 5,000 total billed input tokens, 2,000 billed output tokens including reasoning, and two searches would be approximately USD 0.05; 100 such items would be approximately USD 5. Longer reasoning, larger search results, retries, report generation, taxes, and infrastructure change the total. Recheck pricing at activation. [S4–S5]

## 3. Non-negotiable behavior

1. A transaction-specific override wins over every background job and merchant rule.
2. Explicitly confirmed merchant rules win over built-in data and model proposals, regardless of whether confirmation came from the app or ChatGPT.
3. A matching deterministic decision terminates classification even if it requires no database write.
4. Automated decisions never bypass category existence/assignability, transaction-version, rule-version, or policy-version checks.
5. Preview, historical application, and future imports use the same merchant matcher and rule evaluator.
6. Bulk rule application is not recorded as a collection of unrelated manual exceptions.
7. Unknown, intentionally uncategorized, model uncertainty, technical failure, and processing are distinct states.
8. Split allocations, transfers, refunds, reimbursements, and excluded transactions retain their financial meaning. No model may change amounts, dates, accounts, exclusions, or reimbursement state.
9. All-history counts and matching are complete and paginated; no hidden 500-row limit defines scope or disables actions.
10. Jobs and commands are idempotent and resumable. No global atomicity is promised across thousands of documents.
11. No paid inference occurs without a configured enabled mode and budget admission.
12. Existing user decisions and advisor memory are preserved conservatively during migration.

## 4. User experience specification

### Transaction correction

Keep the current transaction edit sheet and searchable category picker. Choosing a category stages the categorization decision locally; it no longer immediately saves only the current transaction. Do not alter unrelated note/tag editor behavior unnecessarily.

Show one compact scope panel before Save:

- **This transaction** — always included.
- **Also update past transactions from this merchant** — eligible count, date scope, and View matches.
- **Use this category for future transactions** — creates or updates a real enabled merchant rule.

For a confidently identified specialist merchant, visibly recommend past + future. For mixed-purpose merchants, payment processors, transfers, or conflicting identity, default to current only. Remember a deliberate household preference, not an accidental checkbox state across unrelated merchants.

Preview includes eligible records, already-correct records, protected individual exceptions, split transactions, identity ambiguities, and excluded/conflicting matches. Use full-history scope by default when “past” is selected; allow a date range in the expanded preview. Never treat the visible transaction page as complete history.

One Save commits the current correction and selected future rule and creates any historical job. For large history: “Saved. Updating 143 earlier transactions…” with persistent progress. On completion: “Updated 143; kept 4 individual exceptions; skipped 2 splits.” Counts are computed, not guessed. Separate partial completion from failure. Offer View affected and Undo.

If preview becomes stale, do not silently apply to newly included rows. Refresh/review the impact or skip changed records and report them according to the command contract below. Mobile double taps, reconnects, and browser retries reuse the operation ID.

### Individual exceptions and revised merchant rules

- “This transaction only” creates an override. Clearing an override returns control to applicable rules/automation through an explicit action.
- “Leave uncategorized” is a deliberate override. “Ask AI to identify it” is a separate action that can reconsider it without silently committing a guess.
- Changing a merchant rule offers a preview of its prior assignments and other eligible history; assignments from its prior version can be updated. Individual exceptions stay protected.
- An advanced preview may include individually selected exceptions, with explicit intent and exact IDs. A generic “all previous” action must not silently include them.
- A current split transaction opens the split editor; merchant-wide category changes skip split allocations. Converting a split to one category requires the existing explicit split-removal flow.

### Review queue and rules screen

Add a merchant-grouped Needs review surface next to transactions, with complete counts and pagination. Show suggested category, evidence, plain-language reason, and affected spend/count. Prioritize material budget impact and repeat transactions. Never display a model's self-reported confidence as established statistical accuracy.

Provide Accept, Choose another category, Leave unresolved, and Remember preference. Technical errors get Retry; uncertainty gets a request for context. A dismissed question is not repeated until new evidence or a meaningful change arrives.

Rules screen supports search, edit, enable/disable, impact preview, conflict explanation, last-used date, and delete/archive. Prefer merchant selection to a regex editor. Legacy regex rules remain readable and safely evaluated; do not expand regex authoring without a bounded, tested evaluator.

### Assisted-mode behavior

Unknown merchants display “Needs identification” and can be handled through ChatGPT with the connector. Provide a copyable task prompt and direct queue access through MCP; do not fake a “Run in ChatGPT” deep link or a completed research status. Category editing and rules always work in-app. Backend AI buttons in assisted mode explain how to use the queue rather than pretending to launch a server model.

## 5. Domain model and migration contract

Use additive schema version 2. Keep existing flat `categoryId`, `categorySource`, and confidence fields as compatibility projections while the new metadata becomes authoritative. The implementer may adjust filenames/types to repository conventions, but preserve these semantics.

| Entity | Essential fields / responsibility |
|---|---|
| Transaction categorization | `schemaVersion`, `decisionVersion`, `state`, `origin`, `override`, `ruleId`, `ruleVersion`, `merchantId`, `merchantIdentityVersion`, `taxonomyVersion`, `operationId`, evidence reference, decision timestamp. Category ID remains projected at the existing location. |
| Merchant identity | Household-scoped ID, canonical name, verified aliases, service discriminator, country/locality where useful, identity status, evidence version. Separate payment processor from merchant. |
| Merchant evidence | Business type, official domain, source URLs/titles, concise supporting facts, fetched time, expiry, model/prompt versions, actual tool provenance, identity uncertainty and conflicts. No raw bank statement. |
| Rule | ID/version, enabled, target field/merchant, normalized predicate, optional direction/service/context, assignable category ID, explicit priority/specificity, confirmed status, creation origin, timestamps. |
| Taxonomy mapping | Stable semantic code → household category ID, version, archived/assignable state. Names may change without changing semantics. |
| Proposal | Owner/actor, selected category/scopes, matching-policy version, rule/taxonomy versions, immutable candidate snapshot entries, counts, expiry, state. |
| Operation/job | Type, owner, idempotency key, status, cursor, lease, counters, attempt count, error class, request/config hash, timestamps, cancellation marker. |
| Audit event | Transaction ID, before/after categorization fields, expected and resulting decision versions, actor/origin, operation and rule references. Enables conditional undo. |
| Advisor decision | User-confirmed fact/preference/acknowledgment, scope, referenced transactions/merchant, date range, reason, expiry/reopen conditions, actor and version. |

Recommended states: `assigned`, `suggested`, `unresolved`, `processing`, `failed`, `intentionally_uncategorized`. Keep model proposals separate from the effective category: a failed research retry must not erase a valid existing assignment. Use orthogonal job status where needed rather than making every background refresh turn an assigned transaction into unresolved.

Origins include user override, confirmed rule, built-in merchant mapping, researched merchant policy, model suggestion, import structural classification, and legacy unknown. “Manual” is not the only protection signal.

### Legacy conversion

- Existing manual transactions remain protected as `legacy_manual`. The previous bulk path erased the distinction between bulk and individual manual decisions; do not infer permission to overwrite them.
- Null category, `none`, and the `uncategorized` sentinel normalize to unresolved unless there is explicit evidence of intentional clearing. Ambiguous legacy clearing remains protected and visible for review rather than silently guessed.
- A category ID that no longer exists becomes a repair candidate, preserving its previous value in migration/audit metadata.
- `isLearned:false` rules can retain explicit precedence. `isLearned:true` may represent ChatGPT instructions or other learning; use reliable creation/audit provenance if available. Otherwise label legacy status and request one-time rule review rather than treating all learned rules as user-approved or discarding them.
- Keep IDs, bank/raw records, tags, notes, split allocations, budgets, and memory documents. Migration scripts are idempotent and support dry run, checkpoints, resume, and a manifest of changes.

## 6. Deterministic engine

Implement a pure evaluator with a typed result, independent of database writes and providers. Inputs include normalized transaction context, active rules, merchant identity/evidence, category registry, and versions.

Evaluation order:

1. Respect explicit override, intentional uncategorized, split/structural protections.
2. Apply confirmed user rules, ranked by explicit priority, target specificity, then deterministic tie-break. Show conflict diagnostics; do not silently rely on array insertion order.
3. Resolve a canonical merchant/service using verified exact aliases and boundary-aware patterns. Prefer specific service matches; Uber Eats must be distinct from Uber rides.
4. Apply an exact stable taxonomy mapping for a trustworthy merchant/business type and relevant context.
5. Use valid cached researched evidence under the calibrated application policy.
6. Return a proposal or unresolved result; enqueue research only when eligible.

Remove bidirectional substring category resolution. Provide an explicit migration table for every existing merchant slug to a semantic code and its default category ID. If a user removed or remapped the category, abstain or use their explicit mapping. Leaf eligibility means no active children, including root leaves such as Pets; parent categories with children are not assignable. The sentinel Uncategorized is never a successful model assignment.

Match exact rules against the chosen field, not description concatenated with counterparty. Safely normalize casing, Unicode and whitespace, but do not merge merchants solely by fuzzy spelling. Store candidate aliases until evidence or user confirmation resolves identity. Treat PayPal, Mollie, Adyen, and similar intermediaries separately from the underlying seller. Bank names alone do not establish fees.

Existing structural transfer/credit-card settlement classifications must not be undone by generic merchant matching. Refund category inheritance may use a confidently linked original transaction; sign alone is insufficient. Preserve current reimbursement and exclusion accounting semantics and cover them in regression tests.

## 7. Shared command service: app and MCP

Both Firebase callable handlers and MCP tools call the same domain service. They perform their existing authentication/owner resolution first; MCP continues to require `finance:write` before any mutation. Do not expose a caller-controlled data-owner bypass.

### Proposed commands

| Command | Contract |
|---|---|
| `previewCategorizationChange` | Input: transaction ID + expected decision version, category ID or explicit clear action, current/past/future scopes, date filters. Returns proposal ID/state, authoritative counts and paginated matches/exclusions. |
| `applyCategorizationChange` | Input: proposal ID + idempotency key. Revalidates authorization, versions and category; commits current decision + future rule + historical-job/outbox in a small atomic transaction. Returns operation ID and per-scope status. |
| `getCategorizationOperation` | Returns durable progress, outcomes, exclusions, partial errors, and undo availability. |
| `undoCategorizationOperation` | Conditional restoration of that operation's effects; does not overwrite later user work. |
| `listCategorizationReview` | Complete paginated merchant groups and accurate aggregate counts. |
| `requestMerchantResearch` | Queues paid research only when allowed, otherwise returns assisted-mode instructions/queue state. |
| `submitMerchantResearch` | Accepts evidence/proposal from an authorized ChatGPT workflow; records provenance and validates content. It is not implicit permission to create a future rule. |
| `upsertRule` / `setRuleEnabled` / `archiveRule` | Versioned rule lifecycle with impact preview when affected history is requested. |
| `recordAdvisorDecision` | Narrow explicit financial acknowledgment/preference write, with version and scope. No arbitrary memory-document replacement. |

Keep old MCP tool names as compatibility wrappers. `recategorize_transaction` remains an explicitly requested current/selected-ID correction unless a new scope is supplied; do not silently expand it. `create_rule` must create a confirmed user rule with the same semantics as the app when the user explicitly instructed it. Return structured outcomes and explain skipped items; do not report broad success for zero changes.

### Preview and large-history execution

Resolve history by indexed merchant ID. During legacy indexing, use bounded cursor scans with a visible preparation state. A proposal is not ready until its candidate set and counts are complete; store candidate IDs/decision versions in chunk documents or entries, not one oversized Firestore document. Bind category, rule, taxonomy and matcher versions. Default proposal expiry: 15 minutes, configurable.

At apply time, current transaction and selected future rule must still match preview versions or the command returns a conflict without partial setup. Historic records changed since preview are skipped with reasons. Records imported after the historical snapshot are not silently added to past scope; if future scope was selected, the new rule handles them.

Persist the operation and dispatch outbox atomically, then enqueue work idempotently. Future rule becomes active once the current/future command commits; historical completion is separately visible. Use a Firestore outbox trigger with idempotent Cloud Tasks dispatch and a periodic repair sweep for stranded outbox entries.

Use task leases, bounded pages, and retryable chunk progress. Start conservatively at 100 transactions per chunk: audit events, counters, and writes also consume Firestore limits. Re-read transaction/rule/policy versions inside each commit transaction. Never hold a Firestore transaction open while awaiting a model or web search.

Undo first cancels outstanding work and advances operation generation so in-flight jobs cannot commit afterward. Restore only records whose current decision version belongs to the operation being undone. Revert/archive a created/updated rule only if its version is still unchanged. Include later transactions attributable to that rule operation when safe; preview those impacts and retain later manual edits. Report undo conflicts and partial restoration. Retain auditable changes for an initial 90-day configurable undo window; do not imply infinite undo after retention expires.

## 8. Merchant research implementation

### OpenAI adapter

Add a small typed provider boundary under `functions/src/ai/`, with operations for merchant research, structured classification, report narrative, and memory suggestions. Use the official OpenAI SDK and Responses API. Configure `model: "gpt-6-sol"` and `reasoning: { effort: "high" }` for research. Use `web_search`, not an invented search function or a model-only claim to have searched. [S4, S6]

Prefer two explicit stages: (1) research with web-tool events, sources and citations; (2) strict structured extraction of the collected evidence into the merchant schema. The second stage has no search or write tools. This keeps citation provenance separate from model-produced JSON and avoids assuming every web-search/output-schema combination works identically. A one-response optimization is allowed only after a compatibility test preserves all evidence and validation behavior.

Structured outputs use the Responses `text.format` JSON-schema contract, with server-side validation after parsing. Handle refusals, incomplete/truncated responses, tool failures, missing evidence, invalid enum values, foreign category IDs, duplicate/out-of-range transaction IDs, and non-finite confidence. Do not treat schema compliance as factual correctness. [S7]

The provider emits proposals only. Deterministic code applies policy and writes through the shared service; a model never receives database/admin credentials or an unconstrained finance-write tool.

### Research job policy

- Research sanitized merchant name, service and relevant country/city. Strip account numbers, person names where not a public business, bank references, card fragments and unrelated transaction details. Do not search private person-to-person transfers.
- Deduplicate by household + candidate merchant identity + research-policy version; identity collisions remain separate. Start with household-scoped cache to avoid cross-household data sharing.
- Prefer the official merchant domain. Confirm identity using locality, legal/trading names, and independent sources when ambiguous. Do not auto-merge aliases from an unsupported claim.
- Store evidence URLs observed in actual search output, supporting facts, provenance, date, uncertainty and business type. Never accept a URL invented by the model as proof.
- Treat website text as untrusted input. It cannot change rules, enable billing, request secrets, or instruct the agent to mutate data. If a custom fetcher is required, enforce HTTPS, public-address resolution, redirect limits and response-size limits to prevent SSRF; avoid adding a fetcher when hosted search suffices.
- Suggested starting limits: one active research worker per household, a bounded provider request deadline, at most three transient attempts with exponential backoff/jitter, and a small enforced search/tool budget. Confirm the SDK/API's actual supported tool-call limit during implementation; a prompt instruction alone is not an enforceable cap. Do not port Anthropic's `max_uses` parameter to OpenAI by name.
- Cache confirmed identity evidence for 90 days; unresolved/no-result research for seven days. These are tunable initial policies. An explicit correction, merchant conflict or changed identity invalidates the relevant entry immediately. Expired evidence does not erase user rules.
- Use fresh transaction/rule/taxonomy versions at application time. A newly created user rule overrides a research result started earlier.

### Application policy

Keep identity certainty and category fit distinct. Initial automatic application requires an unambiguous merchant/service, sufficient source-backed evidence, one valid category mapping, no user-rule conflict, no mixed-purpose warning, no protected financial structure, and successful held-out evaluation. Numeric self-confidence alone is insufficient.

Start model-derived decisions as suggestions in shadow mode. Enable automatic application only for evaluated cohorts; ambiguous marketplaces, gifts, processors, private transfers, and missing mappings remain review items. A source proving that Deloox sells beauty products does not prove whether a specific purchase was a gift.

Assisted submissions use the same schema, audit trail, precedence and validation. Record them as ChatGPT-submitted evidence rather than falsely claiming the backend observed the web-search trace. Without server-verifiable evidence, they remain proposals unless the user explicitly confirms the category/rule.

## 9. Integrate all import and repair paths

Route bank manual sync, scheduled sync, credit-card/ICS imports, explicit recategorization, and newly created uncategorized manual transactions through the same evaluator/queue policy. Import deterministic decisions immediately and enqueue eligible research durably. Imports must succeed even when the provider is unavailable or the budget is zero.

Preserve create-only bank synchronization and existing ICS deduplication/settlement behavior. Backfill merchant identities with cursor-based jobs. Do not launch a research request for every historical transaction; research each unique unresolved identity once, then evaluate eligible records against that evidence.

Replace “AI categorize all” with an explicit review/re-evaluate action that preserves manual decisions and confirmed rules. Provide separate deterministic repair and unresolved-research actions. Clear obsolete failure markers on successful resolution; retaining a valid category while a research retry fails is allowed and must not be represented as lost categorization.

Use actual shared-state queries or a correctly maintained/reconciled summary for counts. Include all history, root-leaf categories, missing category references, legacy sentinels, and technical failure groups. Avoid overlapping states causing double counts.

## 10. Full Anthropic workload migration

The repository contains more than the categorizer. Inventory must include every live call site, scheduler, secret binding, and UI affordance. The checked baseline includes:

| Existing location | Work | Required disposition |
|---|---|---|
| `categorization/llmCategorizer.ts` | Haiku classification | New provider boundary and research/evaluation policy. |
| `shared/syncConnection.ts`, sync handlers, `recategorizeTransactions.ts` | API-key-dependent fallback orchestration | Durable provider-independent queue; zero-budget imports remain functional. |
| `handlers/generateDailyInsight.ts` | Haiku scheduled report + email | Keep ChatGPT delivery as preferred mode; optional OpenAI backend narrative with deduplication. |
| `handlers/generateWeeklyInsight.ts` | Sonnet scheduled report | Same explicit report-owner mode; preserve memory refresh dependencies. |
| `handlers/generateOnDemandInsight.ts` | Sonnet in-app analysis | OpenAI adapter in paid mode; deterministic summary/ChatGPT path in assisted mode. |
| `handlers/refreshAdvisorMemory.ts` | Manual memory refresh | Deterministic fact refresh; optional model suggestions without overriding user decisions. |
| `shared/memoryManager.ts` | Haiku consolidation and micro-updates | Split derived facts, confirmed user decisions, and model hypotheses; provider-neutral optional interpretation. |
| `shared/llmJson.ts`, `config.ts`, `index.ts`, dependency manifests, deployment/docs | Anthropic-specific utility/configuration | Replace active defaults and bindings; remove unused SDK/secret references after verified cutover. |

### Reporting and context continuity

Keep calculations in shared code. Return exact local-day spending, monthly spending versus explicit target, material anomalies, data freshness/last successful sync, and unresolved impact. Use Europe/Amsterdam boundaries converted explicitly to UTC; a scheduler timezone alone does not make `startOfDay(new Date())` use Amsterdam. Cover DST, midnight, booking-date versus transaction-date policy, refunds, transfers and splits.

Unify the affected MCP report aggregates with the app's canonical aggregation rules; do not let a categorization fix produce different budget totals in ChatGPT and the app. Distinguish observed figures from projections, and missing targets from zero targets. If today's imports are stale, say so; do not equate an empty query with verified no spending. A day without transactions can still have a meaningful month-to-date update.

Keep advisor memory in Free Lunch. Deterministically refresh transaction-derived totals, recurring observations and merchant facts. Store explicit acknowledgments independently, such as “This one-off expense is understood and accepted for September.” Suppress repeated commentary about that same event while still including its real budget impact. Reopen only on a new event, an agreed threshold/date, or an expired acknowledgment. Preserve goals and personal decisions across refreshes; model hypotheses cannot overwrite them.

ChatGPT's general conversational memory is not automatically available to Firebase. Use the narrow MCP decision-write command to persist relevant context explicitly. Do not copy all conversations into finance memory. Preserve existing report delivery destinations; do not add new recipients or enable emails as a side effect of migration.

Assign a single narrative/delivery owner per daily/weekly report: `chatgpt`, `backend`, or `disabled`, plus a local-period deduplication key. Inspect existing scheduled tasks before any changes. Validate replacement outputs and memory maintenance, then disable old Claude schedules and remove their active secret dependencies. Report what's retired versus merely implemented but disabled. Do not leave duplicate emails or hidden Anthropic bills.

## 11. Security, compatibility and deployment design

- Preserve owner/editor/viewer enforcement, the deliberate `SINGLE_USER_ID` boundary for MCP/scheduled household reports, and PR #102's incremental OAuth challenge. New app endpoints resolve the household from authenticated identity.
- Keep OpenAI secrets server-side. Browser bundles, Firestore client-readable documents, model inputs, logs, CI output and PRs must never contain them.
- New evidence/audit/job collections have explicit Firestore access rules. Clients cannot mint trusted model provenance, change worker leases, write confirmed-rule metadata directly, or alter budget accounting.
- Migrating category/rule writes to server commands requires a staged security change. Initially add new handlers and compatibility projections; release the new client; enforce a minimum supported client version/reload before denying legacy direct category/rule field edits. Protect v2-only fields from the start. Do not disable broad transaction writes without accommodating existing notes/tags/split handlers. Then tighten protected-field rules and test older cached PWA behavior.
- Category deletion becomes versioned archive/reassignment. Mark the category retiring, prevent new assignments, migrate rules, mappings, transactions and split references in a resumable job, and retain a readable tombstone until no references remain. Handle affected budgets explicitly. Do not hard-delete a referenced category halfway through migration.
- Provision required indexes before dependent code: merchant/date/ID pagination, review state/date, active rules, operations, research/outbox status, and audit-by-operation. Confirm exact queries and index definitions in the implementation; do not index large evidence blobs.
- Use `onTaskDispatched`/Cloud Tasks with a dedicated service account and no public unauthenticated worker entry point. Outbox/retry sweep jobs are explicitly configured. Infrastructure activation may require project permissions; document actual setup blockers rather than replacing them with unsafe public endpoints.
- Add feature switches for v2 UI, v2 evaluation, historical writes, backend research, and automatic model application. Ensure switches fail safe, and no queue backlog becomes paid immediately on accidental deployment.
- Deploy additively in the repo's schema/backend/frontend order. Because the existing workflow deploys rules first, permission tightening must be a later stage after compatible clients, not bundled as an immediately restrictive first step.

## 12. Implementation work packages and dependencies

Use one feature branch and one draft PR as requested, with reviewable commits in this order. If platform constraints make one PR impractical, explain that with concrete evidence; do not silently stop after the first package.

| Package | Work | Completion gate |
|---|---|---|
| P0 — Baseline and regression fixtures | Fresh main/worktree; read AGENTS; inventory active paths; capture existing semantics and reproduce reviewed failures with desired-outcome assertions. | Tests fail for the known defects before fixes; current behavior documented. |
| P1 — Types, taxonomy, pure evaluator | v2 metadata, exact mappings, root-leaf validation, service-specific merchant matching, rule precedence/targets, structural protections. | All deterministic review cases pass; every built-in mapping is validated. |
| P2 — Commands, concurrency, jobs, undo | Preview/apply service, idempotency, version checks, operation/audit/outbox, chunk execution and cancel/undo. | Race, duplicate-delivery, crash/resume, stale-preview and partial-undo tests pass against emulator. |
| P3 — UI and MCP parity | One-save scope panel, preview/progress/undo, rules lifecycle, review queue, compatibility wrappers and role checks. | Mobile end-to-end workflows and app/MCP equivalence pass. |
| P4 — Import parity and integrity | All import routes, complete counts, identity indexing, category lifecycle, aggregate consistency and PWA compatibility. | Bank/ICS/manual cases converge; histories beyond 500 rows work. |
| P5 — OpenAI and assisted research | Provider adapter, source evidence, structured validation, queue/cache/budget controls, assisted tools, shadow evaluation. | Mocked provider contract/failure tests pass; no paid call in default mode; gated live smoke/eval only after setup. |
| P6 — Reports, memory, Claude retirement | Explicit report ownership, optional OpenAI narratives, deterministic facts, acknowledgment persistence, schedule/call-site migration guide. | Financial totals and memory continuity tests pass; no unexpected active Anthropic route in cutover mode. |
| P7 — Migration and rollout tooling | Dry-run/resume manifests, shadow diff, telemetry, staged switches, rollback and setup runbook. | Migration twice is idempotent; concurrent-edit and rollback drills pass. |
| P8 — PR and review handoff | Complete acceptance matrix, screenshots, test evidence, limitations and operational activation steps. | Draft PR ready for independent review; no merge/deploy performed by implementer. |

P1 → P2 → P3 is the critical correctness path. P4 and P5 depend on the shared service. P6 consumes the provider and decision contracts. P7/P8 require all packages. Avoid speculative architectural sprawl: use the existing React/Firebase/MCP stack.

### Expected file areas

- Existing: `functions/src/categorization/*`, `shared/categorizationPipeline.ts`, `shared/syncConnection.ts`, `handlers/recategorizeTransactions.ts`, `handlers/importIcsStatement.ts`, sync handlers.
- New logical areas: `categorization/types`, `categoryRegistry`, `merchantIdentity`, `decisionEngine`, `commandService`, `operations`, `merchantResearch`, and `ai/openaiProvider`/`ai/workloadPolicy`. Names are illustrative; do not create redundant layers solely to match this list.
- Existing UI: `TransactionForm.tsx`, `CategoryPicker.tsx`, `useTransactionMutations.ts`, `useRules.ts`, `useCategories.ts`, `useTransactions.ts`, `SettingsCategorization.tsx`, `CategorizationRulesCard.tsx`, transaction types and query keys.
- MCP: `writeTools.ts`, `tools.ts`, `server.ts`, security scheme declarations and docs.
- Reports/memory: daily/weekly/on-demand handlers, memory manager, prompt templates, insight storage, canonical aggregators.
- Infrastructure: `firebase/firestore.rules`, actual index file, Functions dependencies/lockfile, exports/config, `.github/workflows/quality.yml`, deployment configuration and emulator/e2e fixtures.
- Migration/eval scripts and documentation under repository conventions. Do not commit private production exports or real personal financial fixtures.

## 13. Test and acceptance matrix

Tests must assert domain behavior rather than mirror implementation. Use synthetic records in the public repository. Provider calls are mocked in normal CI; emulator integration and mobile browser tests are required for the data-changing flow.

| ID | Acceptance case |
|---|---|
| C01 | IKEA → Home & Garden; Shell → Fuel/Charging; NS → Public Transit; Starbucks → Coffee & Bars; Netflix remains Streaming. |
| C02 | Uber Eats is distinct from Uber rides; processor/bank substrings do not force a merchant category. |
| C03 | Exact counterparty rule matches even if description repeats the same name; normalization does not conflate different merchants. |
| C04 | App- and ChatGPT-confirmed rules beat built-ins; already-correct rules never fall through to AI. |
| C05 | User correction during delayed AI, historical worker, or import re-evaluation remains intact; rule/category/identity edits invalidate stale work. |
| C06 | Second merchant correction updates prior rule-assigned history but retains individual and legacy-manual exceptions. |
| C07 | Low confidence, nonexistent/deleted category, uncategorized sentinel, malformed IDs and non-finite values never become successful auto-assignments. |
| C08 | Root leaf Pets is allowed; non-leaf parents and archived categories are rejected. |
| C09 | Past/future/current scopes each work independently; future rule is actually stored and applies to the next synthetic import. |
| C10 | More than 500 records: accurate preview/counts, chunk completion, no overflow; new arrivals follow selected future scope, not frozen past scope. |
| C11 | Double click/retried request produces one rule and operation; worker crash after partial progress resumes without duplicate audit or decision changes. |
| C12 | Undo cancels in-flight work and restores unchanged decisions, reports conflicts, preserves later corrections and handles changed/new rule versions. |
| C13 | Bank, scheduled bank, ICS and manual creation share policy; AI outage cannot fail the financial import. |
| C14 | Splits, transfers, CC settlements, refunds, reimbursements and exclusions maintain expected app/MCP/budget totals. |
| C15 | Owner/editor may correct; viewer/read-only MCP may not; scope escalation, cross-owner IDs and direct protected-field writes are rejected before mutation. |
| C16 | Category archive/reassign migrates transaction, split, rule, mapping and budget references; concurrent categorization cannot target a retiring category. |
| C17 | Research collects real source evidence, refuses ambiguous identity, resists malicious page instructions, deduplicates jobs and respects expiry. |
| C18 | Missing key, budget zero/exhausted, rate limit, timeout, incomplete response, refusal, invalid schema and unavailable model produce honest recoverable status. No automatic paid fallback. |
| C19 | Concurrent budget reservations and retry accounting do not admit unlimited work; uncertain billing holds its reservation. |
| C20 | Assisted evidence and explicit user confirmation are distinguished; agent-supplied URLs cannot masquerade as server-verified evidence. |
| C21 | Amsterdam midnight/DST, late sync and booking-date policy produce correct daily/MTD data and freshness messaging. |
| C22 | Acknowledged one-off remains in financial totals but is not repeatedly criticized; a materially new event reopens the topic. |
| C23 | Report delivery is deduplicated; migration preserves memory and causes no double Claude/OpenAI/ChatGPT scheduling. |
| C24 | Migration dry-run changes nothing; running apply twice makes no extra changes; protected legacy records survive and old clients cannot corrupt v2 state. |
| C25 | Category-sheet keyboard/screen reader behavior, small iPhone viewport, loading/error/partial completion, focus return and rollback work. |

CI gate: frontend typecheck/build, Functions build, lint, full unit suite, Firestore rules/emulator integration, and relevant Playwright workflows. Explicitly run finite test commands (`vitest run` or equivalent) in CI. Add actual emulator/browser jobs if the existing quality workflow does not execute them; a skipped test is not a pass.

### Model evaluation gate

Build a labeled set of independently confirmed or synthetic merchant cases, with merchant-level train/dev/holdout separation and ambiguous negative cases. Do not label examples from existing auto-categorization output. Evaluate identity precision, category precision, abstention, coverage, latency, corrections, source validity and actual cost per unique merchant. Track errors weighted by budget impact as well as count.

Proposed initial target: ≥99% precision among automatically accepted held-out cases, with zero protected-decision overwrites and zero critical transfer/split errors in the acceptance suite. Report sample size and uncertainty; a small set with no errors is not statistical proof of 99% production precision. If evidence is insufficient, ship research in suggestion-only mode. No artificial coverage target should force guesses.

## 14. Rollout, historical repair and rollback

1. **Prepare:** capture current schema/version counts, export a recoverable backup privately, inventory schedules/delivery and billing, create required secrets only through approved setup, and provision indexes/tasks. Choose assisted mode by default.
2. **Deploy additive backend:** v2 readers/commands and compatibility fields with flags off; no historical writes and no paid research. Validate role/OAuth and legacy client behavior.
3. **Shadow:** evaluate existing eligible data without updating categories. Group differences into known-bug repairs, new suggestions and protected legacy decisions. Measure report/budget impact.
4. **Enable UI + deterministic future decisions:** canary on the household with small reversible cases, one-save flow and future-import tests. Enforce compatible-client refresh before tightening old writes.
5. **Historical repair:** present a complete preview and operation manifest. Repair selected unprotected deterministic mistakes first. Keep manual/legacy-manual records unchanged unless explicitly selected. Apply chunked, auditable, undoable changes.
6. **Research:** assisted queue works immediately. If the user enables paid mode, perform a bounded live Sol/web-search/structured-output smoke test, run evals, then start suggestion-only research. Enable automatic application only for cohorts that pass the gate.
7. **Reports and retirement:** verify replacement daily/weekly/on-demand behavior, memory and single delivery; disable legacy Claude jobs and remove active Anthropic bindings/dependencies when no live consumer remains. Keep historical audit evidence intact.
8. **Monitor:** inspect initial imports and jobs, then the first daily report and a weekly comparison. Track stale-write conflicts, unresolved/error counts, job age, correction rate, report discrepancies, duplicate deliveries and costs. Do not log raw financial descriptions unnecessarily.

Rollback switches stop new research and automatic writes while preserving manual editing and imports. Cancel/fence in-flight tasks. Roll back UI/provider independently; v2-aware compatibility readers must remain available. Rolling back code alone does not undo category data: use the operation audit with version checks. Do not automatically re-enable a paid Claude fallback during rollback. If a report path fails, retain deterministic metrics and show unavailable narrative rather than inventing a successful report.

The PR may be complete with optional paid activation pending. It is not complete if core acceptance tests, migration safeguards, UI scope behavior or server authorization are missing. Distinguish implementation completion, deployment readiness, migration completion and paid-provider activation in status reporting.

## 15. GPT-6 Sol High implementation handoff

Use this brief with the actual runtime explicitly configured to `gpt-6-sol`, reasoning `high`. Verify the selected runtime; do not merely state the model in prose and assume a switch occurred. If unavailable, report that and wait for an explicit model choice rather than silently substituting.

> Implement the complete Free Lunch categorization and OpenAI migration plan in this document. Work from freshly fetched `fernandovdutra/free-lunch` main in an isolated worktree and branch `feat/categorization-v2-openai` (or a unique equivalent if occupied). Read applicable AGENTS.md files first. Reconcile changes since planning baseline `eed35ee`, preserving unrelated work and the incremental MCP OAuth protections.
>
> Add this plan to repository docs and maintain a package/acceptance checklist as you work. Deliver P0–P8 in reviewable commits and one draft PR. Implement the OpenAI provider and both operating modes, with no paid model calls by default. Use synthetic fixtures; never commit private financial data or secrets. Do not enable billing, run production repairs, alter live schedules, merge, or deploy as part of the implementation task.
>
> Run the required unit, integration, role/security, race, migration and mobile end-to-end checks. Test expected correct outcomes for the original defects. If live provider testing is unavailable, use mocked contract tests, document the exact remaining activation test, and continue all other work. Core missing capabilities are blockers to report, not permission to replace persistent rules with client-only bulk updates.
>
> Return the PR URL, exact head SHA, package completion and C01–C25 matrix, tests/results and any skips, mobile screenshots, migration dry-run evidence, config/setup instructions, and precise operational limitations. Stop at the draft PR and hand it back for independent review.

### Independent review checklist

The review agent checks the actual PR head against this plan and fresh main, not just the implementation agent's summary. Inspect the critical race, transaction, rule and authorization paths; reproduce representative defects; verify CI including emulator/E2E results; check scope/defaults and no paid calls by default; inspect migration and rollback; and confirm every Anthropic consumer is migrated, intentionally retained during transition, or retired with no hidden active billing.

Return concrete findings with severity and code locations. Ask the implementation agent to fix blocking findings and repeat affected verification. Merge/deploy is a separate subsequent decision after review; the repo's main-branch workflow makes that distinction operationally important.

## 16. Decisions already made and later setup gates

**No clarification needed to build:** retain React/Firebase/MCP, one shared domain service, user decisions first, GPT-6 Sol High for implementation, Sol High for optional research, assisted mode as default, no paid fallback, protect unknown legacy provenance, one draft PR for review.

**Only needed to activate paid automation later:** an OpenAI Platform project with Sol/tool access, a safely provisioned key, the user's chosen positive budget, infrastructure permissions, and passing bounded live tests/evals. These are deployment gates, not reasons to stop implementing and testing the rest of the plan.

**Only needed before production history changes:** a fresh complete impact preview and authorization for the concrete repair operation. Approval of this implementation plan is not permission to overwrite protected historical choices.

## Official references checked on 23 September 2026

- **S1 — Authentication:** https://learn.chatgpt.com/docs/auth — ChatGPT subscription versus API-key access and separate Platform billing.
- **S2 — Codex pricing/access:** https://learn.chatgpt.com/docs/pricing — Plus model access, included usage and limits.
- **S3 — Access tokens:** https://learn.chatgpt.com/docs/enterprise/access-tokens — supported workspace automation-token scope and plans.
- **S4 — GPT-6 Sol:** https://developers.openai.com/api/docs/models/gpt-6-sol — model ID, effort levels, supported tools/features and rates.
- **S5 — API pricing:** https://developers.openai.com/api/docs/pricing — model/tool charges; verify again before activation.
- **S6 — Responses web search:** https://developers.openai.com/api/docs/guides/tools-web-search — hosted search, sources and citations.
- **S7 — Structured outputs:** https://developers.openai.com/api/docs/guides/structured-outputs — Responses JSON-schema output and refusal handling.
- **S8 — Model migration guidance:** https://developers.openai.com/api/docs/guides/latest-model — GPT-6 configuration and Responses tool-calling guidance.

Product documentation establishes supported capabilities, not this account's live entitlement, deployed settings, provider spend, or measured quality. Those remain explicit implementation/activation checks.
