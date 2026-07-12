# Goal Ledger

## GOAL-001: Audit Reliability Lab MVP

**Status:** `in_progress`
**Started:** 2026-07-12T16:00:00Z
**Updated:** 2026-07-12T16:20:00Z

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

- No local skills applicable. Standard T3 monorepo pattern.

### Subgoals

| ID    | Ticket                             | Owner    | Status      | Branch | Worktree | Next Action                        |
| ----- | ---------------------------------- | -------- | ----------- | ------ | -------- | ---------------------------------- |
| T-001 | Monorepo scaffold                  | opencode | COMPLETE    | main   | main     | Done                               |
| T-002 | Domain schemas + seed data         | opencode | IN PROGRESS | main   | main     | Create Zod schemas + seed fixtures |
| T-003 | Agent pipeline                     | opencode | planned     | —      | —        | Implement pipeline stages          |
| T-004 | Audit review UI                    | opencode | planned     | —      | —        | Build split-view workspace         |
| T-005 | Human correction loop              | opencode | planned     | —      | —        | Correction → regression test       |
| T-006 | Evaluation engine                  | opencode | planned     | —      | —        | Run suite + graders                |
| T-007 | Version comparison + quality gates | opencode | planned     | —      | —        | Comparison dashboard + gates       |
| T-008 | Trace viewer + demo validation     | opencode | planned     | —      | —        | Trace UI + end-to-end verify       |

### Decisions

| Decision        | Choice               | Reason                         |
| --------------- | -------------------- | ------------------------------ |
| Package manager | pnpm 11.9            | Already installed              |
| Monorepo tool   | Turborepo            | PRD spec, simple caching       |
| DB local        | SQLite via Drizzle   | Faster MVP, schema portability |
| ORM             | Drizzle (not Prisma) | User preference                |
| TypeScript      | Strict, no `any`     | AGENTS.md requirement          |
| Formatter       | Prettier             | PRD recommendation             |

### Validation Commands

```bash
pnpm install          # PASS
turbo build           # PASS (Next.js compiles, pipeline typechecks)
turbo typecheck       # PASS (8/8 packages clean)
pnpm format:check     # PASS (after formatting)
```

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

### Blockers

None.

### Handoff

**Current state:** T-001 complete. Monorepo scaffolded, all packages typecheck, build passes, format clean. Drizzle ORM with better-sqlite3. 7 core tables + relations defined.
**Next exact action:** T-002 — Create Zod validation schemas for API boundaries and complete the 10 seed evaluation cases in test-fixtures.
