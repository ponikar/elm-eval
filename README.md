# Audit Reliability Lab

An early-stage agent evaluation platform that tests whether AI can reliably audit supplier compliance — and proves it with data.

---

## Why This Exists

AI agents are starting to make high-stakes decisions: flagging compliance violations, recommending corrective actions, and assessing supplier risk. But nobody is systematically checking whether these agents actually work. One missed critical finding — an obstructed emergency exit, a child labor violation — can have real consequences.

This project answers a simple question: **can we trust the agent's output?**

It runs AI agents against known-good audit cases, grades their findings against human-verified ground truth, and blocks versions that regress. The goal is a repeatable, measurable evaluation loop — not a one-time demo.

---

## How It Works

The system runs a three-step loop:

1. **Extract** — An AI agent (Gemini) reads supplier audit documents, retrieves applicable compliance rules, and extracts structured findings (category, severity, evidence citations, corrective actions).

2. **Evaluate** — Each finding is graded against human-verified expected results. The grader computes recall, precision, citation accuracy, hallucination rate, and 8+ other metrics. No LLM judge — every score is deterministic.

3. **Improve** — Human corrections become permanent regression tests. New agent versions are compared against the baseline. Quality gates approve or block releases based on measurable thresholds.

This loop runs continuously: the more you review, the stronger the test suite gets.

---

## What's Included

### Audit Review

A split-panel workspace where humans review AI-generated findings side-by-side with the original audit document.

- View raw audit pages alongside extracted findings
- Approve correct findings, reject false positives
- Submit corrections with severity/category/rule overrides
- Corrections automatically become trusted regression tests

### Evaluation

The core of the platform. Frozen test suites run through the agent pipeline and produce deterministic grades.

- 10 pre-seeded evaluation cases covering blocked exits, expired SDS, working hours violations, and more
- Deterministic bipartite matching grader — same input always produces the same score
- 12+ metrics: finding recall, critical recall, precision, citation accuracy, hallucination rate, schema validity, and more
- Server-aggregated run summaries with model, cost, progress, and latency

### Agent Comparison

Side-by-side version comparison with quality gate enforcement.

- Run baseline and candidate agent versions against the same frozen suite
- Persist comparisons with per-case classifications: improvement, regression, stable pass, stable fail
- Metric deltas across 13 dimensions with color-coded trends
- Configurable quality gates that approve or block candidate versions based on thresholds (e.g., zero critical regressions, < 2% hallucination rate)

### Failure Traces

Stage-by-stage pipeline observability for debugging failed cases.

- Timeline view of every pipeline stage with timing, token usage, and cost
- Side-by-side input pages, retrieved rules, expected output, and actual output
- Grader results with failure types and metric breakdowns
- Click any failed case to see exactly where it went wrong

---

## Seed Data

The app works out of the box with pre-loaded data:

- **Audit report** — 6-page RBA audit of Shenzhen Golden Electronics Co., covering health & safety, labor, environment, and ethics
- **Rulebook** — RBA Code of Conduct v8.0 with 10 structured compliance rules
- **Agent versions** — Baseline (Gemini 2.5 Flash) and candidate (Gemini 2.5 Flash Lite) configurations
- **Evaluation cases** — 10 trusted cases with human-verified expected findings

No API keys required to browse the dashboard. The agent pipeline runs only when triggered.

---

## Architecture

The system runs as two separate services that communicate over HTTP:

```
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│        Next.js Dashboard         │        │        Pipeline Worker (VPS)      │
│       (App Router + tRPC)        │  HTTP  │        (Node.js HTTP server)      │
│                                  │ POST   │                                    │
│  Dashboard UI ──► tRPC Router ──┼───────►│  POST /run/:id  ──► runEvaluation  │
│                                  │        │  GET  /health                     │
├──────────────────────────────────┤        ├──────────────────────────────────┤
│         Neon Postgres            │◄───────│         Gemini API                │
│         (21 tables)              │ shared │   (extraction + embeddings)       │
└──────────────────────────────────┘        └──────────────────────────────────┘
```

**How the two services connect:**

- The **Next.js app** serves the dashboard UI and tRPC API. When a user triggers an evaluation run from the Compare page, the tRPC mutation creates the run record in the database, then makes an HTTP POST to the pipeline server to kick it off.
- The **Pipeline worker** is a standalone Node.js HTTP server that listens for run requests. It authenticates via a shared secret, processes the evaluation asynchronously (Gemini calls, rule retrieval, grading), and writes results back to the same database.
- The dashboard **auto-polls** the database every 3 seconds to reflect live progress.

This separation keeps the AI-heavy work off the web server and lets the pipeline scale independently.

### Monorepo Packages

| Package | Purpose |
|---------|---------|
| `@repo/domain` | Shared types, Zod schemas, environment config |
| `@repo/agent` | AI pipeline orchestration, Gemini integration, validation |
| `@repo/evals` | Deterministic grader, evaluation runner, quality gates |
| `@repo/db` | Drizzle ORM schema (21 tables), data access layer |
| `@repo/retrieval` | Embeddings, cosine similarity, vector search |
| `@repo/documents` | Audit and rulebook PDF parsing |
| `@repo/ui` | Shared shadcn/ui component library |
| `@repo/test-fixtures` | Seed data and test fixtures |

---

## AI Agent Pipeline

The pipeline processes audit documents through five stages:

```
Audit Pages → Candidate Extraction → Deduplication → Rule Retrieval → Finding Completion → Validation
```

1. **Candidate Extraction** — Each audit page is sent to Gemini with the agent's system prompt. The model returns structured candidates (title, description, category, evidence quote, confidence).

2. **Deduplication** — Candidates across pages are merged by normalized key (category + page + quote), keeping the highest-confidence version.

3. **Rule Retrieval** — Each candidate's description is embedded and matched against pre-computed rule embeddings using cosine similarity. Top-K rules are returned.

4. **Finding Completion** — A second Gemini call completes the finding with severity, rule reference, and corrective action, using the retrieved rules as context.

5. **Deterministic Validation** — Every finding is validated without LLM calls: schema check, evidence citation against actual page text, rule reference existence, corrective action completeness, and deduplication.

Each stage records trace events with timing, token usage, and cost for full observability.

---

## Embedding & Retrieval

Rule retrieval uses vector similarity search:

- Compliance rules are chunked and embedded using Gemini's embedding model (768 dimensions)
- At query time, the candidate finding description is embedded and compared against all rule chunk embeddings
- Cosine similarity ranks the most relevant rules
- Search runs in-memory — no external vector database required for the MVP

This lets the agent find the right compliance rules for each finding without hardcoding rule mappings.

---

## Evaluation Engine

The grader uses deterministic bipartite matching — no LLM judge, no randomness:

- Expected findings are matched to actual findings using a scoring algorithm (evidence match: 8pts, rule match: 4pts, category: 2pts, severity: 1pt)
- Matched pairs produce per-finding metrics (category accuracy, severity accuracy, citation precision, rule accuracy)
- Aggregate metrics include finding recall, critical recall, precision, hallucination rate, and schema validity
- Failure types are classified into 14 categories (missed finding, false positive, wrong severity, invalid citation, etc.)

Quality gates enforce thresholds like critical recall >= 95%, hallucination rate <= 2%, and zero critical regressions.

---

## Dashboard

Built with Next.js 15, tRPC, TanStack Query, and shadcn/ui.

| Screen | What It Shows |
|--------|---------------|
| `/audits` | Audit list with summary stats |
| `/audits/[id]` | Split-panel review: raw document + findings with approve/reject/correct |
| `/evals` | Evaluation suite: trusted/pending cases with baseline/candidate status |
| `/runs` | Evaluation runs with model, cost, progress, and latency |
| `/runs/[id]` | Run detail: per-case execution, grader results, config |
| `/compare` | Version comparison: metric deltas, quality gate decisions |
| `/agents` | Agent version configurations side-by-side |
| `/traces` | Failure traces: pipeline timeline, grader output, I/O inspection |
| `/rulebooks` | Compliance rules with categories, severity, and guidance |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 11+
- A Neon Postgres database (or compatible PostgreSQL)
- A Gemini API key (for agent pipeline runs)

### Setup

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and GEMINI_API_KEY

# Generate and apply database migrations
pnpm --filter @repo/db db:generate
pnpm --filter @repo/db db:migrate

# Seed the database
pnpm --filter pipeline start -- seed

# Index the rulebook (generates embeddings)
pnpm --filter pipeline start -- index-rulebook rulebook-seed-001

# Start the dev server
pnpm dev
```

Open `http://localhost:3000`. The dashboard auto-seeds data on first access.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `GEMINI_API_KEY` | For pipeline runs | Google Gemini API key |
| `PIPELINE_URL` | For dashboard-triggered runs | URL of the pipeline worker (e.g., `http://your-vps:4000`) |
| `PIPELINE_SECRET` | Recommended | Shared secret for pipeline HTTP authentication |
| `GEMINI_EMBEDDING_MODEL` | No | Embedding model (default: `gemini-embedding-001`) |

### Running the Pipeline Worker

```bash
# Start the pipeline HTTP server (for dashboard-triggered runs)
pnpm --filter pipeline exec tsx src/server.ts

# Or run a single evaluation via CLI
pnpm --filter pipeline start -- eval <evaluation-run-id>

# Or process a pipeline job
pnpm --filter pipeline start -- <pipeline-job-id>
```

The pipeline worker runs on port 4000 by default. Set `PIPELINE_URL` in the Next.js app to point to it (e.g., `http://your-vps:4000`).

### Running Evaluations

From the dashboard: go to **Compare**, select baseline and candidate agents, and click "Run Baseline" / "Run Candidate". The dashboard creates the run and triggers the pipeline automatically.

From the CLI:

```bash
pnpm --filter pipeline start -- eval <evaluation-run-id>
```

---

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, tRPC, TanStack Query, shadcn/ui, Tailwind CSS v4
- **Backend:** Neon Serverless Postgres, Drizzle ORM, Google Gemini API
- **Pipeline:** Standalone Node.js worker (CLI + HTTP modes)
- **Build:** pnpm workspaces, Turborepo, Biome (linter/formatter)
- **AI:** Gemini 2.5 Flash / Flash Lite for extraction, Gemini Embedding 001 for retrieval
