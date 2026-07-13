import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDatabase } from './index.js';

const testDb = createDatabase();

describe('eval persistence schema', () => {
  it('has all expected tables', async () => {
    const result = await testDb.execute<{ table_name: string }>(
      sql`SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name`,
    );
    const tables = result.rows.map((r) => r.table_name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'eval_suite',
        'eval_suite_case',
        'evaluation_run',
        'test_execution',
        'grader_result',
        'run_comparison',
        'case_comparison',
        'quality_gate',
        'quality_gate_evaluation',
        'human_correction',
        'trace_event',
      ]),
    );
  });

  it('has all expected columns on audit_finding', async () => {
    const result = await testDb.execute<{ column_name: string }>(
      sql`SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'audit_finding'
        ORDER BY ordinal_position`,
    );
    const columns = result.rows.map((r) => r.column_name);
    expect(columns).toEqual(
      expect.arrayContaining([
        'id',
        'audit_id',
        'agent_version_id',
        'pipeline_job_id',
        'title',
        'description',
        'category',
        'severity',
        'evidence_page',
        'evidence_quote',
        'rule_id',
        'rulebook_version',
        'confidence',
        'corrective_action',
        'review_status',
        'created_at',
        'updated_at',
      ]),
    );
  });
});
