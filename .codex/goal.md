# Goal Ledger

## GOAL-001: Audit Reliability Lab MVP

**Status:** `in_progress`
**Started:** 2026-07-12T16:00:00Z
**Updated:** 2026-07-13T09:01:31Z

### Outcome

Build a supplier-audit AI reliability system that extracts findings from audit reports, validates evidence, generates corrective actions, turns human reviewer corrections into permanent regression tests, and blocks agent versions that miss critical risks.

### Definition of Done

- [x] Monorepo scaffolded with pnpm + Turborepo
- [x] Web app (Next.js) boots and renders home page
- [x] Pipeline worker boots without errors
- [x] Drizzle schema covers all core tables, including corrections and durable grader/gate results
- [x] Seed audit loads in the audit review workspace
- [x] Agent v1 extracts structured findings
- [x] Evidence validation catches invalid citations
- [x] Human correction converts to regression test
- [ ] Evaluation suite runs 10 trusted cases
- [ ] Version comparison shows stable/improvements/regressions
- [ ] Quality gate approves or blocks candidate
- [ ] Trace viewer shows pipeline stages for failures
- [x] TypeScript strict, lint, format pass

### Scope

- T3 monorepo: Next.js web app + standalone pipeline worker
- Shared packages: db, domain, agent, evals, ui, test-fixtures
- One seeded supplier audit (RBA format)
- 10 seed evaluation cases
- Two agent versions (v1 with seeded failure, v2 with fix)

### Non-Goals

- Authentication, billing, multi-tenancy
- Real PDF processing
- Production deployment
- Full audit standard implementation

### Skills

- `senior-software-architecture` — selected for T-003 pipeline boundaries, failure modes,
  idempotency, persistence, and observability design. No repository-local skill is available.
- `senior-software-architecture` — selected for T-011 schema ownership, immutable suite/run
  snapshots, referential integrity, deletion policies, durable grading, and gate persistence.
- `senior-software-architecture` — selected for T-006 deterministic grading, idempotent execution,
  partial-failure recovery, dependency direction, and observable worker boundaries.
- `senior-software-architecture` — selected for T-013 to keep Gemini pricing at the provider
  boundary and avoid unnecessary evaluation-schema or billing-system expansion.
- `senior-software-architecture` — selected for T-015 to aggregate run cost at the persistence
  boundary instead of issuing per-run UI queries or recalculating price in the browser.
- `frontend-skill` — selected for T-015 to present model, cost, progress, and status as a restrained
  operational table consistent with the active shadcn dashboard repair.

### Subgoals

| ID     | Ticket                               | Owner       | Status      | Branch                 | Worktree                                      | Next Action                                   |
| ------ | ------------------------------------ | ----------- | ----------- | ---------------------- | --------------------------------------------- | --------------------------------------------- |
| T-001  | Monorepo scaffold                    | opencode    | COMPLETE    | main                   | main                                          | Done                                          |
| T-002  | Domain schemas + seed data           | opencode    | COMPLETE    | main                   | main                                          | Ten seed eval cases and PRD schemas exist     |
| T-002c | Schema alignment to PRD              | opencode    | COMPLETE    | feat/schema-alignment  | —                                             | Align domain schemas with PRD types           |
| T-002d | UI foundation (Tailwind+shadcn+tRPC) | opencode    | COMPLETE    | feat/ui-polish         | —                                             | Merged in PRs #3 and #5                       |
| T-009  | Pre-seeded documentation pipeline    | opencode    | COMPLETE    | feat/pre-seed-pipeline | —                                             | Gemini extraction + fixtures + DB schema      |
| T-003  | Agent pipeline                       | codex       | COMPLETE    | feat/agent-pipeline    | /Users/darshan/work/agent-eval-agent-pipeline | Merged in PR #4; remove worktree after repair |
| T-004  | Audit review UI                      | opencode    | COMPLETE    | feat/audit-review-ui   | —                                             | PR #7 merged; review actions working          |
| T-005  | Human correction loop                | codex       | COMPLETE    | feat/human-correction-loop | —                                             | Merged in PR #8                               |
| T-006  | Evaluation engine                    | codex       | IN PROGRESS | main                   | —                                             | PR #11 merged; repair async Neon adapter compatibility |
| T-007  | Version comparison + quality gates   | opencode    | planned     | —                      | —                                             | Comparison dashboard + gates                  |
| T-008  | Trace viewer + demo validation       | opencode    | planned     | —                      | —                                             | Trace UI + end-to-end verify                  |
| T-010  | Repository validation repair         | external-ai | COMPLETE    | main                   | /Users/darshan/work/agent-eval                | Lockfile regenerated, Biome replaces ESLint+Prettier |
| T-011  | Eval persistence schema foundation   | codex       | COMPLETE    | feat/eval-schema-foundation | —                                             | Merged in PR #9                               |
| T-012  | SQLite → Neon Postgres migration     | opencode    | COMPLETE    | feat/neon-postgres        | —                                             | Merged in PR #10                              |
| T-013  | Real Gemini cost accounting          | codex       | SUPERSEDED  | fix/gemini-cost-accounting | —                                             | Deferred by user in favor of UI repair        |
| T-014  | Dashboard UI repair + shadcn alignment | codex     | IN PROGRESS | feat/dashboard-ui-repair   | /Users/darshan/work/agent-eval/worktrees/dashboard-ui-repair | Claim worktree, then replace the custom shell with shadcn dashboard patterns |
| T-015  | Eval run cost + model visibility     | codex       | planned     | —                           | —                                             | After T-014/T-006, expose run summaries and render Runs table |

### Decisions

| Decision             | Choice               | Reason                                              |
| -------------------- | -------------------- | --------------------------------------------------- |
| Package manager      | pnpm 11.9            | Already installed                                   |
| Monorepo tool        | Turborepo            | PRD spec, simple caching                            |
| DB local             | Neon Postgres        | Replaced SQLite; serverless-friendly, same Drizzle ORM |
| DB driver            | neon-http            | Stateless HTTP, works in both Next.js serverless and Node pipeline |
| ORM                  | Drizzle (not Prisma) | User preference                                     |
| TypeScript           | Strict, no `any`     | AGENTS.md requirement                               |
| Formatter            | Biome (replaces ESLint+Prettier) | User preference, faster, monorepo-native     |
| T-003 model provider | Gemini               | Reuses existing SDK, key, and retrieval integration |

### T-003 Assignment

- **Outcome:** The same auditable agent pipeline used by production audit runs can be invoked by
  future evaluation runs and returns only evidence/rule-valid structured findings.
- **Definition of done:** Every audit page is processed; duplicates are merged; retrieval is
  version-scoped; invalid citations/rules/actions are rejected; valid findings and stage traces
  persist atomically; focused and repository validation gates pass without warnings.
- **Owner:** codex
- **Branch/worktree:** `feat/agent-pipeline` at
  `/Users/darshan/work/agent-eval-agent-pipeline`
- **Owned paths:** `packages/agent/**`, `apps/pipeline/**`, pipeline-specific additions in
  `packages/domain/**`, `packages/db/**`, `packages/test-fixtures/**`, and scoped dependency files.
- **Dependencies:** T-002c and T-009 (complete). T-002d is non-overlapping and awaiting merge.
- **Non-goals:** Evaluation grading, human corrections, version comparison, quality gates, and UI.
- **Verified assumptions:** SQLite/in-memory retrieval remain MVP infrastructure; Gemini is the
  real provider; tests inject a deterministic provider and do not require network credentials.
- **Validation:** focused Vitest; touched-scope ESLint/Prettier; strict TypeScript; relevant
  Turborepo build/tests; credentialed Gemini smoke test only when `GEMINI_API_KEY` is available.
- **Started/checkpoint:** 2026-07-12T12:26:38Z / 2026-07-12T12:26:38Z
- **Status/next action:** COMPLETE — merged by PR #4 at `f7b822d`; focused implementation gates
  passed. Repository-wide lint/test infrastructure is tracked separately in T-010.

### T-005 Assignment

- **Outcome:** A reviewer can approve, reject, or correct a persisted audit finding, and an explicit
  correction can atomically become a trusted regression case used by future evaluation runs.
- **Definition of done:** Seed audit data loads idempotently into SQLite; review state survives
  reloads; corrected evidence and rule references are deterministically validated; original and
  corrected snapshots persist; conversion creates exactly one trusted `HUMAN_CORRECTION` case;
  focused and repository validation gates pass without warnings or errors.
- **Owner:** codex
- **Branch/worktree:** `feat/human-correction-loop` at
  `/Users/darshan/work/agent-eval-human-correction`
- **Owned paths:** correction-specific additions in `packages/domain/**`, `packages/db/**`,
  `apps/web/src/trpc/routers/**`, audit review components/pages, Drizzle migration files, focused
  tests, and coordination journal entries. No dependency or validation configuration changes.
- **Dependencies:** T-002, T-003, T-004 foundation, and T-010 are complete.
- **Non-goals:** Evaluation execution/grading, agent comparison, quality-gate execution, trace UI,
  authentication, and generic document ingestion.
- **Verified assumptions:** SQLite is the MVP source of truth; existing fixtures seed persisted
  records but are not runtime API responses; explicit “Save as regression test” means human
  approval and creates a `TRUSTED` case; reviewer identity is out of scope.
- **Validation:** idempotent seed tests; correction validation/transaction/idempotency tests;
  router/UI behavior tests where supported; Biome check, strict TypeScript, full tests, and build.
- **Started/checkpoint:** 2026-07-12T17:57:55Z / 2026-07-12T17:57:55Z
- **Status/next action:** COMPLETE — merged by PR #8 at `19bce35`; persisted review decisions,
  corrections, and idempotent trusted regression conversion pass focused and repository checks.

### T-011 Assignment

- **Outcome:** Drizzle has one canonical schema source containing the complete durable persistence
  model required for frozen evaluation suites, executions, grader results, comparisons, and
  configurable quality-gate decisions.
- **Definition of done:** Add immutable/versioned suite membership; strengthen run/execution
  invariants; persist queryable grader results, comparison outcomes, and gate configuration/results;
  add required foreign keys, unique constraints, indexes, and safe history-retention policies;
  generate one forward-only migration and verify it from an empty database and the current T-005
  database state; focused and repository validation gates pass without new warnings or errors.
- **Owner:** codex
- **Branch/worktree:** `feat/eval-schema-foundation` at
  `/Users/darshan/work/agent-eval-schema-foundation`
- **Owned paths:** `packages/db/src/schema.ts`, `packages/db/drizzle/**`, focused DB schema/migration
  tests, and append-only `.codex/codemap.md` entries. Domain/runtime behavior changes are excluded
  unless required to preserve compilation after a schema contract correction.
- **Dependencies:** T-005 merged in PR #8; T-006 and T-007 depend on this ticket and must not edit
  the owned DB schema/migration paths concurrently.
- **Non-goals:** Evaluation execution algorithms, grader implementation, comparison UI, quality-gate
  evaluation logic, real PDF ingestion, and normalizing corrective actions into a workflow entity.
- **Verified assumptions:** `packages/db/src/schema.ts` remains the single canonical source for all
  Drizzle table definitions; generated SQL and snapshots remain in `packages/db/drizzle/**` as
  migration artifacts, not competing schema sources; SQLite is the MVP database; JSON remains
  appropriate for immutable input/output snapshots and detailed grader metadata, while searchable
  outcomes receive typed columns.
- **Validation:** migration generation and drift check; migrate empty and current-shape SQLite
  databases; DB invariant tests; touched-scope Biome; strict TypeScript; full tests and build.
- **Started/checkpoint:** 2026-07-13T05:36:14Z / 2026-07-13T05:36:14Z
- **Status/next action:** COMPLETE — merged by PR #9 at `271da86`; T-006 can now implement frozen
  suite execution and graders, followed by T-007 comparison and gate evaluation logic.

### T-006 Assignment

- **Outcome:** A selected agent version can execute a frozen suite of trusted audit cases through
  the production agent pipeline, with reproducible inputs and durable outputs, traces, usage,
  failures, and deterministic grader results.
- **Definition of done:** Only trusted cases can be frozen; a frozen suite and agent configuration
  remain immutable for the run; run creation and case execution are idempotent; each case reaches
  a terminal state without discarding other completed cases; one-to-one deterministic grading
  calculates the PRD metrics and failure types; agent and evaluator usage remain separate; the
  standalone pipeline worker can execute a persisted run; run APIs expose progress/results; a
  scripted end-to-end run passes focused and repository validation. The top-level 10-case criterion
  remains pending until a tenth case receives explicit human approval.
- **Owner:** codex
- **Branch/worktree:** `feat/evaluation-engine` at
  `/Users/darshan/work/agent-eval-evaluation-engine`
- **Owned paths:** evaluation contracts in `packages/domain/**`; `packages/evals/**`;
  `packages/db/src/eval-store.ts` and focused eval-store tests; evaluation-specific additions in
  `apps/pipeline/**` and `apps/web/src/trpc/routers/**`; scoped test-fixture assertions, package
  manifests, lockfile changes, and append-only `.codex/codemap.md` entries.
- **Dependencies:** T-003, T-005, and T-011 are complete. A separate agent is implementing Neon DB
  support, but no branch, PR, or board claim was remotely visible at claim time. T-006 must not edit
  `packages/db/src/schema.ts`, `packages/db/drizzle/**`, or database bootstrap/adapter files until
  that agent's ownership and handoff are known; any narrow export integration will be serialized.
- **Non-goals:** Version comparison, quality-gate decisions, detailed trace UI, concurrent case
  execution, automatic distributed queues, LLM-as-judge grading, real PDF ingestion, and merging
  the T-006 pull request without explicit user instruction.
- **Verified assumptions:** SQLite remains the currently integrated runtime while Neon support is
  in progress; the grader must be storage/provider independent; cases execute sequentially for the
  MVP; case-level model/pipeline failures are terminal results while run-level infrastructure
  failures fail the run; automated tests use scripted providers and make no billable Gemini calls;
  `eval-010` remains `PENDING_REVIEW` and excluded until explicitly approved by a human.
- **Validation:** focused grader/runner tests; eval-store transaction/idempotency tests against an
  isolated database; scripted worker integration for all approved cases; touched-scope Biome;
  strict TypeScript; full tests and production build; repeat affected checks after final edits.
- **Started/checkpoint:** 2026-07-13T06:56:44Z / 2026-07-13T07:20:15Z
- **Status/next action:** IN PROGRESS / MERGED BUT VALIDATION BLOCKED — PR #11 was merged as
  `14951fa` after PR #10, but its synchronous SQLite eval adapter was not ported to Neon. Repair the
  async eval store, pipeline adapters, routers, and DB-backed tests before completing T-006.

### T-012 Assignment

- **Outcome:** Replace SQLite (better-sqlite3) with Neon Serverless Postgres using the neon-http driver and Drizzle ORM, converting all 21 tables from SQLite DDL to Postgres DML, making all DB operations async, and generating fresh Postgres migrations.
- **Definition of done:** All SQLite dependencies removed; schema converted to pg-core; all store functions async; all callers updated; fresh Postgres migration generated and applied; all validation gates pass; no references to better-sqlite3 remain.
- **Owner:** opencode
- **Branch/worktree:** `feat/neon-postgres` at `/Users/darshan/work/agent-eval-neon-postgres`
- **Owned paths:** `packages/db/**`, `apps/web/next.config.ts`, `apps/web/src/trpc/routers/*`, `apps/web/src/server/review-workspace.ts`, `apps/pipeline/src/run-job.ts`, `.env`
- **Dependencies:** T-011 (complete). T-006 (evaluation engine) is in progress in a separate worktree and must not be affected.
- **Non-goals:** New features, schema changes beyond type conversion, performance optimization, new tables.
- **Verified assumptions:** User has a Neon project and DATABASE_URL. Tests will use Neon branching. Numeric columns use `mode: 'number'` to preserve existing JS number behavior.
- **Validation:** `pnpm install`, `pnpm format`, `pnpm typecheck` (10/10), `pnpm test`, `pnpm build`.
- **Started:** 2026-07-13T12:00:00Z

### T-013 Assignment

- **Outcome:** Gemini-backed pipeline and evaluation runs persist a truthful standard paid-tier
  USD cost estimate instead of always recording zero.
- **Definition of done:** `gemini-2.5-flash` and `gemini-2.5-flash-lite` costs use the official
  standard per-million input/output token rates; thinking tokens count as billable output; unknown
  models fail before a billable request; existing pipeline/eval aggregation receives the computed
  value without schema changes; focused agent checks pass; repository gates are rerun and any
  pre-existing Neon/T-006 failures are recorded without suppression.
- **Owner:** codex
- **Branch/worktree:** `fix/gemini-cost-accounting` at
  `/Users/darshan/work/agent-eval-gemini-cost`
- **Owned paths:** `packages/agent/src/gemini-provider.ts`, one small pricing module, focused agent
  tests, `.codex/codemap.md`, and this T-013 ledger section. No DB, eval schema, pipeline adapter,
  UI, fixture, manifest, or lockfile changes.
- **Dependencies:** Current `main` includes PR #10 and PR #11. Provider-local work is unblocked;
  repository-wide completion remains dependent on the separate T-006 Neon compatibility repair.
- **Non-goals:** Account invoice reconciliation, free-tier detection, caching/batch/priority rates,
  grounding fees, pricing tables in the database, dashboards, and quality-gate cost thresholds.
- **Verified assumptions:** `costUsd` is a standard paid-list estimate; the current seeded agents
  use only the two supported stable Gemini model IDs; generation uses the standard API; no response
  caching or grounding is configured; missing usage metadata represents zero recorded tokens.
- **Validation:** pricing/provider unit tests; `pnpm format`; touched agent Biome; agent strict
  typecheck and tests; repository typecheck, tests, and build; repeat affected checks after final
  edits. No credentialed Gemini call is required.
- **Started/checkpoint:** 2026-07-13T08:14:28Z / 2026-07-13T08:23:49Z
- **Status/next action:** SUPERSEDED — provider-local pricing work remains preserved in draft
  PR #12, but the user explicitly redirected active work to the Next.js dashboard UI repair. Resume
  this task later after the UI work and T-006 Neon repair settle.

### T-014 Assignment

- **Outcome:** The Next.js dashboard uses official shadcn/ui dashboard primitives and layout
  patterns instead of the current custom shell, with Tailwind v4 correctly resolving shared
  `@repo/ui` classes so styling remains stable and is not lost to source-scanning gaps.
- **Definition of done:** The web app's Tailwind/shadcn monorepo wiring matches current official
  guidance; shared UI source paths are explicitly included from the app stylesheet; the dashboard
  layout uses shadcn sidebar/breadcrumb/sidebar-inset composition; the main dashboard screens use
  consistent shadcn components and remove ad hoc placeholder UI where possible without changing
  backend behavior; focused validation and repository gates pass with no new warnings.
- **Owner:** codex
- **Branch/worktree:** `feat/dashboard-ui-repair` at
  `/Users/darshan/work/agent-eval/worktrees/dashboard-ui-repair`
- **Owned paths:** `apps/web/src/app/**`, `apps/web/src/components/**`, `apps/web/components.json`,
  `apps/web/src/app/globals.css`, relevant `packages/ui/src/components/ui/**`, and append-only
  `.codex/codemap.md` entries. No database schema, pipeline, eval, or domain-logic changes.
- **Dependencies:** Existing data APIs and Neon migration work on `main` must remain untouched.
  T-006 async Neon repair stays separate and must not be mixed into this ticket.
- **Non-goals:** New backend features, schema changes, seeded data changes, pipeline logic,
  evaluation grading, or trace persistence behavior.
- **Verified assumptions:** The user explicitly wants shadcn ready-to-use dashboard UI preferred
  over custom components; Tailwind v4 is the intended runtime; browser-plugin automation is
  unavailable in-session, so validation will rely on the local dev server, compiled CSS/HTML, and
  standard app checks.
- **Validation:** `pnpm format`; focused `pnpm --filter web typecheck`, `pnpm --filter web test`,
  and `pnpm --filter web build`; local dev-server HTML/CSS checks for shared classes and dashboard
  rendering; then full `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- **Started/checkpoint:** 2026-07-13T08:24:15Z / 2026-07-13T08:24:15Z
- **Status/next action:** IN PROGRESS — publish this board claim on `main`, create the dedicated
  worktree, append the assignment acceptance to `.codex/codemap.md`, then implement the shadcn
  sidebar/dashboard shell and Tailwind source hardening.

### T-015 Assignment

- **Outcome:** After every evaluation run, the Runs screen shows the frozen Gemini model used and
  the persisted USD cost produced by that model, alongside run status and progress.
- **Definition of done:** The run-list API returns one server-aggregated summary per run containing
  frozen agent version name/model, progress counts, summed agent cost, summed evaluator cost, and
  latency; the Runs page renders loading/error/empty states and a shadcn table with model and cost
  visible without opening a run; small non-zero costs do not round to `$0.00`; focused and root
  validation gates pass.
- **Owner:** codex
- **Branch/worktree:** To be claimed after T-014 releases the Runs page and T-006 releases eval
  persistence/router paths.
- **Owned paths:** evaluation summary query in `packages/db/src/eval-store.ts`, the evaluation-run
  tRPC router, `apps/web/src/app/(dashboard)/runs/page.tsx`, focused tests, and coordination files.
- **Dependencies:** T-013 pricing branch supplies `agentCostUsd`; T-006 must first port eval storage
  and routers to async Neon; T-014 currently owns the Runs page and must complete or hand it off.
- **Non-goals:** Recalculating model prices in the browser, invoice reconciliation, cost-based
  quality gates, comparison charts, schema changes, or per-trace cost visualization.
- **Verified assumptions:** Display the model from the immutable `agentVersionSnapshot.model`, not
  the mutable live agent record; sum persisted execution costs server-side; show agent and evaluator
  costs separately; format USD to six fractional digits so MVP-scale token costs remain visible.
- **Validation:** DB summary aggregation tests; evaluation-run router test; Runs page loading/error/
  empty/data rendering coverage where supported; touched Biome; DB/web typecheck and tests; root
  typecheck, tests, and build after T-006 repair.
- **Status/next action:** PLANNED — do not start or create a worktree while T-014 and T-006 own the
  required paths. Implement immediately after both dependencies publish their handoffs.

### Validation Commands

```bash
pnpm install --frozen-lockfile   # PASS
pnpm format:check                # PASS
pnpm typecheck                   # PASS (10/10 workspace tasks)
pnpm test                        # PASS
pnpm build                       # PASS (pipeline + Next.js)
```

### T-003 Validation

- `pnpm format:check` — PASS.
- `pnpm typecheck` — PASS, 10/10 workspace tasks.
- `pnpm build` — PASS, pipeline and Next.js build without warnings.
- `pnpm test` — PASS, 7/7 tests in @repo/agent.
- Credentialed Gemini smoke test — not run because it would create billable external calls;
  scripted-provider tests cover the identical core contract.

### T-011 Validation

- `pnpm install --frozen-lockfile` — PASS.
- Touched DB scope `biome check` — PASS with zero warnings/errors.
- `pnpm --dir packages/db db:generate` — PASS; 21 tables and no schema drift.
- Empty database migration — PASS with zero foreign-key violations.
- Populated 0000+0001 database upgrade — PASS; legacy runs, costs, corrections, suites, executions,
  and traces preserved with zero foreign-key violations.
- `pnpm typecheck` — PASS, 10/10 tasks.
- `pnpm test` — PASS, 15/15 tests across agent, DB, and web.
- `pnpm build` — PASS, pipeline and production Next.js build.
- `pnpm format:check` — PASS exit 0 with 22 known warnings outside T-011-owned paths and no new
  warnings in the touched scope.
- Remote Vercel and Vercel Preview Comments checks — PASS on PR #9.
- Files changed: canonical Drizzle schema, migration bootstrap, correction persistence,
  `0002_youthful_slyde.sql`, generated snapshot/journal, migration/invariant tests, and codemap.

### T-006 Validation

- `pnpm install --frozen-lockfile` — PASS.
- Touched-scope `biome check` across domain, evals, DB store, pipeline adapters, web routers, and
  coordination files — PASS with zero warnings/errors.
- `pnpm typecheck` — PASS, 10/10 tasks.
- `pnpm test` — PASS: agent 7/7, DB 11/11, evals 19/19, and web 2/2.
- Scripted end-to-end evaluation — PASS: nine approved seed cases plus one explicitly
  reviewer-approved correction froze and executed as 10 trusted cases; 10/10 executions and
  graders completed and passed with separate agent/evaluator usage.
- `pnpm build` — PASS for the pipeline worker and production Next.js application.
- `pnpm format:check` — PASS exit 0 with the same 22 pre-existing warnings outside T-006 touched
  files; touched scope has no diagnostics.
- Credentialed Gemini/indexing smoke test — not run because it requires a billable external API
  call; provider-free runner integration exercises the same orchestration/persistence boundary.
- Neon compatibility — PR #10 appeared after the T-006 claim and replaces synchronous SQLite
  stores with asynchronous Postgres stores. T-006 intentionally does not include or merge PR #10;
  its pure grader/runner is portable, while `eval-store`, tRPC awaits, and DB-backed tests require a
  focused port after PR #10's contract is finalized.
- Remote Vercel and Vercel Preview Comments checks — PASS on draft PR #11; PR is CLEAN.

### T-013 Validation

- `pnpm install --frozen-lockfile` — PASS.
- `pnpm format` — PASS exit 0 with 27 pre-existing warnings outside T-013; touched files clean.
- Touched agent `biome check` — PASS with zero diagnostics.
- `pnpm --filter @repo/agent typecheck` — PASS.
- `pnpm --filter @repo/agent test` — PASS, 11/11 tests.
- `pnpm typecheck` and `pnpm build` — BLOCKED by merged T-006 synchronous SQLite calls against
  Neon in the eval store and evaluation/indexing adapters.
- `pnpm test` — BLOCKED outside T-013 because DB suites require `DATABASE_URL`; agent tests pass.
- Draft PR #12 — OPEN/DRAFT at `0e7c9b9`; Vercel Preview Comments PASS and Vercel FAIL on the
  known repository build blocker; no merge performed. The ticket worktree was deleted.

### Progress Log

- 2026-07-12T16:00:00Z — GOAL-001 created. T-001 claimed.
- 2026-07-12T16:05:00Z — Git repo initialized, .gitignore created.
- 2026-07-12T16:07:00Z — Root configs created.
- 2026-07-12T16:08:00Z — packages/typescript-config, packages/eslint-config created.
- 2026-07-12T16:09:00Z — apps/web, apps/pipeline scaffolded.
- 2026-07-12T16:09:30Z — packages/db, domain, agent, evals, ui, test-fixtures created.
- 2026-07-12T16:10:00Z — Tracking files created.
- 2026-07-12T16:12:00Z — pnpm install complete. Prisma removed, Drizzle installed.
- 2026-07-12T16:15:00Z — Drizzle schema created (supplier_audit, audit_page, audit_finding, agent_version, eval_case, evaluation_run, test_execution + relations).
- 2026-07-12T16:18:00Z — T-001 COMPLETE. turbo typecheck PASS (8/8). turbo build PASS. format PASS.
- 2026-07-12T18:30:00Z — T-002c COMPLETE. 6 schema fixes + 8 new schemas aligned to PRD. typecheck PASS, build PASS. PR #2 merged.
- 2026-07-12T20:00:00Z — T-009 COMPLETE. Pre-seeded pipeline merged via PR #1. Documents + retrieval packages added.
- 2026-07-12T20:15:00Z — T-002d claimed. UI foundation: Tailwind + shadcn/ui + tRPC + TanStack Query + React Hook Form.
- 2026-07-12T12:26:38Z — T-003 claimed by codex with backend-only ownership; Gemini selected;
  implementation and validation assigned to `feat/agent-pipeline` worktree.
- 2026-07-12T17:38:51Z — Reconciled board with `origin/main`: PR #4 agent pipeline and PR #5 UI
  polish are merged; ten seed cases are present; T-010 owns the active repository validation
  repair; remaining product work is T-004 through T-008.
- 2026-07-12T23:20:00Z — T-010 COMPLETE. Regenerated pnpm-lock.yaml, installed Biome 2.5.3,
  created biome.json, deleted ESLint configs + .prettierrc + @repo/eslint-config, removed
  ESLint/Prettier deps from all 9 workspace packages, changed lint scripts to `biome check .`,
  removed fake vitest test scripts from 7 packages, ran `biome check --write` (56+ files
  formatted). Validation: install PASS, format:check PASS (29 warnings), typecheck PASS (10/10),
  test PASS (7/7), build PASS (2/2). Repo-wide validation gate fully operational.
- 2026-07-12T17:57:55Z — T-005 claimed by codex for the durable correction-to-regression loop in
  a dedicated worktree, with evaluation execution and comparison explicitly out of scope.
- 2026-07-12T23:30:00Z — T-004 COMPLETE. Added approve/reject/correct review actions to audit
  finding detail view (tRPC mutations, inline edit form, action buttons). PR #7 created on
  feat/audit-review-ui. Validation: format PASS, typecheck PASS (10/10), test PASS (7/7), build PASS.
- 2026-07-13T05:36:14Z — T-005 merged via PR #8 after reconciling PR #7's temporary in-memory
  review mutations with the durable SQLite source of truth; claimed T-011 to complete the eval
  persistence schema before T-006/T-007 implementation.
- 2026-07-13T05:52:14Z — T-011 merged via PR #9 at `271da86`; the canonical Drizzle schema now
  persists frozen suites, reproducible runs, queryable grader metrics, comparisons, and versioned
  quality-gate decisions. Empty and populated upgrades plus all repository gates pass.
- 2026-07-13T06:56:44Z — T-006 claimed on published main commit `680efa6`; fresh
  `feat/evaluation-engine` worktree created with Neon-owned schema/migration/bootstrap paths
  excluded.
- 2026-07-13T07:20:15Z — T-006 implementation validated end to end: immutable trusted suites,
  idempotent runs/executions, deterministic maximum matching and PRD metrics, partial-failure
  runner, durable outputs/graders/traces/usage, rulebook indexing command, worker adapter, and tRPC
  APIs. The tenth trusted case is a human correction; `eval-010` remains pending and excluded.
  PR #10 Neon support is now visible and requires a post-finalization async adapter port.
- 2026-07-13T07:23:32Z — Pushed T-006 implementation `a535993` and opened draft PR #11 with an
  explicit no-merge notice and PR #10 Neon compatibility dependency; local gates pass and remote
  Vercel checks subsequently passed and the draft PR is CLEAN.
- 2026-07-13T08:23:49Z — T-013 provider-local cost accounting published in draft PR #12. Focused
  agent gates pass; root gates remain blocked by T-006 Neon incompatibility and DB test setup. Both
  ticket worktrees were removed after their journals and commits were preserved.
- 2026-07-13T08:24:15Z — User explicitly redirected active work to a standalone UI ticket. T-013
  is superseded for now; T-014 is claimed to align the Next.js dashboard with official shadcn
  dashboard patterns and harden Tailwind v4 shared-class resolution in a dedicated worktree.

### Blockers

- T-006 and repository-wide validation are blocked because merged eval persistence and pipeline
  adapters still use synchronous SQLite calls against Neon Postgres. Root DB tests also require a
  test `DATABASE_URL`. T-013 focused behavior passes but cannot be marked complete until those
  external gates are repaired and rerun.

### Handoff

**Current state:** The active local work item is now T-014. The dashboard still uses a custom
sidebar/header shell and several dashboard routes are placeholders instead of official shadcn
dashboard patterns, though Tailwind v4 itself is loading and shared shadcn classes are compiling.
**Next exact action:** Commit this board claim on `main`, create
`feat/dashboard-ui-repair` in a fresh worktree, append the assignment acceptance to
`.codex/codemap.md`, and keep the implementation strictly on the UI side.
