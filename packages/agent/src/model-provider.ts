import type { z } from 'zod';
export interface StructuredGenerationRequest<TInput, TOutput> {
  model: string;
  systemPrompt: string;
  userContent: string;
  input: TInput;
  schema: z.ZodType<TOutput>;
  temperature: number;
  maxTokens?: number;
  timeoutMs: number;
}
export interface StructuredGenerationResult<TOutput> {
  output: TOutput;
  tokenUsage: { input: number; output: number };
  model: string;
  latencyMs: number;
  costUsd: number;
}
export interface ModelProvider {
  generateStructured<TInput, TOutput>(
    request: StructuredGenerationRequest<TInput, TOutput>,
  ): Promise<StructuredGenerationResult<TOutput>>;
}
export class ModelProviderError extends Error {
  constructor(
    message: string,
    readonly code: 'TIMEOUT' | 'TRANSIENT' | 'PERMANENT' | 'INVALID_RESPONSE',
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ModelProviderError';
  }
}
