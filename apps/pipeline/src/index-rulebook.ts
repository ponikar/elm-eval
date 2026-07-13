import { db } from '@repo/db';
import { complianceRule, rulebook, ruleChunk } from '@repo/db/schema';
import { ComplianceRuleSchema, env } from '@repo/domain';
import { ChunkBuilder, RuleSearcher } from '@repo/retrieval';
import { eq } from 'drizzle-orm';

function json(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return JSON.parse(value);
  return value;
}

async function indexRulebook(rulebookId: string): Promise<void> {
  if (!env.GEMINI_API_KEY)
    throw new Error('GEMINI_API_KEY is required to index a rulebook for evaluation');
  const rulebookRows = await db.select().from(rulebook).where(eq(rulebook.id, rulebookId));
  const rulebookRow = rulebookRows[0];
  if (!rulebookRow) throw new Error(`Rulebook ${rulebookId} does not exist`);
  const ruleRows = await db
    .select()
    .from(complianceRule)
    .where(eq(complianceRule.rulebookId, rulebookId));
  if (ruleRows.length === 0) throw new Error(`Rulebook ${rulebookId} has no compliance rules`);
  const rules = ruleRows.map((row) =>
    ComplianceRuleSchema.parse({
      ...row,
      severityGuidance: json(row.severityGuidance),
      correctiveActionGuidance: json(row.correctiveActionGuidance),
    }),
  );
  const searcher = new RuleSearcher({
    apiKey: env.GEMINI_API_KEY,
    embeddingModel: env.GEMINI_EMBEDDING_MODEL,
  });
  const chunks = await searcher.embedChunks(new ChunkBuilder().buildChunksFromRules(rules));
  const createdAt = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.delete(ruleChunk).where(eq(ruleChunk.rulebookId, rulebookId));
    await tx.insert(ruleChunk).values(
      chunks.map((chunk) => ({
        id: chunk.id,
        ruleId: chunk.ruleId,
        rulebookId: chunk.rulebookId,
        rulebookVersion: chunk.rulebookVersion,
        text: chunk.text,
        pageNumber: chunk.pageNumber,
        sectionId: chunk.metadata.sectionId,
        sectionTitle: chunk.metadata.sectionTitle,
        category: chunk.metadata.category,
        embedding: JSON.stringify(chunk.embedding),
        embeddingModel: env.GEMINI_EMBEDDING_MODEL,
        createdAt,
      })),
    );
    await tx
      .update(rulebook)
      .set({ indexStatus: 'INDEXED', updatedAt: createdAt })
      .where(eq(rulebook.id, rulebookId));
  });
  console.log(
    JSON.stringify({
      rulebookId,
      rulebookVersion: rulebookRow.version,
      status: 'INDEXED',
      chunks: chunks.length,
      embeddingModel: env.GEMINI_EMBEDDING_MODEL,
    }),
  );
}

const rulebookId = process.argv[2];
if (!rulebookId) {
  console.error('Usage: pnpm --filter pipeline index-rulebook -- <rulebook-id>');
  process.exit(2);
}
indexRulebook(rulebookId).catch((error: unknown) => {
  console.error('Rulebook indexing failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
