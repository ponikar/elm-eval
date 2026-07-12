import { AuditParser } from '@repo/documents';
import { RulebookParser } from '@repo/documents';
import { RuleExtractor } from '@repo/documents';
import { ChunkBuilder } from '@repo/retrieval';
import { RuleSearcher } from '@repo/retrieval';
import { env } from '@repo/domain';
import {
  AUDIT_FIXTURE_IDS,
  RULEBOOK_FIXTURE_IDS,
  RULEBOOK_METADATA,
  loadAuditFixture,
  loadRulebookFixture,
} from '@repo/test-fixtures';
import path from 'node:path';
import fs from 'node:fs/promises';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../../packages/test-fixtures/src');

interface PipelineResult {
  auditsLoaded: number;
  rulebooksProcessed: number;
  totalChunksEmbedded: number;
  searchTestPassed: boolean;
}

async function loadAudits(): Promise<void> {
  console.log(`\n--- Loading ${AUDIT_FIXTURE_IDS.length} audit fixtures ---`);

  for (const auditId of AUDIT_FIXTURE_IDS) {
    const filePath = path.join(FIXTURES_DIR, 'audits', `${auditId}.json`);
    const parser = new AuditParser();
    const pages = await parser.parseFromJson(filePath);
    console.log(
      `  [${auditId}] Loaded ${pages.length} pages (${pages.filter((p) => p.extractionStatus === 'EXTRACTED').length} extracted)`,
    );
  }
}

async function processRulebooks(): Promise<
  {
    rulebookId: string;
    chunkCount: number;
    chunkBuilder: ChunkBuilder;
    rules: Awaited<ReturnType<RuleExtractor['extractRules']>>;
  }[]
> {
  console.log(`\n--- Processing ${RULEBOOK_FIXTURE_IDS.length} rulebook fixtures ---`);

  const results: {
    rulebookId: string;
    chunkCount: number;
    chunkBuilder: ChunkBuilder;
    rules: Awaited<ReturnType<RuleExtractor['extractRules']>>;
  }[] = [];

  const chunkBuilder = new ChunkBuilder();

  for (const rulebookId of RULEBOOK_FIXTURE_IDS) {
    const metadata = RULEBOOK_METADATA[rulebookId];
    if (!metadata) {
      console.warn(`  [${rulebookId}] Unknown rulebook, skipping`);
      continue;
    }

    const rules = await loadRulebookFixture(rulebookId);
    console.log(
      `  [${rulebookId}] Loaded ${rules.length} rules for ${metadata.name} v${metadata.version}`,
    );

    const chunks = chunkBuilder.buildChunksFromRules(rules, rulebookId);
    console.log(`  [${rulebookId}] Built ${chunks.length} chunks`);

    results.push({ rulebookId, chunkCount: chunks.length, chunkBuilder, rules });
  }

  return results;
}

async function testSearch(
  searcher: RuleSearcher,
  chunks: Awaited<ReturnType<typeof processRulebooks>>[number]['chunkBuilder'] extends infer CB
    ? CB extends ChunkBuilder
      ? ReturnType<CB['buildChunksFromRules']>
      : never
    : never,
): Promise<boolean> {
  console.log('\n--- Testing semantic search ---');

  const testQueries = [
    'emergency exit blocked by materials',
    'workers exceeding 60 hours per week',
    'expired safety data sheets',
  ];

  let allPassed = true;

  for (const query of testQueries) {
    const results = await searcher.search(query, chunks, 3);
    const topResult = results[0];

    if (topResult && topResult.score > 0.3) {
      console.log(
        `  [PASS] "${query}" → score=${topResult.score.toFixed(3)} chunk="${topResult.chunk.chunkText.slice(0, 60)}..."`,
      );
    } else {
      console.log(`  [WARN] "${query}" → low score (${topResult?.score.toFixed(3) ?? 'N/A'})`);
      allPassed = false;
    }
  }

  return allPassed;
}

async function main(): Promise<void> {
  console.log('Audit Reliability Pipeline — Pre-seeded Documentation\n');

  const startTime = Date.now();

  await loadAudits();
  const rulebookResults = await processRulebooks();

  const allChunks = rulebookResults.flatMap((r) => {
    return r.chunkBuilder.buildChunksFromRules(r.rules, r.rulebookId);
  });

  console.log(`\nTotal chunks created: ${allChunks.length}`);

  let searchTestPassed = false;
  if (env.GEMINI_API_KEY) {
    console.log('\nGEMINI_API_KEY found — running embedding + search test');
    const searcher = new RuleSearcher();
    const embeddedChunks = await searcher.embedChunks(allChunks);
    searchTestPassed = await testSearch(searcher, embeddedChunks);
  } else {
    console.log('\nGEMINI_API_KEY not set — skipping embedding + search test');
    console.log('  Set GEMINI_API_KEY to enable Gemini integration');
  }

  const elapsed = Date.now() - startTime;

  const result: PipelineResult = {
    auditsLoaded: AUDIT_FIXTURE_IDS.length,
    rulebooksProcessed: RULEBOOK_FIXTURE_IDS.length,
    totalChunksEmbedded: allChunks.length,
    searchTestPassed,
  };

  console.log(`\n--- Pipeline Summary ---`);
  console.log(`  Audits loaded:        ${result.auditsLoaded}`);
  console.log(`  Rulebooks processed:  ${result.rulebooksProcessed}`);
  console.log(`  Total rule chunks:    ${result.totalChunksEmbedded}`);
  console.log(`  Search test passed:   ${result.searchTestPassed}`);
  console.log(`  Elapsed:              ${elapsed}ms`);

  await fs.writeFile(
    path.join(FIXTURES_DIR, 'pipeline-result.json'),
    JSON.stringify(result, null, 2),
  );
  console.log('\nResult written to pipeline-result.json');
}

main().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
