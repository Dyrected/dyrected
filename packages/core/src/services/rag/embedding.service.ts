import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { embed, embedMany, type EmbeddingModel } from 'ai';
import type { DyrectedConfig } from '../../types/index.js';

export function getEmbeddingModel(config?: DyrectedConfig): EmbeddingModel {
  const ai = config?.ai;
  const provider = ai?.provider;

  // 1. Explicit OpenRouter or OPENROUTER_API_KEY
  if (
    provider === 'openrouter' ||
    (provider === 'agentrouter' && process.env.OPENROUTER_API_KEY) ||
    (!provider && process.env.OPENROUTER_API_KEY)
  ) {
    const apiKey = ai?.apiKey || process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      const baseURL = ai?.baseURL || 'https://openrouter.ai/api/v1';
      const modelName = ai?.rag?.embeddingModel || 'openai/text-embedding-3-small';
      const openRouterProvider = createOpenAI({ apiKey, baseURL });
      return openRouterProvider.textEmbeddingModel(modelName);
    }
  }

  // 2. Explicit OpenAI or OPENAI_API_KEY
  if (
    provider === 'openai' ||
    (provider === 'agentrouter' && process.env.OPENAI_API_KEY) ||
    (!provider && process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY)
  ) {
    const apiKey = ai?.apiKey || process.env.OPENAI_API_KEY;
    if (apiKey) {
      const baseURL = ai?.baseURL;
      const modelName = ai?.rag?.embeddingModel || 'text-embedding-3-small';
      const openaiProvider = createOpenAI({ apiKey, baseURL });
      return openaiProvider.textEmbeddingModel(modelName);
    }
  }

  // 3. Google Generative AI (Gemini)
  const geminiApiKey = ai?.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiApiKey) {
    const googleProvider = createGoogleGenerativeAI({ apiKey: geminiApiKey });
    const modelName = ai?.rag?.embeddingModel || 'text-embedding-004';
    return googleProvider.textEmbeddingModel(modelName);
  }

  // 4. Fallback OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    const openRouterProvider = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
    return openRouterProvider.textEmbeddingModel(ai?.rag?.embeddingModel || 'openai/text-embedding-3-small');
  }

  throw new Error(
    'No AI API key found for embeddings. Please set OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in your .env.local file.'
  );
}

export class EmbeddingService {
  private config?: DyrectedConfig;
  private model: EmbeddingModel;

  constructor(config?: DyrectedConfig) {
    this.config = config;
    this.model = getEmbeddingModel(config);
  }

  async embedText(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.model,
      value: text,
    });
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    // Max batch size of 64 to avoid provider payload limits
    const batchSize = 64;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const { embeddings } = await embedMany({
        model: this.model,
        values: batch,
      });
      results.push(...embeddings);
    }

    return results;
  }
}

/**
 * Computes cosine similarity between two float vector arrays.
 * Returns a value between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized text embeddings).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!;
    const bi = b[i]!;
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
