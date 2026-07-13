export interface ModelPricing {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

// Standard paid-tier text rates verified at https://ai.google.dev/gemini-api/docs/pricing
// on 2026-07-13. Provider responses expose usage, not the account's final invoice.
const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  'gemini-2.5-flash': {
    inputUsdPerMillionTokens: 0.3,
    outputUsdPerMillionTokens: 2.5,
  },
  'gemini-2.5-flash-lite': {
    inputUsdPerMillionTokens: 0.1,
    outputUsdPerMillionTokens: 0.4,
  },
};

export function getModelPricing(model: string): ModelPricing | undefined {
  return MODEL_PRICING[model];
}

export function calculateModelCostUsd(
  pricing: ModelPricing,
  usage: { input: number; output: number },
): number {
  return (
    (usage.input * pricing.inputUsdPerMillionTokens +
      usage.output * pricing.outputUsdPerMillionTokens) /
    1_000_000
  );
}
