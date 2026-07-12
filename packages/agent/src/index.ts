export interface StructuredGenerationRequest<TInput> {
  model: string;
  systemPrompt: string;
  userContent: string;
  input: TInput;
  schema: unknown;
  temperature: number;
  maxTokens?: number;
}

export interface StructuredGenerationResult<TOutput> {
  output: TOutput;
  tokenUsage: {
    input: number;
    output: number;
  };
  model: string;
  latencyMs: number;
  costUsd: number;
}

export interface ModelProvider {
  generateStructured<TInput, TOutput>(
    request: StructuredGenerationRequest<TInput>,
  ): Promise<StructuredGenerationResult<TOutput>>;
}
