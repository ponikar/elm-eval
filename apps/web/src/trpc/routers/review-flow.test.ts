import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

let directory = '';

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'audit-review-'));
  vi.stubEnv('AUDIT_DB_PATH', path.join(directory, 'review.db'));
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe('review flow router', () => {
  it('persists decisions and exposes a trusted correction case', async () => {
    const { appRouter } = await import('./_app');
    const caller = appRouter.createCaller({});
    const audits = await caller.audit.list();
    expect(audits).toHaveLength(1);
    const audit = audits[0];
    if (!audit) throw new Error('Expected seeded audit');
    const findings = await caller.audit.getFindings({ auditId: audit.id });
    const finding = findings[0];
    if (!finding) throw new Error('Expected seeded finding');

    expect((await caller.audit.approveFinding({ findingId: finding.id })).reviewStatus).toBe(
      'APPROVED',
    );
    expect((await caller.audit.rejectFinding({ findingId: finding.id })).reviewStatus).toBe(
      'REJECTED',
    );
    const before = await caller.evalCase.list();
    const correction = await caller.correction.create({
      findingId: finding.id,
      failureType: 'WRONG_SEVERITY',
      reason: 'Reviewer approved the corrected expected result.',
      saveAsRegressionTest: true,
      corrected: {
        title: finding.title,
        description: finding.description,
        category: finding.category,
        severity: finding.severity,
        auditEvidence: finding.auditEvidence,
        applicableRule: finding.applicableRule,
        confidence: finding.confidence,
        correctiveAction: finding.correctiveAction,
      },
    });
    expect(correction.regressionEvalCaseId).toBeDefined();
    const after = await caller.evalCase.list();
    expect(after).toHaveLength(before.length + 1);
    expect(after.find((item) => item.id === correction.regressionEvalCaseId)).toMatchObject({
      source: 'HUMAN_CORRECTION',
      status: 'TRUSTED',
    });
    expect((await caller.audit.getFindings({ auditId: audit.id }))[0]?.reviewStatus).toBe(
      'CORRECTED',
    );
  });
});
