export interface GeminiStandardPricing {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

// Standard paid-tier text rates verified at https://ai.google.dev/gemini-api/docs/pricing
// on 2026-07-13. The Gemini API response exposes usage, not the account's final invoice.
const GEMINI_STANDARD_PRICING: Readonly<Record<string, GeminiStandardPricing>> = {
  'gemini-2.5-flash': {
    inputUsdPerMillionTokens: 0.3,
    outputUsdPerMillionTokens: 2.5,
  },
  'gemini-2.5-flash-lite': {
    inputUsdPerMillionTokens: 0.1,
    outputUsdPerMillionTokens: 0.4,
  },
};

export function getGeminiStandardPricing(model: string): GeminiStandardPricing | undefined {
  return GEMINI_STANDARD_PRICING[model];
}

export function calculateGeminiCostUsd(
  pricing: GeminiStandardPricing,
  usage: { input: number; output: number },
): number {
  return (
    (usage.input * pricing.inputUsdPerMillionTokens +
      usage.output * pricing.outputUsdPerMillionTokens) /
    1_000_000
  );
}
