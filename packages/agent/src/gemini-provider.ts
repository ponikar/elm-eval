import { type GenerateContentParameters, GoogleGenAI } from '@google/genai';
import { env } from '@repo/domain';
import { calculateModelCostUsd, getModelPricing } from './model-pricing.js';
import type {
  ModelProvider,
  StructuredGenerationRequest,
  StructuredGenerationResult,
} from './model-provider.js';
import { ModelProviderError } from './model-provider.js';

interface GeminiGenerationResponse {
  text?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
}

type GenerateContent = (params: GenerateContentParameters) => Promise<GeminiGenerationResponse>;

export class GeminiModelProvider implements ModelProvider {
  private generateContent: GenerateContent;
  private now: () => number;

  constructor(
    config: { apiKey?: string; now?: () => number; generateContent?: GenerateContent } = {},
  ) {
    if (config.generateContent) {
      this.generateContent = config.generateContent;
    } else {
      const apiKey = config.apiKey ?? env.GEMINI_API_KEY;
      if (!apiKey) throw new ModelProviderError('GEMINI_API_KEY is required', 'PERMANENT');
      const client = new GoogleGenAI({ apiKey });
      this.generateContent = (params) => client.models.generateContent(params);
    }
    this.now = config.now ?? Date.now;
  }

  async generateStructured<TInput, TOutput>(
    request: StructuredGenerationRequest<TInput, TOutput>,
  ): Promise<StructuredGenerationResult<TOutput>> {
    const pricing = getModelPricing(request.model);
    if (!pricing)
      throw new ModelProviderError(`No pricing configured for model ${request.model}`, 'PERMANENT');
    const started = this.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await this.generateContent({
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
      const tokenUsage = {
        input: response.usageMetadata?.promptTokenCount ?? 0,
        output:
          (response.usageMetadata?.candidatesTokenCount ?? 0) +
          (response.usageMetadata?.thoughtsTokenCount ?? 0),
      };
      return {
        output: request.schema.parse(JSON.parse(response.text)),
        model: request.model,
        latencyMs: this.now() - started,
        costUsd: calculateModelCostUsd(pricing, tokenUsage),
        tokenUsage,
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
