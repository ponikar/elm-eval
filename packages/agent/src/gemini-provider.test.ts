import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { calculateGeminiCostUsd, getGeminiStandardPricing } from './gemini-pricing.js';
import { GeminiModelProvider } from './gemini-provider.js';

const schema = z.object({ ok: z.boolean() });

function request(model: string) {
  return {
    model,
    systemPrompt: 'Return JSON.',
    userContent: 'Test.',
    input: { value: true },
    schema,
    temperature: 0,
    timeoutMs: 100,
  };
}

describe('Gemini cost accounting', () => {
  it('calculates standard paid-list estimates for the seeded models', () => {
    const flash = getGeminiStandardPricing('gemini-2.5-flash');
    const flashLite = getGeminiStandardPricing('gemini-2.5-flash-lite');

    expect(flash).toBeDefined();
    expect(flashLite).toBeDefined();
    if (!flash || !flashLite) throw new Error('Seeded Gemini pricing is missing');

    expect(calculateGeminiCostUsd(flash, { input: 1_000_000, output: 1_000_000 })).toBe(2.8);
    expect(calculateGeminiCostUsd(flashLite, { input: 1_000_000, output: 1_000_000 })).toBe(0.5);
  });

  it('includes thinking tokens in output usage and cost', async () => {
    const provider = new GeminiModelProvider({
      generateContent: async () => ({
        text: '{"ok":true}',
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 20,
          thoughtsTokenCount: 30,
        },
      }),
    });

    const result = await provider.generateStructured(request('gemini-2.5-flash'));

    expect(result.tokenUsage).toEqual({ input: 100, output: 50 });
    expect(result.costUsd).toBe((100 * 0.3 + 50 * 2.5) / 1_000_000);
  });

  it('records zero cost when Gemini reports no token usage', async () => {
    const provider = new GeminiModelProvider({
      generateContent: async () => ({ text: '{"ok":true}' }),
    });

    const result = await provider.generateStructured(request('gemini-2.5-flash-lite'));

    expect(result.tokenUsage).toEqual({ input: 0, output: 0 });
    expect(result.costUsd).toBe(0);
  });

  it('rejects an unpriced model before making a Gemini request', async () => {
    let calls = 0;
    const provider = new GeminiModelProvider({
      generateContent: async () => {
        calls += 1;
        return { text: '{"ok":true}' };
      },
    });

    await expect(provider.generateStructured(request('gemini-unknown'))).rejects.toMatchObject({
      code: 'PERMANENT',
    });
    expect(calls).toBe(0);
  });
});
