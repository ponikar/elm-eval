import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, describe, expect, it } from 'vitest';

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
const databases: Database.Database[] = [];

function createSqlite(): Database.Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  databases.push(sqlite);
  return sqlite;
}

function applyMigrationFile(sqlite: Database.Database, filename: string): void {
  sqlite.exec(readFileSync(`${migrationsFolder}/${filename}`, 'utf8'));
}

function foreignKeyViolations(sqlite: Database.Database): unknown[] {
  return sqlite.pragma('foreign_key_check') as unknown[];
}

afterEach(() => {
  for (const sqlite of databases.splice(0)) sqlite.close();
});

describe('eval persistence schema migrations', () => {
  it('creates the complete canonical schema from an empty database', () => {
    const sqlite = createSqlite();

    sqlite.pragma('foreign_keys = OFF');
    migrate(drizzle(sqlite), { migrationsFolder });
    sqlite.pragma('foreign_keys = ON');

    const tables = sqlite
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all()
      .map((row) => (row as { name: string }).name);
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
    expect(foreignKeyViolations(sqlite)).toEqual([]);
  });

  it('upgrades and preserves representative T-005 data with enforced invariants', () => {
    const sqlite = createSqlite();
    applyMigrationFile(sqlite, '0000_ambiguous_tag.sql');
    applyMigrationFile(sqlite, '0001_confused_wallflower.sql');
    sqlite.exec(`
      create table if not exists __drizzle_migrations (
        id serial primary key,
        hash text not null,
        created_at numeric
      );
      insert into __drizzle_migrations (hash, created_at)
      values ('through-0001', 1783880779390);

      insert into rulebook (
        id, name, version, standard, effective_from, language, index_status, created_at, updated_at
      ) values ('rb', 'RBA', '8.0', 'RBA', '2026-01-01', 'en', 'READY', 't0', 't0');

      insert into agent_version (
        id, name, model, prompt_version, system_prompt, temperature, rulebook_version_id,
        retrieval_top_k, extraction_schema_version, corrective_action_prompt_version,
        timeout_ms, max_retries, type, created_at
      ) values ('av', 'Baseline', 'model', 'p1', 'prompt', 0, 'rb', 5, 's1', 'cap1',
        1000, 1, 'baseline', 't0');

      insert into supplier_audit (
        id, supplier_name, factory_name, audit_standard, audit_date, document_name,
        status, created_at, updated_at
      ) values ('audit', 'Supplier', 'Factory', 'RBA', '2026-01-01', 'audit.pdf',
        'ready', 't0', 't0');

      insert into pipeline_job (
        id, audit_id, agent_version_id, rulebook_version, idempotency_key, status,
        attempt_count, created_at
      ) values ('job', 'audit', 'av', '8.0', 'job-key', 'COMPLETED', 1, 't0');

      insert into audit_finding (
        id, audit_id, agent_version_id, pipeline_job_id, title, description, category,
        severity, evidence_page, evidence_quote, rule_id, rulebook_version, confidence,
        corrective_action, review_status, created_at, updated_at
      ) values ('finding', 'audit', 'av', 'job', 'Finding', 'Description',
        'HEALTH_AND_SAFETY', 'HIGH', 1, 'quote', 'rule-1', '8.0', 0.9,
        '{}', 'CORRECTED', 't0', 't0');

      insert into eval_case (
        id, name, category, criticality, input_audit_pages, input_rulebook_version_id,
        expected_json, source, status, created_at, updated_at
      ) values ('case', 'Case', 'HEALTH_AND_SAFETY', 'CRITICAL', '[]', 'rb', '[]',
        'HUMAN_CORRECTION', 'TRUSTED', 't0', 't0');

      insert into human_correction (
        id, finding_id, audit_id, agent_version_id, failure_type, reason,
        original_finding_json, corrected_finding_json, regression_eval_case_id,
        created_at, updated_at
      ) values ('correction', 'finding', 'audit', 'av', 'WRONG_SEVERITY', 'reason',
        '{}', '{}', 'case', 't0', 't0');

      insert into evaluation_run (
        id, agent_version_id, suite_id, status, started_at, completed_at
      ) values ('run', 'av', 'legacy-suite', 'COMPLETED', 't1', 't2');

      insert into test_execution (
        id, run_id, eval_case_id, status, agent_output, grader_result, passed,
        cost_usd, latency_ms, started_at, completed_at
      ) values ('execution', 'run', 'case', 'COMPLETED', '{}', '{}', 1, 1.25, 42, 't1', 't2');

      insert into trace_event (
        id, execution_id, stage, event_type, sequence, started_at
      ) values ('trace', 'execution', 'GRADING', 'COMPLETED', 1, 't1');
    `);

    sqlite.pragma('foreign_keys = OFF');
    migrate(drizzle(sqlite), { migrationsFolder });
    sqlite.pragma('foreign_keys = ON');

    expect(foreignKeyViolations(sqlite)).toEqual([]);
    expect(
      sqlite
        .prepare('select rulebook_version_id from human_correction where id = ?')
        .get('correction'),
    ).toEqual({ rulebook_version_id: 'rb' });
    expect(
      sqlite.prepare('select * from eval_suite where id = ?').get('legacy-suite'),
    ).toMatchObject({
      content_hash: 'legacy:legacy-suite',
      status: 'FROZEN',
    });
    expect(sqlite.prepare('select * from evaluation_run where id = ?').get('run')).toMatchObject({
      idempotency_key: 'legacy:run',
      rulebook_version_id: 'rb',
      suite_content_hash: 'legacy:legacy-suite',
    });
    expect(
      sqlite.prepare('select * from test_execution where id = ?').get('execution'),
    ).toMatchObject({
      agent_cost_usd: 1.25,
      evaluator_cost_usd: 0,
      created_at: 't1',
    });

    sqlite.prepare('delete from pipeline_job where id = ?').run('job');
    expect(
      sqlite.prepare('select pipeline_job_id from audit_finding where id = ?').get('finding'),
    ).toEqual({ pipeline_job_id: null });
    expect(() => sqlite.prepare('delete from audit_finding where id = ?').run('finding')).toThrow();
    expect(() =>
      sqlite
        .prepare(
          `insert into trace_event (id, execution_id, stage, event_type, sequence, started_at)
           values ('duplicate-trace', 'execution', 'GRADING', 'COMPLETED', 1, 't2')`,
        )
        .run(),
    ).toThrow();
    expect(() =>
      sqlite
        .prepare(
          `insert into test_execution (
             id, run_id, eval_case_id, status, agent_cost_usd, evaluator_cost_usd,
             token_input, token_output, latency_ms, created_at
           ) values ('duplicate-execution', 'run', 'case', 'PENDING', 0, 0, 0, 0, 0, 't3')`,
        )
        .run(),
    ).toThrow();
    expect(() =>
      sqlite
        .prepare(
          `insert into eval_suite_case (
             suite_id, eval_case_id, ordinal, case_content_hash, case_snapshot_json, added_at
           ) values ('legacy-suite', 'case', -1, 'case-hash', '{}', 't3')`,
        )
        .run(),
    ).toThrow();
    expect(() =>
      sqlite
        .prepare(
          `insert into run_comparison (
             id, baseline_run_id, candidate_run_id, status, created_at
           ) values ('invalid-comparison', 'run', 'run', 'PENDING', 't3')`,
        )
        .run(),
    ).toThrow();
    expect(() =>
      sqlite
        .prepare(
          `insert into quality_gate (id, name, version, status, created_at, updated_at)
           values ('invalid-gate', 'Release', 0, 'ACTIVE', 't3', 't3')`,
        )
        .run(),
    ).toThrow();

    sqlite
      .prepare(
        `insert into grader_result (
           id, execution_id, grader_version, passed, deterministic_passed,
           critical_underclassification_count, failure_types_json, details_json, created_at
         ) values ('grader', 'execution', 'grader-v1', 1, 1, 0, '[]', '{}', 't3')`,
      )
      .run();
    expect(() =>
      sqlite
        .prepare(
          `insert into grader_result (
             id, execution_id, grader_version, passed, deterministic_passed,
             critical_underclassification_count, failure_types_json, details_json, created_at
           ) values ('duplicate-grader', 'execution', 'grader-v1', 1, 1, 0, '[]', '{}', 't3')`,
        )
        .run(),
    ).toThrow();
  });
});
