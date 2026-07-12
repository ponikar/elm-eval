import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const AuditStandardSchema = z.enum(["RBA", "SLCP", "BSCI", "SMETA", "CUSTOM"]);

export const FindingCategorySchema = z.enum([
  "HEALTH_AND_SAFETY",
  "WORKING_HOURS",
  "WAGES_AND_BENEFITS",
  "FORCED_LABOR",
  "CHILD_LABOR",
  "ENVIRONMENT",
  "ETHICS",
  "MANAGEMENT_SYSTEM",
]);

export const SeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const ReviewStatusSchema = z.enum(["PENDING", "APPROVED", "CORRECTED", "REJECTED"]);

export const CorrectiveActionPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const FailureTypeSchema = z.enum([
  "MISSED_FINDING",
  "FALSE_POSITIVE_FINDING",
  "WRONG_CATEGORY",
  "WRONG_SEVERITY",
  "CRITICAL_UNDERCLASSIFICATION",
  "INVALID_AUDIT_CITATION",
  "INVALID_RULE_REFERENCE",
  "UNSUPPORTED_FINDING",
  "DUPLICATE_FINDING",
  "INCOMPLETE_CAP",
  "IRRELEVANT_CAP",
  "SCHEMA_ERROR",
  "MODEL_TIMEOUT",
  "PIPELINE_ERROR",
]);

// ─── Shared types ────────────────────────────────────────────────────────────

export const EvidenceSchema = z.object({
  pageNumber: z.number().int().positive(),
  quote: z.string().min(8),
});

export const ApplicableRuleSchema = z.object({
  ruleId: z.string().min(1),
  rulebookVersion: z.string().min(1),
});

export const AuditEvidenceSchema = z.object({
  pageNumber: z.number().int().positive(),
  textContains: z.string().min(1),
});

export const SeverityGuidanceSchema = z.object({
  defaultSeverity: SeveritySchema.optional(),
  escalationConditions: z.array(z.string()).optional(),
});

export const CorrectiveActionSchema = z.object({
  action: z.string().min(5),
  ownerRole: z.string().min(1),
  deadlineDays: z.number().int().positive(),
  verificationMethod: z.string().min(5),
  priority: CorrectiveActionPrioritySchema,
});

// ─── Audit types ─────────────────────────────────────────────────────────────

export const AuditPageSchema = z.object({
  pageNumber: z.number().int().positive(),
  text: z.string().min(1),
});

export const SupplierAuditSchema = z.object({
  id: z.string(),
  supplierName: z.string().min(1),
  factoryName: z.string().min(1),
  auditStandard: AuditStandardSchema,
  auditDate: z.string(),
  documentName: z.string().min(1),
  pages: z.array(AuditPageSchema).min(1),
});

export const AuditFindingSchema = z.object({
  id: z.string(),
  auditId: z.string(),
  agentVersionId: z.string(),
  title: z.string().min(5),
  description: z.string().min(10),
  category: FindingCategorySchema,
  severity: SeveritySchema,
  auditEvidence: EvidenceSchema,
  applicableRule: ApplicableRuleSchema,
  confidence: z.number().min(0).max(1),
  correctiveAction: CorrectiveActionSchema,
  reviewStatus: ReviewStatusSchema,
});

export const FindingExtractionInputSchema = z.object({
  auditText: z.string().min(1),
  pages: z.array(AuditPageSchema).min(1),
  policyContext: z.string().min(1),
});

export const FindingExtractionOutputSchema = z.object({
  findings: z.array(
    z.object({
      title: z.string().min(5),
      description: z.string().min(10),
      category: FindingCategorySchema,
      severity: SeveritySchema,
      evidence: EvidenceSchema,
      confidence: z.number().min(0).max(1),
    }),
  ),
});

// ─── Rulebook types ──────────────────────────────────────────────────────────

export const RulebookSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  version: z.string().min(1),
  standard: AuditStandardSchema,
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
  language: z.string().default("en"),
  indexStatus: z.enum(["PENDING", "INDEXING", "INDEXED", "FAILED"]),
});

export const ComplianceRuleSchema = z.object({
  id: z.string(),
  rulebookId: z.string(),
  rulebookVersion: z.string(),
  sectionId: z.string(),
  sectionTitle: z.string(),
  category: FindingCategorySchema,
  requirementText: z.string(),
  sourcePage: z.number().int().positive(),
  severityGuidance: SeverityGuidanceSchema.optional(),
  correctiveActionGuidance: z.array(z.string()).optional(),
});

export const RuleChunkSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  rulebookId: z.string(),
  rulebookVersion: z.string(),
  text: z.string(),
  pageNumber: z.number().int().positive(),
  metadata: z.object({
    sectionId: z.string(),
    sectionTitle: z.string(),
    category: FindingCategorySchema,
  }),
});

// ─── Agent types ─────────────────────────────────────────────────────────────

export const AgentVersionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  systemPrompt: z.string().min(1),
  temperature: z.number().min(0).max(2),
  rulebookVersionId: z.string(),
  retrievalTopK: z.number().int().positive(),
  extractionSchemaVersion: z.string().min(1),
  correctiveActionPromptVersion: z.string().min(1),
  timeoutMs: z.number().int().positive(),
  maxRetries: z.number().int().min(0),
  createdAt: z.string(),
  type: z.enum(["baseline", "candidate"]),
});

// ─── Eval types ──────────────────────────────────────────────────────────────

export const EvalCaseInputSchema = z.object({
  auditPages: z.array(AuditPageSchema).min(1),
  rulebookVersionId: z.string(),
});

export const EvalCaseExpectedSchema = z.object({
  findingShouldExist: z.boolean(),
  category: FindingCategorySchema.optional(),
  severity: SeveritySchema.optional(),
  auditEvidence: AuditEvidenceSchema.optional(),
  applicableRule: ApplicableRuleSchema.optional(),
  requiredCorrectiveActionFacts: z.array(z.string()).optional(),
  forbiddenClaims: z.array(z.string()).optional(),
});

export const EvalCaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  category: FindingCategorySchema,
  criticality: z.enum(["NORMAL", "CRITICAL"]),
  input: EvalCaseInputSchema,
  expected: z.array(EvalCaseExpectedSchema),
  source: z.enum(["HUMAN_CREATED", "HUMAN_CORRECTION", "PRODUCTION_FAILURE", "GENERATED_APPROVED"]),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "TRUSTED"]),
  parentCaseId: z.string().optional(),
});

// ─── Pipeline types ──────────────────────────────────────────────────────────

export const EvaluationRunSchema = z.object({
  id: z.string(),
  agentVersionId: z.string(),
  suiteId: z.string(),
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});

export const TestExecutionSchema = z.object({
  id: z.string(),
  runId: z.string(),
  evalCaseId: z.string(),
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]),
  agentOutput: z.string(),
  graderResult: z.string(),
  passed: z.boolean(),
  costUsd: z.number().min(0),
  latencyMs: z.number().int().min(0),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});

export const GraderResultSchema = z.object({
  findingRecallPassed: z.boolean(),
  categoryPassed: z.boolean(),
  severityPassed: z.boolean(),
  auditCitationPassed: z.boolean(),
  ruleReferencePassed: z.boolean(),
  correctiveActionPassed: z.boolean(),
  schemaPassed: z.boolean(),
  hasHallucination: z.boolean(),
  details: z.record(z.string()).optional(),
});

export const TraceEventSchema = z.object({
  id: z.string(),
  executionId: z.string(),
  stage: z.string(),
  eventType: z.string(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  durationMs: z.number().optional(),
  inputSummary: z.unknown().optional(),
  outputSummary: z.unknown().optional(),
  errorCode: z.string().optional(),
  tokenUsage: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
  costUsd: z.number().optional(),
});

// ─── Comparison types ────────────────────────────────────────────────────────

export const ComparisonResultSchema = z.object({
  baseline: z.object({ id: z.string(), name: z.string() }),
  candidate: z.object({ id: z.string(), name: z.string() }),
  regressions: z.array(
    z.object({
      caseName: z.string(),
      criticality: z.enum(["NORMAL", "CRITICAL"]),
      failureType: FailureTypeSchema,
      executionId: z.string(),
    }),
  ),
  improvements: z.array(
    z.object({
      caseName: z.string(),
      criticality: z.enum(["NORMAL", "CRITICAL"]),
      executionId: z.string(),
    }),
  ),
  stablePasses: z.number().int(),
  stableFailures: z.number().int(),
  criticalRegressions: z.number().int(),
});

export const QualityGateResultSchema = z.object({
  passed: z.boolean(),
  reasons: z.array(z.string()),
});

// ─── Type exports ────────────────────────────────────────────────────────────

export type AuditStandard = z.infer<typeof AuditStandardSchema>;
export type FindingCategory = z.infer<typeof FindingCategorySchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export type CorrectiveActionPriority = z.infer<typeof CorrectiveActionPrioritySchema>;
export type FailureType = z.infer<typeof FailureTypeSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type ApplicableRule = z.infer<typeof ApplicableRuleSchema>;
export type AuditEvidence = z.infer<typeof AuditEvidenceSchema>;
export type CorrectiveAction = z.infer<typeof CorrectiveActionSchema>;
export type AuditPage = z.infer<typeof AuditPageSchema>;
export type SupplierAudit = z.infer<typeof SupplierAuditSchema>;
export type AuditFinding = z.infer<typeof AuditFindingSchema>;
export type Rulebook = z.infer<typeof RulebookSchema>;
export type ComplianceRule = z.infer<typeof ComplianceRuleSchema>;
export type RuleChunk = z.infer<typeof RuleChunkSchema>;
export type AgentVersion = z.infer<typeof AgentVersionSchema>;
export type EvalCase = z.infer<typeof EvalCaseSchema>;
export type EvaluationRun = z.infer<typeof EvaluationRunSchema>;
export type TestExecution = z.infer<typeof TestExecutionSchema>;
export type GraderResult = z.infer<typeof GraderResultSchema>;
export type TraceEvent = z.infer<typeof TraceEventSchema>;
export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;
export type QualityGateResult = z.infer<typeof QualityGateResultSchema>;
