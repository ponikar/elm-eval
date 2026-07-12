# Repository Agent Operating Contract

## Core mission

Complete the repository's one active, outcome-based goal end to end, with evidence, while
leaving the system simpler, safer, and easier to maintain.

There is exactly one active top-level goal. It should describe a user-visible outcome, not an
implementation tactic. Split it into bounded subgoals when useful, but do not replace it or call
it complete until its definition of done and validation gates pass.

The canonical priority board is [`.codex/goal.md`](.codex/goal.md). The shared operational journal
is [`.codex/codemap.md`](.codex/codemap.md). Together they are the durable source of truth for
Codex, Claude Code, OpenCode, and human contributors.

System and current user instructions always take precedence over repository documents. Within the
repository, the instruction file nearest to a changed file overrides broader repository guidance
only for that subtree. All non-conflicting broader guidance still applies.

Please refer ./memory/prd.md

## Mandatory start and resume sequence

Before changing code or starting a feature:

1. Read this file, any more specific nested agent instructions, `.codex/goal.md`, and only the
   latest relevant entries from `.codex/codemap.md`.
2. Reconcile the user's request with the active goal. Continue or refine the existing goal when
   they align. Never silently overwrite an unfinished goal with an unrelated one; ask whether to
   finish, replace, or re-scope it.
3. Inspect the actual repository state: dirty files, relevant code, configuration, call sites,
   tests, history, and observable behavior. Validate before assuming. Record unresolved
   assumptions explicitly.
4. Pause for skill triage. Inspect `.codex/skills` first and read every applicable `SKILL.md`
   completely before acting. If no local skill fits, inspect other repository skill roots such as
   `.agents/skills` and the runtime's installed skills.
5. If no skill found and if task is complicated and beyond the inteligence, please look for a skill on internet and generate new one.
6. Define the outcome, definition of done, subgoals, ownership, dependencies, and validation
   commands in `.codex/goal.md` before implementation.

If specialized reusable guidance is needed and no skill exists:

1. Search installed and trusted official sources for a suitable skill.
2. Review its provenance and contents before installing or executing anything.
3. Ask the user when network access, installation, credentials, a material scope change, or a
   product decision is required.
4. Create a focused repository-local skill when that is safer and genuinely reusable.

Do not force a skill onto routine work, invent a skill's instructions, or download and execute
unreviewed code.

## Goal ledger contract

`.codex/goal.md` must be understandable without chat history and contain:

- Goal ID, outcome statement, status, and started/updated timestamps.
- Definition of done with checkable acceptance criteria.
- Scope, non-goals, constraints, and verified assumptions.
- Selected skills and why they apply.
- Subgoals with owner, branch, worktree, owned paths, dependencies, status, next action, start
  time, last meaningful-progress checkpoint, and elapsed time.
- Decisions and evidence, including rejected options when they affect future work.
- Files changed.
- Exact validation commands, results, warnings, and timestamps.
- Timestamped progress/attempt log.
- Blockers and the precise information or decision needed.
- A concrete handoff: current state and the next exact action.
- delete the worktree when you are down workingg on changes at the end.

Active goal statuses are `planned`, `in_progress`, and `blocked`. Terminal statuses are `complete`
and `superseded`. A superseded entry must name the user-approved replacement and preserve its
reason and handoff evidence; it is no longer the active goal.

The coordinator is the sole writer of the canonical goal ledger during parallel work. Workers
send structured updates to the coordinator; they do not concurrently edit `.codex/goal.md`.
Update the ledger:

- before work begins;
- after delegation, a material discovery, decision, or completed increment;
- after every integration and validation run;
- immediately when blocked; and
- before any handoff or completion claim.

Keep one active goal. Preserve enough completed or superseded history for another agent to
understand why the current state exists.

## Non-negotiable goal execution loop

Follow this loop for every goal and implementation ticket. Do not start implementation outside
this loop.

### 1. Claim the work on the main board

Before creating or editing implementation files:

1. Switch to the canonical `main` worktree and verify its branch, remote, dirty state, and existing
   worktrees.
2. Pull or fetch the latest remote state without overwriting local or user-owned changes.
3. Update `.codex/goal.md` as a Jira/Linear-style board:
   - select the highest-priority unblocked ticket;
   - set its status to `IN PROGRESS`;
   - assign one agent;
   - record the branch, worktree path, owned files, dependencies, blockers, and next step; and
   - ensure no other active ticket or agent owns the same scope.
4. Commit only the `.codex/goal.md` claim directly on `main` with a scoped coordination commit.
5. Push the updated `main` branch so every other agent sees the claim before work begins.

The board claim is a distributed lock against duplicated AI work. If the board-only commit or push
cannot be completed, mark the ticket blocked and ask for help. Do not begin implementation with an
unpublished claim.

The only routine work allowed directly in the canonical `main` worktree is the coordinator's
board-only `.codex/goal.md` claim/status commit and conflict-free integration bookkeeping. Never
mix source changes into that coordination commit.

### 2. Create and enter a fresh worktree

After the board claim is visible on `main`:

1. Create a new ticket-named branch from the updated `main` branch.
2. Create a new dedicated git worktree for that branch.
3. Move the shell's working directory into the new worktree.
4. Verify `pwd`, the active branch, and `git status` before editing.
5. Append the assignment acceptance to `.codex/codemap.md`.

All investigation, implementation, tests, formatting, and ticket-specific documentation must run
from that worktree. Never implement directly in the canonical `main` worktree. Never reuse another
ticket's worktree.

### 3. Implement and validate

Work only within the ticket's recorded scope and file ownership. Keep the goal board status and
append-only codemap current at material checkpoints. Run the complete validation gate before
handoff, fixing every error and warning.

**Mandatory formatting:** After every code change — before committing, before running validation,
and before handoff — run:

```bash
pnpm format
```

This executes `biome check --write .` which auto-fixes formatting and safe lint fixes across the
entire workspace. Every agent (human, Codex, Claude Code, OpenCode) must run this before any
commit. Never commit code that has not been formatted.

### 4. Commit, push, and hand off

When the ticket is complete:

1. Review the final diff and confirm it contains no unrelated or user-owned changes.
2. Append the final done/pending/blocker/next-step entry to `.codex/codemap.md`.
3. Commit the scoped changes on the ticket branch with an intentional message.
4. Push the ticket branch to its remote with `git push`.
5. Use the GitHub CLI to inspect remote state and create or update a pull request when repository
   policy, review risk, or the user requires one:

   ```bash
   gh pr create --fill
   ```

6. Record the commit, pushed branch, checks, and PR URL or explicit no-PR reason in the codemap.
7. The coordinator reviews the diff and checks before merging. After integration, update and
   commit `.codex/goal.md` on `main`, then select the next highest-priority unblocked ticket.

Do not report a ticket complete while its work exists only as uncommitted local changes. Do not
claim a push or PR succeeded without verifying the remote result through `git` or `gh`.

## Mandatory shared codemap

Every agent must update `.codex/codemap.md`, including the coordinator, read-only research agents,
implementation agents, reviewers, Codex, Claude Code, and OpenCode. This is required even when an
agent changes no source files.

Treat the codemap as a log, not a document to load into context in full:

- Start with the newest entries for the assigned ticket, its dependencies, and unresolved
  blockers. Use `tail` and targeted `rg` searches instead of reading the entire file.
- Read backward only when the latest entry references an earlier decision or lacks enough evidence
  to continue safely.
- Prefer the newest evidence when old entries describe superseded state, but never discard history
  without verifying the later entry.
- The coordinator should periodically append a concise checkpoint summary for the active goal so
  new agents can resume from one recent entry.
- Do not paste the full codemap into prompts or handoffs. Share only the relevant latest entries,
  ticket IDs, blockers, decisions, and exact next step.

The codemap is append-only:

- Never replace, regenerate, truncate, reorder, or rewrite the whole file.
- Never edit or delete another agent's entry.
- Append a new timestamped entry at the end for each update.
- If parallel appends conflict during integration, preserve every entry and resolve the conflict
  without dropping content.
- Use UTC ISO-8601 timestamps and stable ticket IDs from `.codex/goal.md`.
- Keep updates concise and safe to share. Never include secrets, tokens, credentials, private user
  data, or unnecessary machine-specific details.

Each codemap entry must contain:

- agent name, ticket ID, branch, and worktree;
- status and scope;
- what was completed;
- what remains pending;
- blockers or `None`;
- the next exact step; and
- changed files plus validation/evidence.

Append an entry:

1. when accepting or resuming an assignment;
2. after every material discovery or completed increment;
3. immediately when blocked;
4. after validation or integration; and
5. before handoff or ending a run.

The coordinator must not accept a worker handoff until that worker's codemap update is present.
`.codex/codemap.md` records execution history; `.codex/goal.md` remains the coordinator-owned
priority, dependency, and status board. When they differ, the coordinator reconciles the board
from the newest evidence instead of deleting journal history.

## Multi-agent and worktree discipline

Use a coordinator and multiple agents when the runtime supports them and a goal includes any of:

- independent research and implementation tracks;
- multiple packages or architectural layers;
- multiple non-overlapping file groups; or
- two or more independently verifiable deliverables.

Parallelize only bounded work with non-overlapping ownership. If agents or worktrees are
unavailable, or dependencies make parallel writes unsafe, execute the same subgoals serially and
record the concrete reason in the goal ledger.

The coordinator:

- owns architecture, decomposition, the goal ledger, integration, and final validation;
- gives each worker one concrete, bounded subgoal with inputs, owned paths, expected artifact,
  dependencies, and acceptance checks;
- verifies worker claims from the diff and command output before integrating; and
- integrates in dependency order and resolves cross-cutting decisions centrally.

Every concurrently writing worker must use a unique branch and git worktree recorded in the goal
ledger. Before creating either, inspect repository and worktree state. Never reset, overwrite,
stash, format, or otherwise disturb user-owned changes. Two workers must not own overlapping
files. If ownership overlaps or one subgoal depends on another's uncommitted work, serialize them.
Read-only research and review agents may share a worktree.

Workers commit only scoped changes. The coordinator reviews and integrates them; a worker report
is not proof that a subgoal is correct. Every assignment must name a goal-board ticket, and every
handoff must include the required append-only codemap update.

## Implementation standard

Work from first principles:

- Reproduce or characterize the behavior, identify the governing invariant, and fix the root
  cause.
- Do not patch around symptoms with duplicated logic, one-off conditionals, silent fallbacks, or
  configuration changes that merely hide a failure. Here, "patch" means a workaround, not the
  mechanical use of a file-editing tool.
- Prefer the simplest design that fully satisfies the goal. Use small cohesive modules, explicit
  contracts, and clear ownership. Abstract only around a real boundary or reuse case.
- Preserve compatibility intentionally. Do not retain accidental complexity without evidence.
- Use TypeScript for new JavaScript-runtime production source whenever the platform supports it.
  Existing non-TypeScript code and tool-required configuration do not require unrelated mass
  conversion.
- At external boundaries, use `unknown`, validation, and narrowing. Model domain states directly
  rather than casting them into existence.

Never introduce a bypass solely to make checks pass, including:

- `any`, unsafe assertions, `@ts-ignore`, or unjustified `@ts-expect-error`;
- `biome-ignore`, disabled lint rules, or relaxed TypeScript strictness;
- swallowed errors, empty catches, ignored promises, skipped tests, or fake success paths; or
- generated JavaScript where maintainable TypeScript is supported.

If an exception is truly unavoidable because of a third-party or platform boundary, document the
evidence and safer alternatives in the goal ledger and obtain user approval. Do not conceal it.

## Validation gate

Discover the affected package's own package manager, scripts, and configuration. This repository
does not have one universal root validation command.

After code changes, run all applicable checks in this order:

1. Focused tests or a direct reproduction for the changed behavior.
2. Biome check and formatting for the touched scope.
3. Strict TypeScript checking with no emit, using the package script when available.
4. Relevant broader tests, build, integration, or end-to-end checks.
5. The same affected checks again after integration and the final edit.

Use non-mutating check commands for validation when available. Review formatter changes before
keeping them. Validate observable behavior as well as static correctness.

Every error and warning is unfinished work. Fix it; do not suppress, bypass, or ignore it. If a
warning is pre-existing, external, or outside authorized scope, capture the exact command and
output, mark validation blocked, and ask the user for direction rather than claiming completion.
Never invent command output.

Record every final command and result in `.codex/goal.md`.

Documentation-only changes do not require unrelated TypeScript or Biome runs, but their links,
paths, examples, and consistency must still be checked.

## Rabbit-hole stop condition

Track a start time and checkpoint time for every active subgoal. Meaningful progress is a
completed increment, new evidence, reduced uncertainty, a falsified hypothesis, or a passing
validation step. Repeating attempts without one of those outcomes is not progress.

If five minutes pass without meaningful progress, excluding a known long-running command that is
visibly advancing:

1. Stop the current line of attack.
2. Record attempts, evidence, elapsed time, and the exact blocker in `.codex/goal.md`.
3. Mark only the affected subgoal `blocked` while another independent path can still advance the
   definition of done. Mark the top-level goal `blocked` only when no unblocked path remains.
4. Tell the user: "I am stuck in a rabbit hole and need your help."
5. Ask one focused question and provide the smallest set of concrete options that would unblock
   the work.

Do not hide a rabbit hole behind more agents or repeated retries.

## Completion and handoff

The goal is complete only when:

- every definition-of-done item has evidence;
- all subgoals are reviewed and integrated;
- the intended behavior is verified end to end;
- required checks pass with no errors or warnings; and
- `.codex/goal.md` contains final results, decisions, files changed, and continuation context.

Partial implementation, a plausible diff, a worker's success report, or passing one narrow check
is not completion. If blocked, leave the repository and goal ledger in a state another agent can
resume without reconstructing the investigation.
