import { describe, it, expect } from 'vitest';
import { normalizeFieldValue, extractTextFromDoc } from '../services/rag/normalizer.js';
import { chunkText, hashContent, estimateTokens } from '../services/rag/chunker.js';
import { cosineSimilarity } from '../services/rag/embedding.service.js';
import { isAICollection, AI_CHUNKS_COLLECTION } from '../types/ai.js';

describe('Day 3 — RAG & Semantic Retrieval Module', () => {
  describe('Content Normalizer', () => {
    it('normalizes plain strings and strips unwanted HTML', () => {
      const html = '<p>Welcome to <strong>Dyrected CMS</strong>. Fast & modern.</p>';
      const normalized = normalizeFieldValue(html);
      expect(normalized).toBe('Welcome to Dyrected CMS. Fast & modern.');
    });

    it('extracts rich text from Lexical / Slate block tree structures', () => {
      const lexicalAst = {
        root: {
          children: [
            {
              type: 'h2',
              children: [{ text: 'Refund Policy' }],
            },
            {
              type: 'p',
              children: [
                { text: 'We offer full refunds within ' },
                { text: '30 days', bold: true },
                { text: ' of purchase.' },
              ],
            },
          ],
        },
      };

      const normalized = normalizeFieldValue(lexicalAst);
      expect(normalized).toContain('## Refund Policy');
      expect(normalized).toContain('30 days');
    });

    it('extracts searchable text fields from CMS documents', () => {
      const doc = {
        id: 'doc_123',
        title: 'Enterprise SLAs',
        body: 'Guaranteed 99.99% uptime with dedicated 24/7 support.',
        status: 'published',
        createdAt: new Date().toISOString(),
      };

      const extracted = extractTextFromDoc(doc);
      const fieldNames = extracted.map((e) => e.field);
      expect(fieldNames).toContain('title');
      expect(fieldNames).toContain('body');
      expect(fieldNames).not.toContain('id');
      expect(fieldNames).not.toContain('createdAt');
    });
  });

  describe('Recursive Chunker & Hashing', () => {
    it('generates consistent SHA-256 hashes', () => {
      const text = 'Dyrected CMS is an open-source headless CMS built for speed.';
      const hash1 = hashContent(text);
      const hash2 = hashContent(text);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('returns a single chunk if text is smaller than maxChunkSize', () => {
      const text = 'Short document content.';
      const chunks = chunkText(text, { maxChunkSize: 500 });
      expect(chunks).toHaveLength(1);
      expect(chunks[0]!.text).toBe(text);
      expect(chunks[0]!.index).toBe(0);
    });

    it('splits long text recursively across paragraphs with overlap', () => {
      const p1 = 'First paragraph about system architecture and high availability. '.repeat(10);
      const p2 = 'Second paragraph about vector database search and embeddings. '.repeat(10);
      const fullText = `${p1}\n\n${p2}`;

      const chunks = chunkText(fullText, { maxChunkSize: 300, chunkOverlap: 40 });
      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) {
        expect(c.text.length).toBeLessThanOrEqual(350);
        expect(c.tokenCount).toBeGreaterThan(0);
      }
    });

    it('estimates tokens accurately (~4 characters per token)', () => {
      const text = '12345678';
      expect(estimateTokens(text)).toBe(2);
    });
  });

  describe('Vector Math & Cosine Similarity', () => {
    it('computes exact match score of 1.0 for identical normalized vectors', () => {
      const vecA = [0.5, 0.5, 0.5, 0.5];
      const similarity = cosineSimilarity(vecA, vecA);
      expect(similarity).toBeCloseTo(1.0, 4);
    });

    it('computes 0.0 for orthogonal vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(0.0, 4);
    });

    it('handles empty or mismatched dimension vectors gracefully', () => {
      expect(cosineSimilarity([], [])).toBe(0);
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });
  });

  describe('Internal Collections & Safeguards', () => {
    it('identifies _dyrected_ai_chunks as an internal AI collection', () => {
      expect(isAICollection(AI_CHUNKS_COLLECTION)).toBe(true);
      expect(isAICollection('_dyrected_ai_chunks')).toBe(true);
      expect(isAICollection('articles')).toBe(false);
    });
  });
});
