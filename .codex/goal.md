# Goal Ledger

## GOAL-001: Audit Reliability Lab MVP

**Status:** `in_progress`
**Started:** 2026-07-12T16:00:00Z
**Updated:** 2026-07-12T12:50:00Z

### Outcome

Build a supplier-audit AI reliability system that extracts findings from audit reports, validates evidence, generates corrective actions, turns human reviewer corrections into permanent regression tests, and blocks agent versions that miss critical risks.

### Definition of Done

- [x] Monorepo scaffolded with pnpm + Turborepo
- [x] Web app (Next.js) boots and renders home page
- [x] Pipeline worker boots without errors
- [x] Drizzle schema covers all core tables
- [ ] Seed audit loads in the audit review workspace
- [ ] Agent v1 extracts structured findings
- [ ] Evidence validation catches invalid citations
- [ ] Human correction converts to regression test
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

### Subgoals

| ID     | Ticket                               | Owner    | Status      | Branch                 | Worktree                                      | Next Action                              |
| ------ | ------------------------------------ | -------- | ----------- | ---------------------- | --------------------------------------------- | ---------------------------------------- |
| T-001  | Monorepo scaffold                    | opencode | COMPLETE    | main                   | main                                          | Done                                     |
| T-002  | Domain schemas + seed data           | opencode | IN PROGRESS | main                   | main                                          | Create Zod schemas + seed fixtures       |
| T-002c | Schema alignment to PRD              | opencode | COMPLETE    | feat/schema-alignment  | —                                             | Align domain schemas with PRD types      |
| T-002d | UI foundation (Tailwind+shadcn+tRPC) | opencode | IN PROGRESS | feat/ui-foundation     | —                                             | Tailwind + shadcn/ui + tRPC + providers  |
| T-009  | Pre-seeded documentation pipeline    | opencode | COMPLETE    | feat/pre-seed-pipeline | —                                             | Gemini extraction + fixtures + DB schema |
| T-003  | Agent pipeline                       | codex    | BLOCKED     | feat/agent-pipeline    | /Users/darshan/work/agent-eval-agent-pipeline | Decide scope for root test/lint failures |
| T-004  | Audit review UI                      | opencode | planned     | —                      | —                                             | Build split-view workspace               |
| T-005  | Human correction loop                | opencode | planned     | —                      | —                                             | Correction → regression test             |
| T-006  | Evaluation engine                    | opencode | planned     | —                      | —                                             | Run suite + graders                      |
| T-007  | Version comparison + quality gates   | opencode | planned     | —                      | —                                             | Comparison dashboard + gates             |
| T-008  | Trace viewer + demo validation       | opencode | planned     | —                      | —                                             | Trace UI + end-to-end verify             |

### Decisions

| Decision             | Choice               | Reason                                              |
| -------------------- | -------------------- | --------------------------------------------------- |
| Package manager      | pnpm 11.9            | Already installed                                   |
| Monorepo tool        | Turborepo            | PRD spec, simple caching                            |
| DB local             | SQLite via Drizzle   | Faster MVP, schema portability                      |
| ORM                  | Drizzle (not Prisma) | User preference                                     |
| TypeScript           | Strict, no `any`     | AGENTS.md requirement                               |
| Formatter            | Prettier             | PRD recommendation                                  |
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
- **Status/next action:** IN PROGRESS — publish this claim, create the worktree, append assignment
  acceptance to the codemap, then implement domain and persistence contracts.

### Validation Commands

```bash
pnpm install          # PASS
turbo build           # PASS (Next.js compiles, pipeline typechecks)
turbo typecheck       # PASS (8/8 packages clean)
pnpm format:check     # PASS (after formatting)
```

### T-003 Validation

- `pnpm format:check` — PASS.
- `pnpm typecheck` — PASS, 10/10 workspace tasks.
- `pnpm build` — PASS, pipeline and Next.js build without warnings.
- `pnpm --filter @repo/agent test` — PASS, 7/7 tests.
- Touched-package ESLint commands — PASS with zero warnings.
- `pnpm test` — BLOCKED because untouched packages have no test files and Vitest exits 1.
- `pnpm lint` — BLOCKED because untouched documents/evals/ui/web packages lack usable ESLint setup.
- Credentialed Gemini smoke test — not run because it would create billable external calls;
  scripted-provider tests cover the identical core contract.

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

### Blockers

- T-003 scoped gates pass, but repository-wide test/lint gates fail on pre-existing untouched
  package configuration. Direction is required to expand scope or accept scoped validation.

### Handoff

**Current state:** T-003 is committed on `feat/agent-pipeline`; focused tests, typecheck, build,
format, and touched lint pass. Repository-wide test/lint are blocked by untouched package setup.
**Next exact action:** Choose whether to repair repository-wide test/lint infrastructure or accept
scoped validation, then rerun final gates and integrate.
