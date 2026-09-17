import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RAGService } from "../services/rag/rag.service.js";
import { hasEmbeddingApiKey } from "../services/rag/embedding.service.js";

const ENV_KEYS = [
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
];

describe("RAG indexing without AI keys configured", () => {
  let saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved = {};
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    vi.restoreAllMocks();
  });

  it("reports no embedding key when neither config nor env provides one", () => {
    expect(hasEmbeddingApiKey({ collections: [], globals: [] } as any)).toBe(false);
    expect(hasEmbeddingApiKey(undefined)).toBe(false);
  });

  it("detects a key from config or env", () => {
    expect(hasEmbeddingApiKey({ ai: { apiKey: "sk-test" } } as any)).toBe(true);
    process.env.OPENAI_API_KEY = "sk-test";
    expect(hasEmbeddingApiKey({ collections: [], globals: [] } as any)).toBe(true);
  });

  it("skips indexing silently instead of throwing when unconfigured", async () => {
    const config = {
      collections: [{ slug: "posts", fields: [{ name: "title", type: "text" }] }],
      globals: [],
    } as any;
    const result = await RAGService.indexDocument({
      db: {} as any,
      config,
      collection: "posts",
      doc: { id: "1", title: "Hello" },
      projectId: "test",
    });
    expect(result).toEqual({ indexed: 0, skipped: 0 });
  });
});
