import { GoogleGenAI } from '@google/genai';
import { env } from '@repo/domain';
import type {
  ModelProvider,
  StructuredGenerationRequest,
  StructuredGenerationResult,
} from './model-provider.js';
import { ModelProviderError } from './model-provider.js';
export class GeminiModelProvider implements ModelProvider {
  private client: GoogleGenAI;
  private now: () => number;
  constructor(config: { apiKey?: string; now?: () => number } = {}) {
    const apiKey = config.apiKey ?? env.GEMINI_API_KEY;
    if (!apiKey) throw new ModelProviderError('GEMINI_API_KEY is required', 'PERMANENT');
    this.client = new GoogleGenAI({ apiKey });
    this.now = config.now ?? Date.now;
  }
  async generateStructured<TInput, TOutput>(
    request: StructuredGenerationRequest<TInput, TOutput>,
  ): Promise<StructuredGenerationResult<TOutput>> {
    const started = this.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await this.client.models.generateContent({
        model: request.model,
        contents: `${request.userContent}\n\nINPUT:\n${JSON.stringify(request.input)}`,
        config: {
          systemInstruction: request.systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: request.schema,
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          abortSignal: controller.signal,
        },
      });
      if (!response.text)
        throw new ModelProviderError('Gemini returned no content', 'INVALID_RESPONSE');
      return {
        output: request.schema.parse(JSON.parse(response.text)),
        model: request.model,
        latencyMs: this.now() - started,
        costUsd: 0,
        tokenUsage: {
          input: response.usageMetadata?.promptTokenCount ?? 0,
          output: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    } catch (error: unknown) {
      if (error instanceof ModelProviderError) throw error;
      if (controller.signal.aborted)
        throw new ModelProviderError(
          `Gemini request timed out after ${request.timeoutMs}ms`,
          'TIMEOUT',
          error,
        );
      const message = error instanceof Error ? error.message : 'Unknown Gemini error';
      const status =
        typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
      const transient = status === 429 || (typeof status === 'number' && status >= 500);
      throw new ModelProviderError(message, transient ? 'TRANSIENT' : 'PERMANENT', error);
    } finally {
      clearTimeout(timeout);
    }
  }
}
