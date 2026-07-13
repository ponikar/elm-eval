import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ─── Core audit tables ───────────────────────────────────────────────────────

export const supplierAudit = sqliteTable('supplier_audit', {
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

export const auditPage = sqliteTable(
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

export const pipelineJob = sqliteTable(
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

export const sourceDocument = sqliteTable('source_document', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  version: text('version'),
  language: text('language').notNull().default('en'),
  filePath: text('file_path'),
  createdAt: text('created_at').notNull(),
});

export const rulebook = sqliteTable('rulebook', {
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
});

export const complianceRule = sqliteTable('compliance_rule', {
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
  severityGuidance: text('severity_guidance'),
  correctiveActionGuidance: text('corrective_action_guidance'),
});

export const ruleChunk = sqliteTable('rule_chunk', {
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

export const auditFinding = sqliteTable(
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
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    severity: text('severity').notNull(),
    evidencePage: integer('evidence_page').notNull(),
    evidenceQuote: text('evidence_quote').notNull(),
    ruleId: text('rule_id').notNull(),
    rulebookVersion: text('rulebook_version').notNull(),
    confidence: real('confidence').notNull(),
    correctiveAction: text('corrective_action').notNull(),
    reviewStatus: text('review_status').notNull().default('PENDING'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('audit_finding_job_idx').on(table.pipelineJobId)],
);

// ─── Agent version ───────────────────────────────────────────────────────────

export const agentVersion = sqliteTable('agent_version', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  model: text('model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  temperature: real('temperature').notNull(),
  rulebookVersionId: text('rulebook_version_id').notNull(),
  retrievalTopK: integer('retrieval_top_k').notNull(),
  extractionSchemaVersion: text('extraction_schema_version').notNull(),
  correctiveActionPromptVersion: text('corrective_action_prompt_version').notNull(),
  timeoutMs: integer('timeout_ms').notNull(),
  maxRetries: integer('max_retries').notNull(),
  type: text('type').notNull().default('candidate'),
  createdAt: text('created_at').notNull(),
});

// ─── Eval tables ─────────────────────────────────────────────────────────────

export const evalCase = sqliteTable('eval_case', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  criticality: text('criticality').notNull().default('NORMAL'),
  inputAuditPages: text('input_audit_pages').notNull(),
  inputRulebookVersionId: text('input_rulebook_version_id').notNull(),
  expectedJson: text('expected_json').notNull(),
  source: text('source').notNull().default('HUMAN_CREATED'),
  status: text('status').notNull().default('DRAFT'),
  parentCaseId: text('parent_case_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const humanCorrection = sqliteTable(
  'human_correction',
  {
    id: text('id').primaryKey(),
    findingId: text('finding_id')
      .notNull()
      .references(() => auditFinding.id, { onDelete: 'cascade' }),
    auditId: text('audit_id')
      .notNull()
      .references(() => supplierAudit.id, { onDelete: 'cascade' }),
    agentVersionId: text('agent_version_id')
      .notNull()
      .references(() => agentVersion.id),
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

export const evaluationRun = sqliteTable('evaluation_run', {
  id: text('id').primaryKey(),
  agentVersionId: text('agent_version_id')
    .notNull()
    .references(() => agentVersion.id),
  suiteId: text('suite_id').notNull(),
  status: text('status').notNull().default('PENDING'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
});

export const testExecution = sqliteTable('test_execution', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => evaluationRun.id, { onDelete: 'cascade' }),
  evalCaseId: text('eval_case_id')
    .notNull()
    .references(() => evalCase.id),
  status: text('status').notNull().default('PENDING'),
  agentOutput: text('agent_output').notNull(),
  graderResult: text('grader_result').notNull(),
  passed: integer('passed', { mode: 'boolean' }).notNull().default(false),
  costUsd: real('cost_usd').notNull().default(0),
  latencyMs: integer('latency_ms').notNull().default(0),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
});

export const traceEvent = sqliteTable(
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
    costUsd: real('cost_usd'),
  },
  (table) => [
    index('trace_event_job_sequence_idx').on(table.pipelineJobId, table.sequence),
    index('trace_event_execution_sequence_idx').on(table.executionId, table.sequence),
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
  regressionEvalCase: one(evalCase, {
    fields: [humanCorrection.regressionEvalCaseId],
    references: [evalCase.id],
  }),
}));

export const agentVersionRelations = relations(agentVersion, ({ many }) => ({
  findings: many(auditFinding),
  evaluationRuns: many(evaluationRun),
  pipelineJobs: many(pipelineJob),
}));

export const evaluationRunRelations = relations(evaluationRun, ({ one, many }) => ({
  agentVersion: one(agentVersion, {
    fields: [evaluationRun.agentVersionId],
    references: [agentVersion.id],
  }),
  testExecutions: many(testExecution),
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
