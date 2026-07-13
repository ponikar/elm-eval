import type { AuditFinding } from '@repo/domain';
import { MOCK_FINDINGS, SEED_AUDIT, SEED_RULEBOOK, SEED_RULES } from '@repo/test-fixtures';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../init';

const findings = structuredClone(MOCK_FINDINGS);

export const auditRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return [
      {
        id: SEED_AUDIT.id,
        supplierName: SEED_AUDIT.supplierName,
        factoryName: SEED_AUDIT.factoryName,
        auditStandard: SEED_AUDIT.auditStandard,
        auditDate: SEED_AUDIT.auditDate,
        documentName: SEED_AUDIT.documentName,
        pageCount: SEED_AUDIT.pages.length,
        findingCount: findings.length,
      },
    ];
  }),

  get: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => {
    if (input.id !== SEED_AUDIT.id) return null;
    return SEED_AUDIT;
  }),

  getFindings: publicProcedure.input(z.object({ auditId: z.string() })).query(({ input }) => {
    if (input.auditId !== SEED_AUDIT.id) return [];
    return findings;
  }),

  approveFinding: publicProcedure
    .input(z.object({ findingId: z.string() }))
    .mutation(({ input }) => {
      const f = findings.find((f) => f.id === input.findingId);
      if (!f) throw new Error('Finding not found');
      f.reviewStatus = 'APPROVED' as AuditFinding['reviewStatus'];
      return f;
    }),

  rejectFinding: publicProcedure
    .input(z.object({ findingId: z.string() }))
    .mutation(({ input }) => {
      const f = findings.find((f) => f.id === input.findingId);
      if (!f) throw new Error('Finding not found');
      f.reviewStatus = 'REJECTED' as AuditFinding['reviewStatus'];
      return f;
    }),

  correctFinding: publicProcedure
    .input(
      z.object({
        findingId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        severity: z.string().optional(),
        evidencePage: z.number().optional(),
        evidenceQuote: z.string().optional(),
        ruleId: z.string().optional(),
      }),
    )
    .mutation(({ input }) => {
      const f = findings.find((f) => f.id === input.findingId);
      if (!f) throw new Error('Finding not found');
      if (input.title !== undefined) f.title = input.title;
      if (input.description !== undefined) f.description = input.description;
      if (input.category !== undefined) f.category = input.category as AuditFinding['category'];
      if (input.severity !== undefined) f.severity = input.severity as AuditFinding['severity'];
      if (input.evidencePage !== undefined) f.auditEvidence.pageNumber = input.evidencePage;
      if (input.evidenceQuote !== undefined) f.auditEvidence.quote = input.evidenceQuote;
      if (input.ruleId !== undefined) f.applicableRule.ruleId = input.ruleId;
      f.reviewStatus = 'CORRECTED' as AuditFinding['reviewStatus'];
      return f;
    }),

  getRules: publicProcedure.query(() => {
    return SEED_RULES;
  }),

  getRulebook: publicProcedure.query(() => {
    return SEED_RULEBOOK;
  }),
});
