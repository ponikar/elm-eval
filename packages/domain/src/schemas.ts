import { z } from 'zod';

export const AuditStandardSchema = z.enum(['RBA', 'SLCP', 'BSCI', 'SMETA', 'CUSTOM']);
export const FindingCategorySchema = z.enum([
  'HEALTH_AND_SAFETY',
  'WORKING_HOURS',
  'WAGES_AND_BENEFITS',
  'FORCED_LABOR',
  'CHILD_LABOR',
  'ENVIRONMENT',
  'ETHICS',
  'MANAGEMENT_SYSTEM',
]);
export const SeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const ReviewStatusSchema = z.enum(['PENDING', 'APPROVED', 'CORRECTED', 'REJECTED']);
export const FailureTypeSchema = z.enum([
  'MISSED_FINDING',
  'FALSE_POSITIVE_FINDING',
  'WRONG_CATEGORY',
  'WRONG_SEVERITY',
  'CRITICAL_UNDERCLASSIFICATION',
  'INVALID_CITATION',
  'UNSUPPORTED_FINDING',
  'DUPLICATE_FINDING',
  'POLICY_MISMATCH',
  'INCOMPLETE_CAP',
  'IRRELEVANT_CAP',
  'SCHEMA_ERROR',
  'MODEL_TIMEOUT',
  'PIPELINE_ERROR',
]);

export const EvidenceSchema = z.object({
  pageNumber: z.number().int().positive(),
  quote: z.string().min(8),
});

export const PolicyReferenceSchema = z.object({
  policyName: z.string().min(1),
  section: z.string().min(1),
});

export const CorrectiveActionSchema = z.object({
  action: z.string().min(5),
  ownerRole: z.string().min(1),
  deadlineDays: z.number().int().positive(),
  verificationMethod: z.string().min(5),
  priority: SeveritySchema,
});

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
  title: z.string().min(5),
  description: z.string().min(10),
  category: FindingCategorySchema,
  severity: SeveritySchema,
  evidence: EvidenceSchema,
  policyReference: PolicyReferenceSchema.optional(),
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

export const AgentVersionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  systemPrompt: z.string().min(1),
  temperature: z.number().min(0).max(2),
  policyVersion: z.string().min(1),
  extractionSchemaVersion: z.string().min(1),
  createdAt: z.string(),
  type: z.enum(['baseline', 'candidate']),
});

export const EvalCaseInputSchema = z.object({
  auditText: z.string().min(1),
  pages: z.array(AuditPageSchema).min(1),
  policyContext: z.string().min(1),
});

export const EvalCaseExpectedSchema = z.object({
  findingShouldExist: z.boolean(),
  category: FindingCategorySchema.optional(),
  severity: SeveritySchema.optional(),
  evidencePage: z.number().int().positive().optional(),
  evidenceQuoteContains: z.string().optional(),
  requiredCorrectiveActionFacts: z.array(z.string()).optional(),
  forbiddenClaims: z.array(z.string()).optional(),
});

export const EvalCaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  category: FindingCategorySchema,
  criticality: z.enum(['NORMAL', 'CRITICAL']),
  input: EvalCaseInputSchema,
  expected: EvalCaseExpectedSchema,
  source: z.enum(['HUMAN_CREATED', 'HUMAN_CORRECTION', 'PRODUCTION_FAILURE', 'GENERATED_APPROVED']),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'TRUSTED']),
  parentCaseId: z.string().optional(),
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

export type AuditStandard = z.infer<typeof AuditStandardSchema>;
export type FindingCategory = z.infer<typeof FindingCategorySchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export type FailureType = z.infer<typeof FailureTypeSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type CorrectiveAction = z.infer<typeof CorrectiveActionSchema>;
export type AuditPage = z.infer<typeof AuditPageSchema>;
export type SupplierAudit = z.infer<typeof SupplierAuditSchema>;
export type AuditFinding = z.infer<typeof AuditFindingSchema>;
export type AgentVersion = z.infer<typeof AgentVersionSchema>;
export type EvalCase = z.infer<typeof EvalCaseSchema>;
export type TraceEvent = z.infer<typeof TraceEventSchema>;
