import { relations, sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─── Core audit tables ───────────────────────────────────────────────────────

export const supplierAudit = pgTable('supplier_audit', {
  id: text('id').primaryKey(),
  supplierName: text('supplier_name').notNull(),
  factoryName: text('factory_name').notNull(),
  auditStandard: text('audit_standard').notNull(),
  auditDate: text('audit_date').notNull(),
  documentName: text('document_name').notNull(),
  status: text('status').notNull().default('uploaded'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const auditPage = pgTable(
  'audit_page',
  {
    id: text('id').primaryKey(),
    auditId: text('audit_id')
      .notNull()
      .references(() => supplierAudit.id, { onDelete: 'cascade' }),
    pageNumber: integer('page_number').notNull(),
    text: text('text').notNull(),
    normalizedText: text('normalized_text'),
    extractionStatus: text('extraction_status').notNull().default('PENDING'),
    parserVersion: text('parser_version'),
  },
  (table) => [uniqueIndex('audit_page_audit_number_unique').on(table.auditId, table.pageNumber)],
);

export const pipelineJob = pgTable(
  'pipeline_job',
  {
    id: text('id').primaryKey(),
    auditId: text('audit_id')
      .notNull()
      .references(() => supplierAudit.id, { onDelete: 'cascade' }),
    agentVersionId: text('agent_version_id')
      .notNull()
      .references(() => agentVersion.id),
    rulebookVersion: text('rulebook_version').notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    status: text('status').notNull().default('PENDING'),
    attemptCount: integer('attempt_count').notNull().default(0),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    createdAt: text('created_at').notNull(),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
  },
  (table) => [index('pipeline_job_status_idx').on(table.status)],
);

// ─── Rulebook tables ─────────────────────────────────────────────────────────

export const sourceDocument = pgTable('source_document', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  version: text('version'),
  language: text('language').notNull().default('en'),
  filePath: text('file_path'),
  createdAt: text('created_at').notNull(),
});

export const rulebook = pgTable(
  'rulebook',
  {
    id: text('id').primaryKey(),
    sourceDocumentId: text('source_document_id').references(() => sourceDocument.id),
    name: text('name').notNull(),
    version: text('version').notNull(),
    standard: text('standard').notNull(),
    effectiveFrom: text('effective_from').notNull(),
    effectiveTo: text('effective_to'),
    language: text('language').notNull().default('en'),
    indexStatus: text('index_status').notNull().default('PENDING'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('rulebook_standard_version_unique').on(table.standard, table.version)],
);

export const complianceRule = pgTable('compliance_rule', {
  id: text('id').primaryKey(),
  rulebookId: text('rulebook_id')
    .notNull()
    .references(() => rulebook.id, { onDelete: 'cascade' }),
  rulebookVersion: text('rulebook_version').notNull(),
  sectionId: text('section_id').notNull(),
  sectionTitle: text('section_title').notNull(),
  category: text('category').notNull(),
  requirementText: text('requirement_text').notNull(),
  sourcePage: integer('source_page').notNull(),
  severityGuidance: jsonb('severity_guidance'),
  correctiveActionGuidance: jsonb('corrective_action_guidance'),
});

export const ruleChunk = pgTable('rule_chunk', {
  id: text('id').primaryKey(),
  ruleId: text('rule_id')
    .notNull()
    .references(() => complianceRule.id, { onDelete: 'cascade' }),
  rulebookId: text('rulebook_id')
    .notNull()
    .references(() => rulebook.id, { onDelete: 'cascade' }),
  rulebookVersion: text('rulebook_version').notNull(),
  text: text('text').notNull(),
  pageNumber: integer('page_number').notNull(),
  sectionId: text('section_id').notNull(),
  sectionTitle: text('section_title').notNull(),
  category: text('category').notNull(),
  embedding: text('embedding'),
  embeddingModel: text('embedding_model'),
  createdAt: text('created_at').notNull(),
});

// ─── Finding tables ──────────────────────────────────────────────────────────

export const auditFinding = pgTable(
  'audit_finding',
  {
    id: text('id').primaryKey(),
    auditId: text('audit_id')
      .notNull()
      .references(() => supplierAudit.id, { onDelete: 'cascade' }),
    agentVersionId: text('agent_version_id')
      .notNull()
      .references(() => agentVersion.id),
    pipelineJobId: text('pipeline_job_id').references(() => pipelineJob.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    severity: text('severity').notNull(),
    evidencePage: integer('evidence_page').notNull(),
    evidenceQuote: text('evidence_quote').notNull(),
    ruleId: text('rule_id').notNull(),
    rulebookVersion: text('rulebook_version').notNull(),
    confidence: numeric('confidence', { mode: 'number' }).notNull(),
    correctiveAction: text('corrective_action').notNull(),
    reviewStatus: text('review_status').notNull().default('PENDING'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('audit_finding_job_idx').on(table.pipelineJobId)],
);

// ─── Agent version ───────────────────────────────────────────────────────────

export const agentVersion = pgTable('agent_version', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  model: text('model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  temperature: numeric('temperature', { mode: 'number' }).notNull(),
  rulebookVersionId: text('rulebook_version_id')
    .notNull()
    .references(() => rulebook.id),
  retrievalTopK: integer('retrieval_top_k').notNull(),
  extractionSchemaVersion: text('extraction_schema_version').notNull(),
  correctiveActionPromptVersion: text('corrective_action_prompt_version').notNull(),
  timeoutMs: integer('timeout_ms').notNull(),
  maxRetries: integer('max_retries').notNull(),
  type: text('type').notNull().default('candidate'),
  createdAt: text('created_at').notNull(),
});

// ─── Eval tables ─────────────────────────────────────────────────────────────

export const evalCase = pgTable(
  'eval_case',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    criticality: text('criticality').notNull().default('NORMAL'),
    inputAuditPages: text('input_audit_pages').notNull(),
    inputRulebookVersionId: text('input_rulebook_version_id')
      .notNull()
      .references(() => rulebook.id),
    expectedJson: text('expected_json').notNull(),
    source: text('source').notNull().default('HUMAN_CREATED'),
    status: text('status').notNull().default('DRAFT'),
    parentCaseId: text('parent_case_id').references((): AnyPgColumn => evalCase.id),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('eval_case_parent_idx').on(table.parentCaseId)],
);

export const evalSuite = pgTable(
  'eval_suite',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    version: integer('version').notNull(),
    description: text('description'),
    status: text('status').notNull().default('DRAFT'),
    contentHash: text('content_hash').notNull(),
    createdAt: text('created_at').notNull(),
    frozenAt: text('frozen_at'),
  },
  (table) => [
    uniqueIndex('eval_suite_name_version_unique').on(table.name, table.version),
    uniqueIndex('eval_suite_content_hash_unique').on(table.contentHash),
    check('eval_suite_positive_version', sql`${table.version} > 0`),
  ],
);

export const evalSuiteCase = pgTable(
  'eval_suite_case',
  {
    suiteId: text('suite_id')
      .notNull()
      .references(() => evalSuite.id),
    evalCaseId: text('eval_case_id')
      .notNull()
      .references(() => evalCase.id),
    ordinal: integer('ordinal').notNull(),
    caseContentHash: text('case_content_hash').notNull(),
    caseSnapshotJson: text('case_snapshot_json').notNull(),
    addedAt: text('added_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.suiteId, table.evalCaseId] }),
    uniqueIndex('eval_suite_case_ordinal_unique').on(table.suiteId, table.ordinal),
    check('eval_suite_case_nonnegative_ordinal', sql`${table.ordinal} >= 0`),
  ],
);

export const humanCorrection = pgTable(
  'human_correction',
  {
    id: text('id').primaryKey(),
    findingId: text('finding_id')
      .notNull()
      .references(() => auditFinding.id),
    auditId: text('audit_id')
      .notNull()
      .references(() => supplierAudit.id),
    agentVersionId: text('agent_version_id')
      .notNull()
      .references(() => agentVersion.id),
    rulebookVersionId: text('rulebook_version_id')
      .notNull()
      .references(() => rulebook.id),
    failureType: text('failure_type').notNull(),
    reason: text('reason').notNull(),
    originalFindingJson: text('original_finding_json').notNull(),
    correctedFindingJson: text('corrected_finding_json').notNull(),
    regressionEvalCaseId: text('regression_eval_case_id').references(() => evalCase.id),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('human_correction_finding_idx').on(table.findingId),
    uniqueIndex('human_correction_regression_case_unique').on(table.regressionEvalCaseId),
  ],
);

export const evaluationRun = pgTable(
  'evaluation_run',
  {
    id: text('id').primaryKey(),
    agentVersionId: text('agent_version_id')
      .notNull()
      .references(() => agentVersion.id),
    suiteId: text('suite_id')
      .notNull()
      .references(() => evalSuite.id),
    rulebookVersionId: text('rulebook_version_id')
      .notNull()
      .references(() => rulebook.id),
    idempotencyKey: text('idempotency_key').notNull(),
    suiteContentHash: text('suite_content_hash').notNull(),
    suiteSnapshotJson: text('suite_snapshot_json').notNull(),
    agentVersionSnapshotJson: text('agent_version_snapshot_json').notNull(),
    status: text('status').notNull().default('PENDING'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    createdAt: text('created_at').notNull(),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
  },
  (table) => [
    uniqueIndex('evaluation_run_idempotency_unique').on(table.idempotencyKey),
    index('evaluation_run_suite_status_idx').on(table.suiteId, table.status),
  ],
);

export const testExecution = pgTable(
  'test_execution',
  {
    id: text('id').primaryKey(),
    runId: text('run_id')
      .notNull()
      .references(() => evaluationRun.id, { onDelete: 'cascade' }),
    evalCaseId: text('eval_case_id')
      .notNull()
      .references(() => evalCase.id),
    status: text('status').notNull().default('PENDING'),
    agentOutput: text('agent_output'),
    passed: boolean('passed'),
    agentCostUsd: numeric('agent_cost_usd', { mode: 'number' }).notNull().default(0),
    evaluatorCostUsd: numeric('evaluator_cost_usd', { mode: 'number' }).notNull().default(0),
    tokenInput: integer('token_input').notNull().default(0),
    tokenOutput: integer('token_output').notNull().default(0),
    latencyMs: integer('latency_ms').notNull().default(0),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    createdAt: text('created_at').notNull(),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
  },
  (table) => [
    uniqueIndex('test_execution_run_case_unique').on(table.runId, table.evalCaseId),
    index('test_execution_run_status_idx').on(table.runId, table.status),
    check(
      'test_execution_nonnegative_usage',
      sql`${table.agentCostUsd} >= 0 and ${table.evaluatorCostUsd} >= 0 and ${table.tokenInput} >= 0 and ${table.tokenOutput} >= 0 and ${table.latencyMs} >= 0`,
    ),
  ],
);

export const graderResult = pgTable(
  'grader_result',
  {
    id: text('id').primaryKey(),
    executionId: text('execution_id')
      .notNull()
      .references(() => testExecution.id, { onDelete: 'cascade' }),
    graderVersion: text('grader_version').notNull(),
    passed: boolean('passed').notNull(),
    deterministicPassed: boolean('deterministic_passed').notNull(),
    findingRecall: numeric('finding_recall', { mode: 'number' }),
    criticalFindingRecall: numeric('critical_finding_recall', { mode: 'number' }),
    findingPrecision: numeric('finding_precision', { mode: 'number' }),
    categoryAccuracy: numeric('category_accuracy', { mode: 'number' }),
    severityAccuracy: numeric('severity_accuracy', { mode: 'number' }),
    criticalUnderclassificationCount: integer('critical_underclassification_count')
      .notNull()
      .default(0),
    auditCitationPrecision: numeric('audit_citation_precision', { mode: 'number' }),
    ruleReferenceAccuracy: numeric('rule_reference_accuracy', { mode: 'number' }),
    hallucinatedFindingRate: numeric('hallucinated_finding_rate', { mode: 'number' }),
    correctiveActionCompleteness: numeric('corrective_action_completeness', { mode: 'number' }),
    schemaValidity: numeric('schema_validity', { mode: 'number' }),
    failureTypesJson: jsonb('failure_types_json').notNull(),
    detailsJson: jsonb('details_json').notNull(),
    judgeModel: text('judge_model'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('grader_result_execution_unique').on(table.executionId),
    check(
      'grader_result_nonnegative_underclassification',
      sql`${table.criticalUnderclassificationCount} >= 0`,
    ),
  ],
);

export const runComparison = pgTable(
  'run_comparison',
  {
    id: text('id').primaryKey(),
    baselineRunId: text('baseline_run_id')
      .notNull()
      .references(() => evaluationRun.id),
    candidateRunId: text('candidate_run_id')
      .notNull()
      .references(() => evaluationRun.id),
    status: text('status').notNull().default('PENDING'),
    stablePassCount: integer('stable_pass_count').notNull().default(0),
    improvementCount: integer('improvement_count').notNull().default(0),
    regressionCount: integer('regression_count').notNull().default(0),
    stableFailureCount: integer('stable_failure_count').notNull().default(0),
    criticalRegressionCount: integer('critical_regression_count').notNull().default(0),
    metricDeltaJson: jsonb('metric_delta_json'),
    costDeltaUsd: numeric('cost_delta_usd', { mode: 'number' }),
    latencyDeltaMs: integer('latency_delta_ms'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    createdAt: text('created_at').notNull(),
    completedAt: text('completed_at'),
  },
  (table) => [
    uniqueIndex('run_comparison_pair_unique').on(table.baselineRunId, table.candidateRunId),
    check('run_comparison_distinct_runs', sql`${table.baselineRunId} <> ${table.candidateRunId}`),
    check(
      'run_comparison_nonnegative_counts',
      sql`${table.stablePassCount} >= 0 and ${table.improvementCount} >= 0 and ${table.regressionCount} >= 0 and ${table.stableFailureCount} >= 0 and ${table.criticalRegressionCount} >= 0`,
    ),
  ],
);

export const caseComparison = pgTable(
  'case_comparison',
  {
    id: text('id').primaryKey(),
    comparisonId: text('comparison_id')
      .notNull()
      .references(() => runComparison.id, { onDelete: 'cascade' }),
    evalCaseId: text('eval_case_id')
      .notNull()
      .references(() => evalCase.id),
    baselineExecutionId: text('baseline_execution_id')
      .notNull()
      .references(() => testExecution.id),
    candidateExecutionId: text('candidate_execution_id')
      .notNull()
      .references(() => testExecution.id),
    classification: text('classification').notNull(),
    isCritical: boolean('is_critical').notNull(),
    metricDeltaJson: jsonb('metric_delta_json'),
  },
  (table) => [
    uniqueIndex('case_comparison_case_unique').on(table.comparisonId, table.evalCaseId),
    check(
      'case_comparison_distinct_executions',
      sql`${table.baselineExecutionId} <> ${table.candidateExecutionId}`,
    ),
  ],
);

export const qualityGate = pgTable(
  'quality_gate',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    version: integer('version').notNull(),
    status: text('status').notNull().default('ACTIVE'),
    minimumCriticalFindingRecall: numeric('minimum_critical_finding_recall', {
      mode: 'number',
    })
      .notNull()
      .default(0.95),
    minimumFindingPrecision: numeric('minimum_finding_precision', { mode: 'number' })
      .notNull()
      .default(0.9),
    minimumAuditCitationPrecision: numeric('minimum_audit_citation_precision', {
      mode: 'number',
    })
      .notNull()
      .default(0.98),
    minimumRuleReferenceAccuracy: numeric('minimum_rule_reference_accuracy', { mode: 'number' })
      .notNull()
      .default(0.98),
    minimumSchemaValidity: numeric('minimum_schema_validity', { mode: 'number' })
      .notNull()
      .default(1),
    minimumCapCompleteness: numeric('minimum_cap_completeness', { mode: 'number' })
      .notNull()
      .default(0.95),
    maximumCriticalRegressions: integer('maximum_critical_regressions').notNull().default(0),
    maximumHallucinatedFindingRate: numeric('maximum_hallucinated_finding_rate', {
      mode: 'number',
    })
      .notNull()
      .default(0.02),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('quality_gate_name_version_unique').on(table.name, table.version),
    check('quality_gate_positive_version', sql`${table.version} > 0`),
    check('quality_gate_nonnegative_regressions', sql`${table.maximumCriticalRegressions} >= 0`),
  ],
);

export const qualityGateEvaluation = pgTable(
  'quality_gate_evaluation',
  {
    id: text('id').primaryKey(),
    qualityGateId: text('quality_gate_id')
      .notNull()
      .references(() => qualityGate.id),
    comparisonId: text('comparison_id')
      .notNull()
      .references(() => runComparison.id),
    decision: text('decision').notNull(),
    reasonsJson: jsonb('reasons_json').notNull(),
    qualityGateSnapshotJson: jsonb('quality_gate_snapshot_json').notNull(),
    metricsSnapshotJson: jsonb('metrics_snapshot_json').notNull(),
    evaluatedAt: text('evaluated_at').notNull(),
  },
  (table) => [
    uniqueIndex('quality_gate_evaluation_unique').on(table.qualityGateId, table.comparisonId),
  ],
);

export const traceEvent = pgTable(
  'trace_event',
  {
    id: text('id').primaryKey(),
    executionId: text('execution_id').references(() => testExecution.id, { onDelete: 'cascade' }),
    pipelineJobId: text('pipeline_job_id').references(() => pipelineJob.id, {
      onDelete: 'cascade',
    }),
    stage: text('stage').notNull(),
    eventType: text('event_type').notNull(),
    sequence: integer('sequence').notNull(),
    attempt: integer('attempt'),
    startedAt: text('started_at').notNull(),
    completedAt: text('completed_at'),
    durationMs: integer('duration_ms'),
    inputSummary: text('input_summary'),
    outputSummary: text('output_summary'),
    errorCode: text('error_code'),
    tokenInput: integer('token_input'),
    tokenOutput: integer('token_output'),
    costUsd: numeric('cost_usd', { mode: 'number' }),
  },
  (table) => [
    uniqueIndex('trace_event_job_sequence_unique').on(table.pipelineJobId, table.sequence),
    uniqueIndex('trace_event_execution_sequence_unique').on(table.executionId, table.sequence),
    check(
      'trace_event_exactly_one_owner',
      sql`(${table.executionId} is not null and ${table.pipelineJobId} is null) or (${table.executionId} is null and ${table.pipelineJobId} is not null)`,
    ),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const supplierAuditRelations = relations(supplierAudit, ({ many }) => ({
  pages: many(auditPage),
  findings: many(auditFinding),
  pipelineJobs: many(pipelineJob),
}));
export const pipelineJobRelations = relations(pipelineJob, ({ one, many }) => ({
  audit: one(supplierAudit, { fields: [pipelineJob.auditId], references: [supplierAudit.id] }),
  agentVersion: one(agentVersion, {
    fields: [pipelineJob.agentVersionId],
    references: [agentVersion.id],
  }),
  findings: many(auditFinding),
  traceEvents: many(traceEvent),
}));

export const auditPageRelations = relations(auditPage, ({ one }) => ({
  audit: one(supplierAudit, {
    fields: [auditPage.auditId],
    references: [supplierAudit.id],
  }),
}));

export const sourceDocumentRelations = relations(sourceDocument, ({ many }) => ({
  rulebooks: many(rulebook),
}));

export const rulebookRelations = relations(rulebook, ({ one, many }) => ({
  sourceDocument: one(sourceDocument, {
    fields: [rulebook.sourceDocumentId],
    references: [sourceDocument.id],
  }),
  rules: many(complianceRule),
  chunks: many(ruleChunk),
}));

export const complianceRuleRelations = relations(complianceRule, ({ one, many }) => ({
  rulebook: one(rulebook, {
    fields: [complianceRule.rulebookId],
    references: [rulebook.id],
  }),
  chunks: many(ruleChunk),
}));

export const ruleChunkRelations = relations(ruleChunk, ({ one }) => ({
  rule: one(complianceRule, {
    fields: [ruleChunk.ruleId],
    references: [complianceRule.id],
  }),
  rulebook: one(rulebook, {
    fields: [ruleChunk.rulebookId],
    references: [rulebook.id],
  }),
}));

export const auditFindingRelations = relations(auditFinding, ({ one }) => ({
  audit: one(supplierAudit, {
    fields: [auditFinding.auditId],
    references: [supplierAudit.id],
  }),
  agentVersion: one(agentVersion, {
    fields: [auditFinding.agentVersionId],
    references: [agentVersion.id],
  }),
  pipelineJob: one(pipelineJob, {
    fields: [auditFinding.pipelineJobId],
    references: [pipelineJob.id],
  }),
}));

export const humanCorrectionRelations = relations(humanCorrection, ({ one }) => ({
  finding: one(auditFinding, {
    fields: [humanCorrection.findingId],
    references: [auditFinding.id],
  }),
  audit: one(supplierAudit, {
    fields: [humanCorrection.auditId],
    references: [supplierAudit.id],
  }),
  agentVersion: one(agentVersion, {
    fields: [humanCorrection.agentVersionId],
    references: [agentVersion.id],
  }),
  rulebook: one(rulebook, {
    fields: [humanCorrection.rulebookVersionId],
    references: [rulebook.id],
  }),
  regressionEvalCase: one(evalCase, {
    fields: [humanCorrection.regressionEvalCaseId],
    references: [evalCase.id],
  }),
}));

export const agentVersionRelations = relations(agentVersion, ({ one, many }) => ({
  rulebook: one(rulebook, {
    fields: [agentVersion.rulebookVersionId],
    references: [rulebook.id],
  }),
  findings: many(auditFinding),
  evaluationRuns: many(evaluationRun),
  pipelineJobs: many(pipelineJob),
}));

export const evalCaseRelations = relations(evalCase, ({ one, many }) => ({
  rulebook: one(rulebook, {
    fields: [evalCase.inputRulebookVersionId],
    references: [rulebook.id],
  }),
  parent: one(evalCase, {
    fields: [evalCase.parentCaseId],
    references: [evalCase.id],
    relationName: 'eval_case_parent',
  }),
  variations: many(evalCase, { relationName: 'eval_case_parent' }),
  suiteMemberships: many(evalSuiteCase),
  testExecutions: many(testExecution),
  caseComparisons: many(caseComparison),
}));

export const evalSuiteRelations = relations(evalSuite, ({ many }) => ({
  cases: many(evalSuiteCase),
  evaluationRuns: many(evaluationRun),
}));

export const evalSuiteCaseRelations = relations(evalSuiteCase, ({ one }) => ({
  suite: one(evalSuite, {
    fields: [evalSuiteCase.suiteId],
    references: [evalSuite.id],
  }),
  evalCase: one(evalCase, {
    fields: [evalSuiteCase.evalCaseId],
    references: [evalCase.id],
  }),
}));

export const evaluationRunRelations = relations(evaluationRun, ({ one, many }) => ({
  agentVersion: one(agentVersion, {
    fields: [evaluationRun.agentVersionId],
    references: [agentVersion.id],
  }),
  suite: one(evalSuite, {
    fields: [evaluationRun.suiteId],
    references: [evalSuite.id],
  }),
  rulebook: one(rulebook, {
    fields: [evaluationRun.rulebookVersionId],
    references: [rulebook.id],
  }),
  testExecutions: many(testExecution),
  baselineComparisons: many(runComparison, { relationName: 'comparison_baseline_run' }),
  candidateComparisons: many(runComparison, { relationName: 'comparison_candidate_run' }),
}));

export const testExecutionRelations = relations(testExecution, ({ one, many }) => ({
  run: one(evaluationRun, {
    fields: [testExecution.runId],
    references: [evaluationRun.id],
  }),
  evalCase: one(evalCase, {
    fields: [testExecution.evalCaseId],
    references: [evalCase.id],
  }),
  traceEvents: many(traceEvent),
  graderResult: one(graderResult),
  baselineCaseComparisons: many(caseComparison, { relationName: 'case_comparison_baseline' }),
  candidateCaseComparisons: many(caseComparison, { relationName: 'case_comparison_candidate' }),
}));

export const graderResultRelations = relations(graderResult, ({ one }) => ({
  execution: one(testExecution, {
    fields: [graderResult.executionId],
    references: [testExecution.id],
  }),
}));

export const runComparisonRelations = relations(runComparison, ({ one, many }) => ({
  baselineRun: one(evaluationRun, {
    fields: [runComparison.baselineRunId],
    references: [evaluationRun.id],
    relationName: 'comparison_baseline_run',
  }),
  candidateRun: one(evaluationRun, {
    fields: [runComparison.candidateRunId],
    references: [evaluationRun.id],
    relationName: 'comparison_candidate_run',
  }),
  cases: many(caseComparison),
  gateEvaluations: many(qualityGateEvaluation),
}));

export const caseComparisonRelations = relations(caseComparison, ({ one }) => ({
  comparison: one(runComparison, {
    fields: [caseComparison.comparisonId],
    references: [runComparison.id],
  }),
  evalCase: one(evalCase, {
    fields: [caseComparison.evalCaseId],
    references: [evalCase.id],
  }),
  baselineExecution: one(testExecution, {
    fields: [caseComparison.baselineExecutionId],
    references: [testExecution.id],
    relationName: 'case_comparison_baseline',
  }),
  candidateExecution: one(testExecution, {
    fields: [caseComparison.candidateExecutionId],
    references: [testExecution.id],
    relationName: 'case_comparison_candidate',
  }),
}));

export const qualityGateRelations = relations(qualityGate, ({ many }) => ({
  evaluations: many(qualityGateEvaluation),
}));

export const qualityGateEvaluationRelations = relations(qualityGateEvaluation, ({ one }) => ({
  qualityGate: one(qualityGate, {
    fields: [qualityGateEvaluation.qualityGateId],
    references: [qualityGate.id],
  }),
  comparison: one(runComparison, {
    fields: [qualityGateEvaluation.comparisonId],
    references: [runComparison.id],
  }),
}));

export const traceEventRelations = relations(traceEvent, ({ one }) => ({
  execution: one(testExecution, {
    fields: [traceEvent.executionId],
    references: [testExecution.id],
  }),
  pipelineJob: one(pipelineJob, {
    fields: [traceEvent.pipelineJobId],
    references: [pipelineJob.id],
  }),
}));
