import { GoogleGenAI } from '@google/genai';
import { env } from '@repo/domain';

export interface EmbeddingConfig {
  apiKey?: string;
  model?: string;
  dimensions?: number;
}

export class GeminiEmbeddings {
  private genAI: GoogleGenAI;
  private model: string;
  private dimensions: number;

  constructor(config: EmbeddingConfig = {}) {
    const apiKey = config.apiKey ?? env.GEMINI_API_KEY;
    this.genAI = new GoogleGenAI({ apiKey });
    this.model = config.model ?? env.GEMINI_EMBEDDING_MODEL;
    this.dimensions = config.dimensions ?? env.EMBEDDING_DIMENSIONS;
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.genAI.models.embedContent({
      model: this.model,
      contents: text,
      config: {
        outputDimensionality: this.dimensions,
      },
    });

    const embedding = response.embeddings?.[0]?.values;
    if (!embedding) {
      throw new Error(`No embedding returned for text: "${text.slice(0, 50)}..."`);
    }

    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const BATCH_SIZE = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = await Promise.all(batch.map((text) => this.embed(text)));
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  get dimensions_(): number {
    return this.dimensions;
  }
}
