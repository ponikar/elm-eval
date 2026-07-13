import { seedReviewWorkspace } from '@repo/db';
import {
  MOCK_FINDINGS,
  SEED_AGENT_VERSIONS,
  SEED_AUDIT,
  SEED_EVAL_CASES,
  SEED_RULEBOOK,
  SEED_RULES,
} from '@repo/test-fixtures';

let seeded = false;

export function ensureReviewWorkspace(): void {
  if (seeded) return;
  seedReviewWorkspace({
    audit: SEED_AUDIT,
    findings: MOCK_FINDINGS,
    rulebook: SEED_RULEBOOK,
    rules: SEED_RULES,
    agentVersions: SEED_AGENT_VERSIONS,
    evalCases: SEED_EVAL_CASES,
  });
  seeded = true;
}
