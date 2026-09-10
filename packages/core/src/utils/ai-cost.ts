export interface ModelPricing {
  promptPerMillion: number; // in USD
  completionPerMillion: number; // in USD
}

/**
 * Standard pricing table (per 1 million tokens in USD).
 * Reference: official API pricing as of 2025/2026.
 */
export const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
  // Google Gemini
  'gemini-2.0-flash': { promptPerMillion: 0.10, completionPerMillion: 0.40 },
  'gemini-2.0-flash-exp': { promptPerMillion: 0.00, completionPerMillion: 0.00 },
  'gemini-1.5-flash': { promptPerMillion: 0.075, completionPerMillion: 0.30 },
  'gemini-1.5-pro': { promptPerMillion: 1.25, completionPerMillion: 5.00 },

  // Anthropic Claude
  'claude-3-5-sonnet-20241022': { promptPerMillion: 3.00, completionPerMillion: 15.00 },
  'claude-3-5-haiku-20241022': { promptPerMillion: 0.80, completionPerMillion: 4.00 },
  'claude-3-haiku-20240307': { promptPerMillion: 0.25, completionPerMillion: 1.25 },

  // OpenAI
  'gpt-4o': { promptPerMillion: 2.50, completionPerMillion: 10.00 },
  'gpt-4o-mini': { promptPerMillion: 0.15, completionPerMillion: 0.60 },

  // Default fallback (conservative estimate based on flash-class models)
  default: { promptPerMillion: 0.15, completionPerMillion: 0.60 },
};

export function estimateTokenCost(options: {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  customPricing?: ModelPricing;
}): number {
  const { model = 'default', promptTokens = 0, completionTokens = 0, customPricing } = options;

  const pricing =
    customPricing ||
    DEFAULT_MODEL_PRICING[model] ||
    Object.entries(DEFAULT_MODEL_PRICING).find(([key]) => model.toLowerCase().includes(key))?.[1] ||
    DEFAULT_MODEL_PRICING.default;

  const promptCost = (promptTokens / 1_000_000) * pricing.promptPerMillion;
  const completionCost = (completionTokens / 1_000_000) * pricing.completionPerMillion;

  return Number((promptCost + completionCost).toFixed(6));
}
