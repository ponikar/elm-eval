import { db, enqueuePipelineJob } from '@repo/db';
import {
  agentVersion,
  auditFinding,
  auditPage,
  complianceRule,
  evalCase,
  rulebook,
  ruleChunk,
  sourceDocument,
  supplierAudit,
} from '@repo/db/schema';
import { type AuditFinding as AuditFindingType, ComplianceRuleSchema, env } from '@repo/domain';
import { ChunkBuilder, RuleSearcher } from '@repo/retrieval';
import {
  MOCK_FINDINGS,
  SEED_AGENT_VERSIONS,
  SEED_AUDIT,
  SEED_EVAL_CASES,
  SEED_RULEBOOK,
  SEED_RULES,
} from '@repo/test-fixtures';
import { eq } from 'drizzle-orm';
import { runPipelineJob } from './run-job.js';

function json(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return JSON.parse(value);
  return value;
}

function findingValues(finding: AuditFindingType, timestamp: string) {
  return {
    id: finding.id,
    auditId: finding.auditId,
    agentVersionId: finding.agentVersionId,
    pipelineJobId: null,
    title: finding.title,
    description: finding.description,
    category: finding.category,
    severity: finding.severity,
    evidencePage: finding.auditEvidence.pageNumber,
    evidenceQuote: finding.auditEvidence.quote,
    ruleId: finding.applicableRule.ruleId,
    rulebookVersion: finding.applicableRule.rulebookVersion,
    confidence: finding.confidence,
    correctiveAction: JSON.stringify(finding.correctiveAction),
    reviewStatus: finding.reviewStatus,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function normalizeEvidence(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

async function seed(): Promise<void> {
  const timestamp = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .insert(sourceDocument)
      .values({
        id: 'src-doc-001',
        name: SEED_RULEBOOK.name,
        type: 'RULEBOOK',
        version: SEED_RULEBOOK.version,
        language: SEED_RULEBOOK.language,
        createdAt: timestamp,
      })
      .onConflictDoNothing();
    await tx
      .insert(rulebook)
      .values({
        id: SEED_RULEBOOK.id,
        sourceDocumentId: 'src-doc-001',
        name: SEED_RULEBOOK.name,
        version: SEED_RULEBOOK.version,
        standard: SEED_RULEBOOK.standard,
        effectiveFrom: SEED_RULEBOOK.effectiveFrom,
        language: SEED_RULEBOOK.language,
        indexStatus: SEED_RULEBOOK.indexStatus,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoNothing();
    await tx
      .insert(complianceRule)
      .values(
        SEED_RULES.map((rule) => ({
          id: rule.id,
          rulebookId: rule.rulebookId,
          rulebookVersion: rule.rulebookVersion,
          sectionId: rule.sectionId,
          sectionTitle: rule.sectionTitle,
          category: rule.category,
          requirementText: rule.requirementText,
          sourcePage: rule.sourcePage,
          severityGuidance: rule.severityGuidance ? JSON.stringify(rule.severityGuidance) : null,
          correctiveActionGuidance: rule.correctiveActionGuidance
            ? JSON.stringify(rule.correctiveActionGuidance)
            : null,
        })),
      )
      .onConflictDoNothing();
    await tx.insert(agentVersion).values(SEED_AGENT_VERSIONS).onConflictDoNothing();
    await tx
      .insert(sourceDocument)
      .values({
        id: 'src-doc-002',
        name: SEED_AUDIT.documentName,
        type: 'AUDIT_REPORT',
        version: '1',
        language: 'en',
        createdAt: timestamp,
      })
      .onConflictDoNothing();
    await tx
      .insert(supplierAudit)
      .values({
        id: SEED_AUDIT.id,
        supplierName: SEED_AUDIT.supplierName,
        factoryName: SEED_AUDIT.factoryName,
        auditStandard: SEED_AUDIT.auditStandard,
        auditDate: SEED_AUDIT.auditDate,
        documentName: SEED_AUDIT.documentName,
        status: 'ready_for_review',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoNothing();
    await tx
      .insert(auditPage)
      .values(
        SEED_AUDIT.pages.map((page) => ({
          id: `${SEED_AUDIT.id}:page:${page.pageNumber}`,
          auditId: SEED_AUDIT.id,
          pageNumber: page.pageNumber,
          text: page.text,
          normalizedText: normalizeEvidence(page.text),
          extractionStatus: 'SUCCESS',
          parserVersion: 'fixture-v1',
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(auditFinding)
      .values(MOCK_FINDINGS.map((f) => findingValues(f, timestamp)))
      .onConflictDoNothing();
    await tx
      .insert(evalCase)
      .values(
        SEED_EVAL_CASES.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          criticality: item.criticality,
          inputAuditPages: JSON.stringify(item.input.auditPages),
          inputRulebookVersionId: item.input.rulebookVersionId,
          expectedJson: JSON.stringify(item.expected),
          source: item.source,
          status: item.status,
          parentCaseId: item.parentCaseId,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
      )
      .onConflictDoNothing();
  });
  console.log(
    JSON.stringify({
      status: 'SEEDED',
      rulebook: SEED_RULEBOOK.id,
      rules: SEED_RULES.length,
      audit: SEED_AUDIT.id,
      pages: SEED_AUDIT.pages.length,
      findings: MOCK_FINDINGS.length,
      evalCases: SEED_EVAL_CASES.length,
      sourceDocuments: 2,
    }),
  );
}

async function indexRulebook(rulebookId: string): Promise<void> {
  if (!env.GEMINI_API_KEY)
    throw new Error('GEMINI_API_KEY is required to index a rulebook for evaluation');
  const rulebookRows = await db.select().from(rulebook).where(eq(rulebook.id, rulebookId));
  const rulebookRow = rulebookRows[0];
  if (!rulebookRow) throw new Error(`Rulebook ${rulebookId} does not exist`);
  const ruleRows = await db
    .select()
    .from(complianceRule)
    .where(eq(complianceRule.rulebookId, rulebookId));
  if (ruleRows.length === 0) throw new Error(`Rulebook ${rulebookId} has no compliance rules`);
  const rules = ruleRows.map((row) =>
    ComplianceRuleSchema.parse({
      ...row,
      severityGuidance: json(row.severityGuidance),
      correctiveActionGuidance: json(row.correctiveActionGuidance),
    }),
  );
  const searcher = new RuleSearcher({
    apiKey: env.GEMINI_API_KEY,
    embeddingModel: env.GEMINI_EMBEDDING_MODEL,
  });
  const chunks = await searcher.embedChunks(new ChunkBuilder().buildChunksFromRules(rules));
  const createdAt = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.delete(ruleChunk).where(eq(ruleChunk.rulebookId, rulebookId));
    await tx.insert(ruleChunk).values(
      chunks.map((chunk) => ({
        id: chunk.id,
        ruleId: chunk.ruleId,
        rulebookId: chunk.rulebookId,
        rulebookVersion: chunk.rulebookVersion,
        text: chunk.text,
        pageNumber: chunk.pageNumber,
        sectionId: chunk.metadata.sectionId,
        sectionTitle: chunk.metadata.sectionTitle,
        category: chunk.metadata.category,
        embedding: JSON.stringify(chunk.embedding),
        embeddingModel: env.GEMINI_EMBEDDING_MODEL,
        createdAt,
      })),
    );
    await tx
      .update(rulebook)
      .set({ indexStatus: 'INDEXED', updatedAt: createdAt })
      .where(eq(rulebook.id, rulebookId));
  });
  console.log(
    JSON.stringify({
      rulebookId,
      rulebookVersion: rulebookRow.version,
      status: 'INDEXED',
      chunks: chunks.length,
      embeddingModel: env.GEMINI_EMBEDDING_MODEL,
    }),
  );
}

async function run(auditId?: string): Promise<void> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required to run the pipeline');
  const targetAuditId = auditId || SEED_AUDIT.id;
  const auditRows = await db
    .select()
    .from(supplierAudit)
    .where(eq(supplierAudit.id, targetAuditId));
  if (!auditRows[0]) throw new Error(`Audit ${targetAuditId} does not exist`);
  const agentRows = await db.select().from(agentVersion);
  if (!agentRows[0]) throw new Error('No agent versions found — run seed first');
  const agent = agentRows[0];
  const jobId = `job-${Date.now()}`;
  const created = await enqueuePipelineJob({
    id: jobId,
    auditId: targetAuditId,
    agentVersionId: agent.id,
    rulebookVersion: SEED_RULEBOOK.version,
    idempotencyKey: jobId,
    createdAt: new Date().toISOString(),
  });
  if (!created) throw new Error(`Failed to create pipeline job ${jobId}`);
  console.log(
    JSON.stringify({ status: 'RUNNING', jobId, auditId: targetAuditId, agentVersionId: agent.id }),
  );
  await runPipelineJob(jobId);
}

const command = process.argv[2];
const arg = process.argv[3];

if (command === 'seed') {
  seed().catch((error: unknown) => {
    console.error('Seed failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else if (command === 'index-rulebook') {
  if (!arg) {
    console.error('Usage: pnpm --filter pipeline index-rulebook -- index-rulebook <rulebook-id>');
    process.exit(2);
  }
  indexRulebook(arg).catch((error: unknown) => {
    console.error('Rulebook indexing failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else if (command === 'run') {
  run(arg).catch((error: unknown) => {
    console.error('Pipeline run failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else {
  console.error(
    'Usage: pnpm --filter pipeline index-rulebook -- <seed | index-rulebook <rulebook-id> | run [audit-id]>',
  );
  process.exit(2);
}
