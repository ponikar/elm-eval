# Product Requirements Document

# Supplier Audit Agent Evaluation System

**Working title:** Audit Reliability Lab  
**Version:** 0.4  
**Product type:** Domain-specific evaluation and regression system for supplier-audit AI  
**Architecture:** TypeScript monorepo with a Next.js web app and a separate backend pipeline

> This product is inspired by Elm AI’s publicly described supplier-audit and corrective-action workflows. It is not a copy of Elm AI’s product or a claim about its internal technology.

---

## 1. Product summary

Audit Reliability Lab evaluates an AI system that reviews supplier audits.

The supplier-audit agent receives:

1. A supplier audit report.
2. A versioned rulebook or supplier code of conduct.
3. An agent configuration containing the prompt, model, retrieval settings, and schemas.

The agent:

- reads the complete audit;
- identifies violations;
- retrieves the applicable rules;
- classifies category and severity;
- cites audit evidence;
- generates corrective actions.

The evaluation system compares the agent’s output against human-approved expected results.

It then:

- measures critical finding recall;
- detects false positives and hallucinations;
- validates citations and rule references;
- compares agent versions;
- turns reviewer corrections into permanent regression tests;
- blocks candidate versions that fail quality gates.

---

## 2. Problem

Supplier audit reports are long and inconsistent. A reviewer must identify:

- what went wrong;
- how serious it is;
- which rule was violated;
- where the evidence appears;
- what corrective action is required.

An AI agent can accelerate this work, but it may:

- miss a critical violation;
- invent a finding;
- cite the wrong page;
- use the wrong rule;
- under-classify severity;
- generate vague corrective actions;
- become worse after a prompt or model change.

Teams need a repeatable way to test whether a new agent version is actually safer and more accurate.

---

## 3. Core product outcome

The product must support this loop:

```text
Audit report + rulebook
        ↓
Supplier-audit agent
        ↓
Structured findings and corrective actions
        ↓
Compare against trusted expected results
        ↓
Pass, fail, or regression
        ↓
Human correction
        ↓
Permanent regression test
        ↓
Candidate agent quality gate
```

---

## 4. Product scope

### In scope

- supplier audit document ingestion;
- rulebook ingestion and versioning;
- page-preserving audit extraction;
- rule retrieval;
- structured finding generation;
- corrective action generation;
- trusted evaluation cases;
- agent version comparison;
- reviewer corrections;
- regression testing;
- quality gates;
- traces, cost, and latency.

### Out of scope

- a generic eval platform;
- supplier onboarding;
- supplier messaging;
- authentication and organizations;
- billing;
- a workflow builder;
- multi-agent orchestration;
- full OCR support;
- legal or compliance certification;
- autonomous approval of supplier compliance;
- thousands of unreviewed synthetic tests.

---

## 5. Real-world inputs

The system has four explicit inputs.

### 5.1 Supplier audit report

The audit report contains what the auditor observed at the factory.

```ts
type AuditDocumentInput = {
  fileName: string;
  mimeType: 'application/pdf';
  auditStandard: 'RBA' | 'SLCP' | 'BSCI' | 'SMETA' | 'CUSTOM';
  auditDate: string;
  supplierName: string;
  factoryName: string;
  language: 'en';
  rulebookVersionId: string;
};
```

Initial constraints:

- text-based PDF;
- English;
- stable page numbering;
- no password protection;
- original PDF retained for evidence review;
- scanned PDFs return `OCR_NOT_SUPPORTED`.

### 5.2 Rulebook or supplier policy

The rulebook contains what the supplier is required to follow.

It may represent:

- an external audit standard;
- a supplier code of conduct;
- a company policy;
- local requirements;
- contract-specific rules.

```ts
type RulebookInput = {
  fileName: string;
  mimeType: 'application/pdf';
  standard: 'RBA' | 'CUSTOM';
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  language: 'en';
};
```

Every audit run must use an explicit rulebook version.

### 5.3 Agent version

The system evaluates the complete AI pipeline, not only the prompt.

```ts
type AgentVersion = {
  id: string;
  name: string;

  model: string;
  systemPrompt: string;
  temperature: number;

  rulebookVersionId: string;
  retrievalTopK: number;
  extractionSchemaVersion: string;
  correctiveActionPromptVersion: string;

  timeoutMs: number;
  maxRetries: number;
};
```

### 5.4 Trusted expected result

A human reviewer creates or approves the expected result.

```ts
type TrustedExpectedFinding = {
  findingShouldExist: boolean;

  category?: FindingCategory;
  severity?: FindingSeverity;

  auditEvidence?: {
    pageNumber: number;
    textContains: string;
  };

  applicableRule?: {
    ruleId: string;
    rulebookVersion: string;
  };

  requiredCorrectiveActionFacts?: string[];
  forbiddenClaims?: string[];
};
```

Generated expected results are not trusted until approved by a human.

---

## 6. Document ingestion

Audit reports and rulebooks require different processing.

### 6.1 Audit ingestion

The audit report must be processed with complete page coverage.

```text
Audit PDF
→ store original document
→ extract text page by page
→ preserve page numbers
→ normalize text
→ store every page
→ record failed or empty pages
```

```ts
type AuditPage = {
  auditId: string;
  pageNumber: number;
  rawText: string;
  normalizedText: string;
  extractionStatus: 'SUCCESS' | 'EMPTY' | 'FAILED';
  parserVersion: string;
};
```

The agent must not silently skip pages.

### 6.2 Rulebook ingestion

Rulebooks are reusable and versioned.

```text
Rulebook PDF
→ extract pages and headings
→ create structured rules
→ create retrieval chunks
→ generate embeddings
→ publish versioned rule index
```

```ts
type ComplianceRule = {
  id: string;
  rulebookId: string;
  rulebookVersion: string;

  sectionId: string;
  sectionTitle: string;
  category: FindingCategory;

  requirementText: string;
  sourcePage: number;

  severityGuidance?: {
    defaultSeverity?: FindingSeverity;
    escalationConditions?: string[];
  };

  correctiveActionGuidance?: string[];
};
```

```ts
type RuleChunk = {
  id: string;
  ruleId: string;
  rulebookId: string;
  rulebookVersion: string;

  text: string;
  pageNumber: number;

  metadata: {
    sectionId: string;
    sectionTitle: string;
    category: FindingCategory;
  };

  embedding: number[];
  embeddingModel: string;
};
```

---

## 7. Retrieval design

### Audit report

Do not use only top-k RAG over the audit report.

The system must process every page or bounded section because a critical finding may be buried anywhere in the document.

```text
Every audit page
→ candidate finding extraction
→ duplicate merging
```

### Rulebook

Use targeted retrieval for applicable rules.

```text
Candidate finding
→ retrieve relevant rule chunks
→ validate rule ID and version
→ classify violation
```

The design rule is:

```text
Audit report: complete coverage
Rulebook: targeted RAG retrieval
```

For the initial implementation, pre-parsed pages, pre-structured rules, and precomputed embeddings may be provided as fixtures while keeping the real ingestion interfaces.

---

## 8. Supplier-audit agent pipeline

```text
Process audit pages
→ extract candidate findings
→ merge duplicates
→ retrieve relevant rules
→ validate evidence
→ classify category and severity
→ generate corrective action
→ validate final output
→ persist findings and trace
```

### 8.1 Finding output

```ts
type AuditFinding = {
  id: string;
  auditId: string;

  title: string;
  description: string;

  category: FindingCategory;
  severity: FindingSeverity;

  auditEvidence: {
    pageNumber: number;
    quote: string;
  };

  applicableRule: {
    ruleId: string;
    rulebookVersion: string;
  };

  confidence: number;

  correctiveAction: {
    action: string;
    ownerRole: string;
    deadlineDays: number;
    verificationMethod: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  };

  reviewStatus: 'PENDING' | 'APPROVED' | 'CORRECTED' | 'REJECTED';
};
```

```ts
type FindingCategory =
  | 'HEALTH_AND_SAFETY'
  | 'WORKING_HOURS'
  | 'WAGES_AND_BENEFITS'
  | 'FORCED_LABOR'
  | 'CHILD_LABOR'
  | 'ENVIRONMENT'
  | 'ETHICS'
  | 'MANAGEMENT_SYSTEM';

type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
```

### 8.2 Deterministic validation

Normal code must validate:

- audit page exists;
- evidence quote exists on the cited page;
- rule ID exists;
- rule belongs to the selected rulebook version;
- structured output matches schema;
- corrective action contains owner, deadline, and verification;
- deadline is valid;
- duplicate findings are not emitted;
- critical findings have appropriate priority.

---

## 9. Worked example

### Rulebook

```text
Rule ID: HEALTH_SAFETY_EMERGENCY_EXIT

Requirement:
Emergency exits and evacuation routes must remain accessible and free from obstruction.

Severity guidance:
Critical when workers cannot safely evacuate.
```

### Audit report

```text
Page 18:

During the facility walkthrough, cartons and finished goods were observed
in front of Emergency Exit B. The available clearance was approximately
40 centimetres.
```

### Expected agent result

```json
{
  "title": "Emergency Exit B was obstructed",
  "category": "HEALTH_AND_SAFETY",
  "severity": "CRITICAL",
  "auditEvidence": {
    "pageNumber": 18,
    "quote": "cartons and finished goods were observed in front of Emergency Exit B"
  },
  "applicableRule": {
    "ruleId": "HEALTH_SAFETY_EMERGENCY_EXIT",
    "rulebookVersion": "8.0"
  },
  "correctiveAction": {
    "action": "Remove the obstruction and introduce recurring exit inspections.",
    "ownerRole": "Facility safety manager",
    "deadlineDays": 1,
    "verificationMethod": "Photographic evidence and follow-up inspection",
    "priority": "URGENT"
  }
}
```

### Trusted expected result

```json
{
  "findingShouldExist": true,
  "category": "HEALTH_AND_SAFETY",
  "severity": "CRITICAL",
  "auditEvidence": {
    "pageNumber": 18,
    "textContains": "Emergency Exit B"
  },
  "applicableRule": {
    "ruleId": "HEALTH_SAFETY_EMERGENCY_EXIT",
    "rulebookVersion": "8.0"
  },
  "requiredCorrectiveActionFacts": ["remove obstruction", "inspect emergency exits"]
}
```

The eval checks:

- was the violation found;
- was the category correct;
- was severity critical;
- did the audit citation exist;
- did the rule exist in the selected version;
- did the rule support the finding;
- was the corrective action complete;
- were unsupported claims avoided.

---

## 10. Evaluation cases

```ts
type AuditEvalCase = {
  id: string;
  name: string;

  category: FindingCategory;
  criticality: 'NORMAL' | 'CRITICAL';

  input: {
    auditPages: AuditPage[];
    rulebookVersionId: string;
  };

  expected: TrustedExpectedFinding[];

  source: 'HUMAN_CREATED' | 'HUMAN_CORRECTION' | 'PRODUCTION_FAILURE' | 'GENERATED_APPROVED';

  status: 'DRAFT' | 'PENDING_REVIEW' | 'TRUSTED';
  parentCaseId?: string;
};
```

Only trusted cases affect release gates.

---

## 11. Evaluation metrics

### Finding recall

```text
Matched expected findings / total expected findings
```

### Critical finding recall

```text
Matched expected critical findings / total expected critical findings
```

### Finding precision

```text
Valid matched findings / total findings produced
```

### Category accuracy

```text
Correct categories / matched findings
```

### Severity accuracy

```text
Correct severities / matched findings
```

### Critical under-classification

```text
Expected critical findings predicted below critical
```

### Audit citation precision

```text
Audit citations that support findings / audit citations produced
```

### Rule-reference accuracy

```text
Correct rule references / findings requiring rules
```

### Hallucinated finding rate

```text
Unsupported findings / findings produced
```

### Corrective action completeness

```text
CAPs containing action, owner, deadline, verification, and priority / total CAPs
```

### Schema validity

```text
Valid structured outputs / total outputs
```

### Cost

Calculated from recorded model token usage and the model pricing configuration.

Execution and evaluator costs must be reported separately.

### Latency

Store full pipeline latency and stage-level latency.

Report average, P50, and P95.

### Regression

```text
Baseline passed
AND
Candidate failed
```

### Improvement

```text
Baseline failed
AND
Candidate passed
```

---

## 12. Grading rules

A critical test passes only when:

```ts
const passed =
  findingRecallPassed &&
  categoryPassed &&
  severityPassed &&
  auditCitationPassed &&
  ruleReferencePassed &&
  correctiveActionPassed &&
  schemaPassed &&
  !hasHallucination;
```

An LLM judge may evaluate semantic relevance, but it must not override deterministic failures such as:

- missed critical finding;
- invalid audit citation;
- unknown rule ID;
- wrong rulebook version;
- invalid schema;
- incomplete corrective action.

---

## 13. Human correction and regression testing

When a reviewer corrects a finding, the system stores:

- original output;
- corrected output;
- failure type;
- correction reason;
- audit and rulebook versions;
- agent version;
- trusted expected result.

The reviewer can click:

```text
Save as regression test
```

That case becomes part of every future candidate evaluation.

Supported failure types:

```ts
type FailureType =
  | 'MISSED_FINDING'
  | 'FALSE_POSITIVE_FINDING'
  | 'WRONG_CATEGORY'
  | 'WRONG_SEVERITY'
  | 'CRITICAL_UNDERCLASSIFICATION'
  | 'INVALID_AUDIT_CITATION'
  | 'INVALID_RULE_REFERENCE'
  | 'UNSUPPORTED_FINDING'
  | 'DUPLICATE_FINDING'
  | 'INCOMPLETE_CAP'
  | 'IRRELEVANT_CAP'
  | 'SCHEMA_ERROR'
  | 'MODEL_TIMEOUT'
  | 'PIPELINE_ERROR';
```

---

## 14. Edge-case generation

A trusted case may generate variations such as:

- indirect wording;
- critical issue described mildly;
- irrelevant surrounding text;
- duplicate references;
- contradictory statements;
- spelling mistakes;
- table-like text;
- prompt injection inside the audit;
- no real violation, to test false positives.

Generated cases must remain `PENDING_REVIEW`.

A human must approve the expected result before the case becomes trusted.

---

## 15. Agent version comparison

For each trusted case:

| Baseline | Candidate | Result         |
| -------- | --------- | -------------- |
| Pass     | Pass      | Stable pass    |
| Fail     | Pass      | Improvement    |
| Pass     | Fail      | Regression     |
| Fail     | Fail      | Stable failure |

The comparison view must show:

- stable passes;
- improvements;
- regressions;
- stable failures;
- critical regressions;
- metric changes;
- cost changes;
- latency changes.

---

## 16. Quality gates

Quality gates are configurable.

Suggested defaults:

```yaml
minimum_critical_finding_recall: 0.95
minimum_finding_precision: 0.90
minimum_audit_citation_precision: 0.98
minimum_rule_reference_accuracy: 0.98
minimum_schema_validity: 1.00
minimum_cap_completeness: 0.95
maximum_critical_regressions: 0
maximum_hallucinated_finding_rate: 0.02
```

A candidate is either:

```text
APPROVED
```

or:

```text
BLOCKED

Reasons:
- Missed one critical safety finding
- Introduced one critical regression
- Rule-reference accuracy was below the configured threshold
```

---

## 17. Product screens

### 17.1 Audit review

Split view:

```text
Audit PDF/pages
|
Structured findings and corrective actions
```

The reviewer can:

- select a finding;
- see highlighted audit evidence;
- open the applicable rule;
- approve;
- correct;
- reject;
- save as regression test.

### 17.2 Rulebook

Displays:

- rulebook name;
- version;
- sections;
- structured rules;
- source pages;
- index status.

### 17.3 Evaluation suite

Displays:

- trusted cases;
- pending generated cases;
- source;
- criticality;
- last result;
- baseline and candidate status.

### 17.4 Agent versions

Displays:

- model;
- prompt version;
- rulebook version;
- retrieval settings;
- schema version.

### 17.5 Evaluation run

Displays:

- cases completed;
- passed;
- failed;
- current cost;
- latency;
- pipeline status.

### 17.6 Version comparison

Displays:

- improvements;
- regressions;
- critical regressions;
- all evaluation metrics;
- quality gate result.

### 17.7 Failure trace

Displays:

- input pages;
- retrieved rules;
- actual output;
- expected output;
- grader results;
- token usage;
- cost;
- stage latency;
- failure category.

---

## 18. Monorepo structure

Use pnpm workspaces and Turborepo.

```text
audit-reliability-lab/
├── apps/
│   ├── web/
│   └── pipeline/
│
├── packages/
│   ├── db/
│   ├── domain/
│   ├── documents/
│   ├── retrieval/
│   ├── agent/
│   ├── evals/
│   ├── ui/
│   ├── eslint-config/
│   ├── typescript-config/
│   └── test-fixtures/
│       ├── audits/
│       ├── rulebooks/
│       └── eval-cases/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

Fixture example:

```text
packages/test-fixtures/
├── audits/
│   ├── factory-audit.pdf
│   └── factory-audit.pages.json
├── rulebooks/
│   ├── supplier-code.pdf
│   ├── supplier-code.rules.json
│   └── supplier-code.embeddings.json
└── eval-cases/
    └── trusted-cases.json
```

---

## 19. Technology stack

### Web

- Next.js App Router;
- TypeScript;
- T3-style architecture;
- tRPC;
- TanStack Query;
- shadcn/ui;
- Tailwind CSS;
- Zod;
- Prisma;
- PostgreSQL;
- React Hook Form.

### Backend pipeline

- separate Node.js TypeScript process;
- database-backed jobs;
- explicit pipeline stages;
- shared domain schemas;
- model-provider adapter;
- trace persistence;
- retry and timeout handling.

### Retrieval

- one embedding provider;
- pgvector or in-memory cosine search for fixtures;
- no separate vector database unless already required.

### Testing

- Vitest;
- React Testing Library;
- optional Playwright flow.

### Code quality

- TypeScript strict mode;
- Zod at external boundaries;
- no `any`;
- no swallowed errors;
- ESLint with zero warnings;
- one formatter only.

Use either:

- ESLint + Prettier; or
- Biome + ESLint only for rules Biome does not cover.

Do not run two competing formatters.

---

## 20. Core database entities

- `SourceDocument`
- `DocumentIngestionJob`
- `SupplierAudit`
- `AuditPage`
- `Rulebook`
- `ComplianceRule`
- `RuleChunk`
- `AuditFinding`
- `CorrectiveAction`
- `AgentVersion`
- `EvalSuite`
- `EvalCase`
- `EvaluationRun`
- `TestExecution`
- `GraderResult`
- `TraceEvent`
- `HumanCorrection`
- `QualityGate`
- `PipelineJob`

---

## 21. Core API surface

### Documents

```ts
document.createUpload;
document.get;
document.getIngestionStatus;
```

### Rulebooks

```ts
rulebook.list;
rulebook.get;
rulebook.ingest;
rulebook.getRules;
```

### Audits

```ts
audit.list;
audit.get;
audit.ingest;
audit.getPages;
audit.runAgent;
audit.getFindings;
audit.updateFinding;
```

### Agent versions

```ts
agentVersion.list;
agentVersion.create;
agentVersion.clone;
agentVersion.setBaseline;
```

### Evals

```ts
evalCase.list;
evalCase.create;
evalCase.generateVariations;
evalCase.approveVariation;
evaluationRun.create;
evaluationRun.get;
evaluationRun.compare;
```

### Corrections

```ts
correction.create;
correction.convertToRegressionTest;
```

### Quality gates

```ts
qualityGate.get;
qualityGate.update;
qualityGate.evaluateCandidate;
```

### Traces

```ts
trace.getByExecution;
```

---

## 22. Observability

Every execution must record:

- audit and rulebook IDs;
- rulebook version;
- parser version;
- embedding model;
- agent version;
- model and prompt version;
- page coverage;
- retrieved rules;
- model calls;
- token usage;
- cost;
- stage latency;
- grader results;
- retries;
- errors.

Do not store hidden chain-of-thought.

Store observable inputs, outputs, retrieval results, tool events, structured decisions, and failures.

---

## 23. Acceptance criteria

The product is complete when:

1. A supplier audit PDF and versioned rulebook PDF are represented as separate inputs.
2. The original documents remain available for inspection.
3. The audit is available as page-preserving parsed text.
4. The rulebook is available as structured rules and retrieval chunks.
5. The selected rulebook version is recorded for every run.
6. The agent processes all required audit pages.
7. The agent generates findings with category, severity, evidence, rule reference, and corrective action.
8. Invalid audit citations are rejected.
9. Unknown rule IDs or wrong rulebook versions are rejected.
10. A human can approve, correct, or reject findings.
11. A correction can become a trusted regression test.
12. Generated edge cases require human approval.
13. A baseline and candidate agent can run against the same frozen test suite.
14. The system calculates the defined domain metrics.
15. The comparison identifies improvements and regressions.
16. Quality gates approve or block the candidate.
17. A failed case has a readable execution trace.
18. The web app and backend pipeline run as separate monorepo applications.
19. Tests, type checking, linting, formatting, and build pass.

---

## 24. Final positioning

> A supplier-audit AI evaluation system that compares audit evidence against versioned supplier rules, validates findings and corrective actions, turns reviewer corrections into permanent regression tests, and blocks agent versions that miss critical risks.
