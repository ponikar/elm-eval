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
  list: publicProcedure.query(async () => {
    await ensureReviewWorkspace();
    return listAudits();
  }),

  get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    await ensureReviewWorkspace();
    return getAudit(input.id);
  }),

  getFindings: publicProcedure.input(z.object({ auditId: z.string() })).query(async ({ input }) => {
    await ensureReviewWorkspace();
    return getAuditFindings(input.auditId);
  }),

  getRules: publicProcedure.query(async () => {
    await ensureReviewWorkspace();
    return getRules('rulebook-001');
  }),

  getRulebook: publicProcedure.query(async () => {
    await ensureReviewWorkspace();
    return getRulebook('rulebook-001');
  }),

  approveFinding: publicProcedure
    .input(z.object({ findingId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await ensureReviewWorkspace();
      return setFindingReviewStatus(input.findingId, 'APPROVED');
    }),

  rejectFinding: publicProcedure
    .input(z.object({ findingId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await ensureReviewWorkspace();
      return setFindingReviewStatus(input.findingId, 'REJECTED');
    }),
});
