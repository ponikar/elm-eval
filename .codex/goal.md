# Goal Ledger

## GOAL-001: Audit Reliability Lab MVP

**Status:** `in_progress`
**Started:** 2026-07-12T16:00:00Z
**Updated:** 2026-07-13T05:52:14Z

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
| T-006  | Evaluation engine                    | opencode    | planned     | —                      | —                                             | Run suite + graders                           |
| T-007  | Version comparison + quality gates   | opencode    | planned     | —                      | —                                             | Comparison dashboard + gates                  |
| T-008  | Trace viewer + demo validation       | opencode    | planned     | —                      | —                                             | Trace UI + end-to-end verify                  |
| T-010  | Repository validation repair         | external-ai | COMPLETE    | main                   | /Users/darshan/work/agent-eval                | Lockfile regenerated, Biome replaces ESLint+Prettier |
| T-011  | Eval persistence schema foundation   | codex       | COMPLETE    | feat/eval-schema-foundation | —                                             | Merged in PR #9                               |

### Decisions

| Decision             | Choice               | Reason                                              |
| -------------------- | -------------------- | --------------------------------------------------- |
| Package manager      | pnpm 11.9            | Already installed                                   |
| Monorepo tool        | Turborepo            | PRD spec, simple caching                            |
| DB local             | SQLite via Drizzle   | Faster MVP, schema portability                      |
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

### Validation Commands

```bash
pnpm install --frozen-lockfile   # PASS
pnpm format:check                # PASS (29 warnings, 0 errors)
pnpm typecheck                   # PASS (10/10 workspace tasks)
pnpm test                        # PASS (7/7 tests in @repo/agent)
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

### Blockers

- None. T-010 is complete. Repository validation gate is fully operational.

### Handoff

**Current state:** `feat/audit-review-ui` branch contains T-004 (review actions). T-005 is in
progress in a dedicated worktree. The evaluation runner, version comparison/gates, and trace viewer
remain planned.
**Next exact action:** Merge PR #7 (T-004), then implement T-005 in its dedicated worktree, push
the ticket branch, open a PR, then integrate and remove the worktree.
