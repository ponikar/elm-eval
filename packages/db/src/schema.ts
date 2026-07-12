import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

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

export const auditPage = sqliteTable('audit_page', {
  id: text('id').primaryKey(),
  auditId: text('audit_id')
    .notNull()
    .references(() => supplierAudit.id, { onDelete: 'cascade' }),
  pageNumber: integer('page_number').notNull(),
  text: text('text').notNull(),
});

export const rulebook = sqliteTable('rulebook', {
  id: text('id').primaryKey(),
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

export const auditFinding = sqliteTable('audit_finding', {
  id: text('id').primaryKey(),
  auditId: text('audit_id')
    .notNull()
    .references(() => supplierAudit.id, { onDelete: 'cascade' }),
  agentVersionId: text('agent_version_id')
    .notNull()
    .references(() => agentVersion.id),
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
});

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

export const traceEvent = sqliteTable('trace_event', {
  id: text('id').primaryKey(),
  executionId: text('execution_id')
    .notNull()
    .references(() => testExecution.id, { onDelete: 'cascade' }),
  stage: text('stage').notNull(),
  eventType: text('event_type').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  durationMs: integer('duration_ms'),
  inputSummary: text('input_summary'),
  outputSummary: text('output_summary'),
  errorCode: text('error_code'),
  tokenInput: integer('token_input'),
  tokenOutput: integer('token_output'),
  costUsd: real('cost_usd'),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const supplierAuditRelations = relations(supplierAudit, ({ many }) => ({
  pages: many(auditPage),
  findings: many(auditFinding),
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
}));

export const agentVersionRelations = relations(agentVersion, ({ many }) => ({
  findings: many(auditFinding),
  evaluationRuns: many(evaluationRun),
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
}));
