import { ChunkBuilder, RuleSearcher } from '@repo/retrieval';
import { env } from '@repo/domain';
import { loadRulebookFixture, RULEBOOK_FIXTURE_IDS, RULEBOOK_METADATA } from '@repo/test-fixtures';
import fs from 'node:fs/promises';
import path from 'node:path';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../../../packages/test-fixtures/src');
const OUTPUT_DIR = path.join(FIXTURES_DIR, 'rulebooks');

async function main() {
  if (!env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is required. Set it in your environment:');
    console.error('  export GEMINI_API_KEY="your-key-here"');
    console.error('');
    console.error('Get a key at: https://aistudio.google.com/apikey');
    process.exit(1);
  }

  console.log('Embedding Generator — generates vectors for rulebook chunks\n');
  console.log(`  Model:      ${env.GEMINI_EMBEDDING_MODEL}`);
  console.log(`  Dimensions: ${env.EMBEDDING_DIMENSIONS}`);
  console.log('');

  const chunkBuilder = new ChunkBuilder();
  const searcher = new RuleSearcher();

  for (const rulebookId of RULEBOOK_FIXTURE_IDS) {
    const metadata = RULEBOOK_METADATA[rulebookId];
    if (!metadata) continue;

    console.log(`[${rulebookId}] ${metadata.name} v${metadata.version}`);

    const rules = await loadRulebookFixture(rulebookId);
    console.log(`  Rules loaded: ${rules.length}`);

    const chunks = chunkBuilder.buildChunksFromRules(rules, rulebookId);
    console.log(`  Chunks built: ${chunks.length}`);

    const embedded = await searcher.embedChunks(chunks);
    console.log(`  Embedded:     ${embedded.length}`);

    const outputPath = path.join(OUTPUT_DIR, `${rulebookId}.embedded.json`);
    await fs.writeFile(outputPath, JSON.stringify(embedded, null, 2));
    console.log(`  Written to:   ${outputPath}`);
    console.log('');
  }

  console.log('Done. Embedded chunks saved alongside rulebook fixtures.');
}

main().catch((err) => {
  console.error('Embedding generation failed:', err);
  process.exit(1);
});
