import { GoogleGenAI } from '@google/genai';

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
    const apiKey = config.apiKey ?? process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY required: set env var or pass config.apiKey');
    }
    this.genAI = new GoogleGenAI({ apiKey });
    this.model = config.model ?? 'gemini-embedding-001';
    this.dimensions = config.dimensions ?? 768;
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
