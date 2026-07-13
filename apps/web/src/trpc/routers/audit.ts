import {
  getAudit,
  getAuditFindings,
  getRulebook,
  getRules,
  listAudits,
  setFindingReviewStatus,
} from '@repo/db';
import { z } from 'zod';
import { ensureReviewWorkspace } from '../../server/review-workspace';
import { createTRPCRouter, publicProcedure } from '../init';

export const auditRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    ensureReviewWorkspace();
    return listAudits();
  }),

  get: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => {
    ensureReviewWorkspace();
    return getAudit(input.id);
  }),

  getFindings: publicProcedure.input(z.object({ auditId: z.string() })).query(({ input }) => {
    ensureReviewWorkspace();
    return getAuditFindings(input.auditId);
  }),

  getRules: publicProcedure.query(() => {
    ensureReviewWorkspace();
    return getRules('rulebook-001');
  }),

  getRulebook: publicProcedure.query(() => {
    ensureReviewWorkspace();
    return getRulebook('rulebook-001');
  }),

  approveFinding: publicProcedure
    .input(z.object({ findingId: z.string().min(1) }))
    .mutation(({ input }) => {
      ensureReviewWorkspace();
      return setFindingReviewStatus(input.findingId, 'APPROVED');
    }),

  rejectFinding: publicProcedure
    .input(z.object({ findingId: z.string().min(1) }))
    .mutation(({ input }) => {
      ensureReviewWorkspace();
      return setFindingReviewStatus(input.findingId, 'REJECTED');
    }),
});
