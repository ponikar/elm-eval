import { GeminiEmbeddings } from './embeddings.js';
import { batchCosineSimilarity } from './cosine-similarity.js';
import type { RuleChunk } from './chunk-builder.js';

export interface SearchResult {
  chunk: RuleChunk;
  score: number;
}

export interface RuleSearcherConfig {
  apiKey?: string;
  embeddingModel?: string;
}

export class RuleSearcher {
  private embeddings: GeminiEmbeddings;

  constructor(config: RuleSearcherConfig = {}) {
    this.embeddings = new GeminiEmbeddings({
      apiKey: config.apiKey,
      model: config.embeddingModel,
    });
  }

  async search(query: string, chunks: RuleChunk[], topK = 5): Promise<SearchResult[]> {
    if (chunks.length === 0) return [];

    const queryEmbedding = await this.embeddings.embed(query);
    const chunkEmbeddings = chunks.map((c) => c.embedding ?? []);
    const scores = batchCosineSimilarity(queryEmbedding, chunkEmbeddings);

    const results: SearchResult[] = chunks.map((chunk, i) => ({
      chunk,
      score: scores[i] ?? 0,
    }));

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async embedChunks(chunks: RuleChunk[]): Promise<RuleChunk[]> {
    const texts = chunks.map((c) => c.text);
    const embeddings = await this.embeddings.embedBatch(texts);

    return chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    }));
  }
}
