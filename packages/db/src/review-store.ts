import { randomUUID } from 'node:crypto';
import type {
  AgentVersion,
  AuditFinding,
  ComplianceRule,
  CreateCorrectionInput,
  EvalCase,
  HumanCorrection,
  Rulebook,
  SupplierAudit,
} from '@repo/domain';
import { AuditFindingSchema, HumanCorrectionSchema } from '@repo/domain';
import { and, asc, eq } from 'drizzle-orm';
import { db } from './index.js';
import {
  agentVersion,
  auditFinding,
  auditPage,
  complianceRule,
  evalCase,
  humanCorrection,
  rulebook,
  supplierAudit,
} from './schema.js';

type ReviewDatabase = typeof db;

export interface ReviewSeedData {
  audit: SupplierAudit;
  findings: AuditFinding[];
  rulebook: Rulebook;
  rules: ComplianceRule[];
  agentVersions: AgentVersion[];
  evalCases: EvalCase[];
}

function normalizeEvidence(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/([\p{L}\p{N}])-\s*\n\s*([\p{L}\p{N}])/gu, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en');
}

function parseFinding(row: typeof auditFinding.$inferSelect): AuditFinding {
  return AuditFindingSchema.parse({
    id: row.id,
    auditId: row.auditId,
    agentVersionId: row.agentVersionId,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    auditEvidence: { pageNumber: row.evidencePage, quote: row.evidenceQuote },
    applicableRule: { ruleId: row.ruleId, rulebookVersion: row.rulebookVersion },
    confidence: row.confidence,
    correctiveAction: JSON.parse(row.correctiveAction),
    reviewStatus: row.reviewStatus,
  });
}

function parseCorrection(row: typeof humanCorrection.$inferSelect): HumanCorrection {
  return HumanCorrectionSchema.parse({
    id: row.id,
    findingId: row.findingId,
    auditId: row.auditId,
    agentVersionId: row.agentVersionId,
    failureType: row.failureType,
    reason: row.reason,
    originalFinding: JSON.parse(row.originalFindingJson),
    correctedFinding: JSON.parse(row.correctedFindingJson),
    regressionEvalCaseId: row.regressionEvalCaseId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function findingValues(finding: AuditFinding, timestamp: string) {
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

export function seedReviewWorkspace(seed: ReviewSeedData, database: ReviewDatabase = db): void {
  const timestamp = new Date().toISOString();
  database.transaction((tx) => {
    tx.insert(rulebook)
      .values({
        id: seed.rulebook.id,
        sourceDocumentId: null,
        name: seed.rulebook.name,
        version: seed.rulebook.version,
        standard: seed.rulebook.standard,
        effectiveFrom: seed.rulebook.effectiveFrom,
        effectiveTo: seed.rulebook.effectiveTo,
        language: seed.rulebook.language,
        indexStatus: seed.rulebook.indexStatus,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoNothing()
      .run();
    tx.insert(complianceRule)
      .values(
        seed.rules.map((rule) => ({
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
      .onConflictDoNothing()
      .run();
    tx.insert(agentVersion).values(seed.agentVersions).onConflictDoNothing().run();
    tx.insert(supplierAudit)
      .values({
        id: seed.audit.id,
        supplierName: seed.audit.supplierName,
        factoryName: seed.audit.factoryName,
        auditStandard: seed.audit.auditStandard,
        auditDate: seed.audit.auditDate,
        documentName: seed.audit.documentName,
        status: 'ready_for_review',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoNothing()
      .run();
    tx.insert(auditPage)
      .values(
        seed.audit.pages.map((page) => ({
          id: `${seed.audit.id}:page:${page.pageNumber}`,
          auditId: seed.audit.id,
          pageNumber: page.pageNumber,
          text: page.text,
          normalizedText: normalizeEvidence(page.text),
          extractionStatus: 'SUCCESS',
          parserVersion: 'fixture-v1',
        })),
      )
      .onConflictDoNothing()
      .run();
    tx.insert(auditFinding)
      .values(seed.findings.map((finding) => findingValues(finding, timestamp)))
      .onConflictDoNothing()
      .run();
    tx.insert(evalCase)
      .values(
        seed.evalCases.map((item) => ({
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
      .onConflictDoNothing()
      .run();
  });
}

export function listAudits(database: ReviewDatabase = db) {
  return database
    .select()
    .from(supplierAudit)
    .all()
    .map((audit) => ({
      ...audit,
      pageCount: database
        .select({ id: auditPage.id })
        .from(auditPage)
        .where(eq(auditPage.auditId, audit.id))
        .all().length,
      findingCount: database
        .select({ id: auditFinding.id })
        .from(auditFinding)
        .where(eq(auditFinding.auditId, audit.id))
        .all().length,
    }));
}

export function getAudit(id: string, database: ReviewDatabase = db): SupplierAudit | null {
  const audit = database.select().from(supplierAudit).where(eq(supplierAudit.id, id)).get();
  if (!audit) return null;
  const pages = database
    .select()
    .from(auditPage)
    .where(eq(auditPage.auditId, id))
    .orderBy(asc(auditPage.pageNumber))
    .all();
  return {
    id: audit.id,
    supplierName: audit.supplierName,
    factoryName: audit.factoryName,
    auditStandard: audit.auditStandard as SupplierAudit['auditStandard'],
    auditDate: audit.auditDate,
    documentName: audit.documentName,
    pages: pages.map((page) => ({ pageNumber: page.pageNumber, text: page.text })),
  };
}

export function getAuditFindings(auditId: string, database: ReviewDatabase = db): AuditFinding[] {
  return database
    .select()
    .from(auditFinding)
    .where(eq(auditFinding.auditId, auditId))
    .all()
    .map(parseFinding);
}

export function listEvalCases(database: ReviewDatabase = db): EvalCase[] {
  return database
    .select()
    .from(evalCase)
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category as EvalCase['category'],
      criticality: row.criticality as EvalCase['criticality'],
      input: {
        auditPages: JSON.parse(row.inputAuditPages),
        rulebookVersionId: row.inputRulebookVersionId,
      },
      expected: JSON.parse(row.expectedJson),
      source: row.source as EvalCase['source'],
      status: row.status as EvalCase['status'],
      parentCaseId: row.parentCaseId ?? undefined,
    }));
}

export function getRulebook(id: string, database: ReviewDatabase = db): Rulebook | null {
  const row = database.select().from(rulebook).where(eq(rulebook.id, id)).get();
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    standard: row.standard as Rulebook['standard'],
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo ?? undefined,
    language: row.language,
    indexStatus: row.indexStatus as Rulebook['indexStatus'],
  };
}

export function getRules(rulebookId: string, database: ReviewDatabase = db): ComplianceRule[] {
  return database
    .select()
    .from(complianceRule)
    .where(eq(complianceRule.rulebookId, rulebookId))
    .all()
    .map((row) => ({
      id: row.id,
      rulebookId: row.rulebookId,
      rulebookVersion: row.rulebookVersion,
      sectionId: row.sectionId,
      sectionTitle: row.sectionTitle,
      category: row.category as ComplianceRule['category'],
      requirementText: row.requirementText,
      sourcePage: row.sourcePage,
      severityGuidance: row.severityGuidance ? JSON.parse(row.severityGuidance) : undefined,
      correctiveActionGuidance: row.correctiveActionGuidance
        ? JSON.parse(row.correctiveActionGuidance)
        : undefined,
    }));
}

export function setFindingReviewStatus(
  findingId: string,
  status: 'APPROVED' | 'REJECTED',
  database: ReviewDatabase = db,
): AuditFinding {
  const updated = database
    .update(auditFinding)
    .set({ reviewStatus: status, updatedAt: new Date().toISOString() })
    .where(eq(auditFinding.id, findingId))
    .returning()
    .get();
  if (!updated) throw new Error(`Finding ${findingId} not found`);
  return parseFinding(updated);
}

export class CorrectionValidationError extends Error {
  constructor(
    readonly code: 'INVALID_AUDIT_CITATION' | 'INVALID_RULE_REFERENCE',
    message: string,
  ) {
    super(message);
  }
}

export function createCorrection(
  input: CreateCorrectionInput,
  database: ReviewDatabase = db,
): HumanCorrection {
  return database.transaction((tx) => {
    const row = tx.select().from(auditFinding).where(eq(auditFinding.id, input.findingId)).get();
    if (!row) throw new Error(`Finding ${input.findingId} not found`);
    const original = parseFinding(row);
    const corrected = AuditFindingSchema.parse({
      ...input.corrected,
      id: original.id,
      auditId: original.auditId,
      agentVersionId: original.agentVersionId,
      reviewStatus: 'CORRECTED',
    });
    const page = tx
      .select()
      .from(auditPage)
      .where(
        and(
          eq(auditPage.auditId, original.auditId),
          eq(auditPage.pageNumber, corrected.auditEvidence.pageNumber),
        ),
      )
      .get();
    const pages = tx
      .select()
      .from(auditPage)
      .where(eq(auditPage.auditId, original.auditId))
      .orderBy(asc(auditPage.pageNumber))
      .all();
    if (
      !page ||
      !normalizeEvidence(page.text).includes(normalizeEvidence(corrected.auditEvidence.quote))
    )
      throw new CorrectionValidationError(
        'INVALID_AUDIT_CITATION',
        'Evidence quote is not present on the cited audit page',
      );
    const version = tx
      .select()
      .from(agentVersion)
      .where(eq(agentVersion.id, original.agentVersionId))
      .get();
    if (!version) throw new Error(`Agent version ${original.agentVersionId} not found`);
    const rule = tx
      .select()
      .from(complianceRule)
      .where(
        and(
          eq(complianceRule.id, corrected.applicableRule.ruleId),
          eq(complianceRule.rulebookVersion, corrected.applicableRule.rulebookVersion),
          eq(complianceRule.rulebookId, version.rulebookVersionId),
        ),
      )
      .get();
    if (!rule)
      throw new CorrectionValidationError(
        'INVALID_RULE_REFERENCE',
        'Rule ID and version do not exist in the selected rulebook snapshot',
      );

    const timestamp = new Date().toISOString();
    const correctionId = randomUUID();
    const regressionEvalCaseId = input.saveAsRegressionTest ? `regression-${correctionId}` : null;
    if (regressionEvalCaseId) {
      tx.insert(evalCase)
        .values({
          id: regressionEvalCaseId,
          name: `Correction: ${corrected.title}`,
          category: corrected.category,
          criticality: corrected.severity === 'CRITICAL' ? 'CRITICAL' : 'NORMAL',
          inputAuditPages: JSON.stringify(
            pages.map((auditPageRow) => ({
              pageNumber: auditPageRow.pageNumber,
              text: auditPageRow.text,
            })),
          ),
          inputRulebookVersionId: rule.rulebookId,
          expectedJson: JSON.stringify([
            {
              findingShouldExist: true,
              category: corrected.category,
              severity: corrected.severity,
              auditEvidence: {
                pageNumber: corrected.auditEvidence.pageNumber,
                textContains: corrected.auditEvidence.quote,
              },
              applicableRule: corrected.applicableRule,
              requiredCorrectiveActionFacts: [corrected.correctiveAction.action],
            },
          ]),
          source: 'HUMAN_CORRECTION',
          status: 'TRUSTED',
          parentCaseId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
    }
    tx.update(auditFinding)
      .set({
        title: corrected.title,
        description: corrected.description,
        category: corrected.category,
        severity: corrected.severity,
        evidencePage: corrected.auditEvidence.pageNumber,
        evidenceQuote: corrected.auditEvidence.quote,
        ruleId: corrected.applicableRule.ruleId,
        rulebookVersion: corrected.applicableRule.rulebookVersion,
        confidence: corrected.confidence,
        correctiveAction: JSON.stringify(corrected.correctiveAction),
        reviewStatus: 'CORRECTED',
        updatedAt: timestamp,
      })
      .where(eq(auditFinding.id, original.id))
      .run();
    const inserted = tx
      .insert(humanCorrection)
      .values({
        id: correctionId,
        findingId: original.id,
        auditId: original.auditId,
        agentVersionId: original.agentVersionId,
        rulebookVersionId: version.rulebookVersionId,
        failureType: input.failureType,
        reason: input.reason,
        originalFindingJson: JSON.stringify(original),
        correctedFindingJson: JSON.stringify(corrected),
        regressionEvalCaseId,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning()
      .get();
    return parseCorrection(inserted);
  });
}

export function convertCorrectionToRegressionTest(
  correctionId: string,
  database: ReviewDatabase = db,
): EvalCase {
  return database.transaction((tx) => {
    const correction = tx
      .select()
      .from(humanCorrection)
      .where(eq(humanCorrection.id, correctionId))
      .get();
    if (!correction) throw new Error(`Correction ${correctionId} not found`);
    if (correction.regressionEvalCaseId) {
      const existing = listEvalCases(database).find(
        (item) => item.id === correction.regressionEvalCaseId,
      );
      if (!existing) throw new Error('Correction references a missing regression case');
      return existing;
    }
    const corrected = AuditFindingSchema.parse(JSON.parse(correction.correctedFindingJson));
    const page = tx
      .select()
      .from(auditPage)
      .where(
        and(
          eq(auditPage.auditId, correction.auditId),
          eq(auditPage.pageNumber, corrected.auditEvidence.pageNumber),
        ),
      )
      .get();
    const pages = tx
      .select()
      .from(auditPage)
      .where(eq(auditPage.auditId, correction.auditId))
      .orderBy(asc(auditPage.pageNumber))
      .all();
    const version = tx
      .select()
      .from(agentVersion)
      .where(eq(agentVersion.id, correction.agentVersionId))
      .get();
    if (!version) throw new Error(`Agent version ${correction.agentVersionId} not found`);
    const rule = tx
      .select()
      .from(complianceRule)
      .where(
        and(
          eq(complianceRule.id, corrected.applicableRule.ruleId),
          eq(complianceRule.rulebookVersion, corrected.applicableRule.rulebookVersion),
          eq(complianceRule.rulebookId, version.rulebookVersionId),
        ),
      )
      .get();
    if (!page || !rule) throw new Error('Corrected evidence or rule snapshot is no longer valid');
    const timestamp = new Date().toISOString();
    const id = `regression-${correction.id}`;
    tx.insert(evalCase)
      .values({
        id,
        name: `Correction: ${corrected.title}`,
        category: corrected.category,
        criticality: corrected.severity === 'CRITICAL' ? 'CRITICAL' : 'NORMAL',
        inputAuditPages: JSON.stringify(
          pages.map((auditPageRow) => ({
            pageNumber: auditPageRow.pageNumber,
            text: auditPageRow.text,
          })),
        ),
        inputRulebookVersionId: rule.rulebookId,
        expectedJson: JSON.stringify([
          {
            findingShouldExist: true,
            category: corrected.category,
            severity: corrected.severity,
            auditEvidence: {
              pageNumber: corrected.auditEvidence.pageNumber,
              textContains: corrected.auditEvidence.quote,
            },
            applicableRule: corrected.applicableRule,
            requiredCorrectiveActionFacts: [corrected.correctiveAction.action],
          },
        ]),
        source: 'HUMAN_CORRECTION',
        status: 'TRUSTED',
        parentCaseId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
    tx.update(humanCorrection)
      .set({ regressionEvalCaseId: id, updatedAt: timestamp })
      .where(eq(humanCorrection.id, correction.id))
      .run();
    const created = listEvalCases(database).find((item) => item.id === id);
    if (!created) throw new Error('Regression case was not persisted');
    return created;
  });
}
