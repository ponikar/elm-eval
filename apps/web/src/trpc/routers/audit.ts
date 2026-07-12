import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../init';
import { SEED_AUDIT, MOCK_FINDINGS, SEED_RULEBOOK, SEED_RULES } from '@repo/test-fixtures';

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
        findingCount: MOCK_FINDINGS.length,
      },
    ];
  }),

  get: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => {
    if (input.id !== SEED_AUDIT.id) return null;
    return SEED_AUDIT;
  }),

  getFindings: publicProcedure.input(z.object({ auditId: z.string() })).query(({ input }) => {
    if (input.auditId !== SEED_AUDIT.id) return [];
    return MOCK_FINDINGS;
  }),

  getRules: publicProcedure.query(() => {
    return SEED_RULES;
  }),

  getRulebook: publicProcedure.query(() => {
    return SEED_RULEBOOK;
  }),
});
