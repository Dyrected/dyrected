import type { DatabaseAdapter } from '../../types/adapters.js';
import type { DyrectedConfig, AuthenticatedUser, CollectionConfig } from '../../types/index.js';
import type { AIChunk, RAGSearchResult } from '../../types/ai.js';
import { AI_CHUNKS_COLLECTION, isAICollection } from '../../types/ai.js';
import { isAccessAllowed } from '../../auth/access.js';
import { extractTextFromDoc } from './normalizer.js';
import { chunkText, hashContent } from './chunker.js';
import { EmbeddingService, cosineSimilarity } from './embedding.service.js';

export interface IndexDocumentOptions {
  db: DatabaseAdapter;
  config: DyrectedConfig;
  collection: string;
  doc: Record<string, unknown>;
  projectId: string;
  force?: boolean;
}

export interface DeleteDocumentChunksOptions {
  db: DatabaseAdapter;
  collection: string;
  documentId: string;
  projectId: string;
}

export interface ReindexCollectionOptions {
  db: DatabaseAdapter;
  config: DyrectedConfig;
  collection: string;
  projectId: string;
  force?: boolean;
}

export interface ReindexAllOptions {
  db: DatabaseAdapter;
  config: DyrectedConfig;
  projectId: string;
  force?: boolean;
}

export interface RAGSearchOptions {
  db: DatabaseAdapter;
  config: DyrectedConfig;
  query: string;
  projectId: string;
  collections?: string[];
  limit?: number;
  minScore?: number;
  user?: AuthenticatedUser;
}

export class RAGService {
  private static embeddingServiceCache: Map<string, EmbeddingService> = new Map();

  private static getEmbeddingService(config: DyrectedConfig): EmbeddingService {
    const key = config.ai?.apiKey || config.ai?.provider || 'default';
    if (!this.embeddingServiceCache.has(key)) {
      this.embeddingServiceCache.set(key, new EmbeddingService(config));
    }
    return this.embeddingServiceCache.get(key)!;
  }

  /**
   * Determines whether RAG indexing is enabled for a given collection.
   */
  static isCollectionRAGEnabled(config: DyrectedConfig, col: CollectionConfig): boolean {
    if (isAICollection(col.slug) || col.slug.startsWith('_')) {
      return false;
    }

    // Global toggle: if config.ai.rag.enabled is explicitly false, disabled
    if (config.ai?.rag?.enabled === false) {
      return false;
    }

    // Collection toggle: if col.ai.rag.enabled is explicitly false, disabled
    if (col.ai?.rag?.enabled === false) {
      return false;
    }

    return true;
  }

  /**
   * Indexes a single document's text fields into `_dyrected_ai_chunks`.
   */
  static async indexDocument(options: IndexDocumentOptions): Promise<{ indexed: number; skipped: number }> {
    const { db, config, collection: collectionSlug, doc, projectId, force = false } = options;

    const col = config.collections?.find((c) => c.slug === collectionSlug);
    if (!col || !this.isCollectionRAGEnabled(config, col)) {
      return { indexed: 0, skipped: 0 };
    }

    const docId = String(doc.id || doc._id || '');
    if (!docId) return { indexed: 0, skipped: 0 };

    const ragConfig = col.ai?.rag;
    const maxChunkSize = ragConfig?.maxChunkSize || config.ai?.rag?.maxChunkSize || 1500;
    const chunkOverlap = ragConfig?.chunkOverlap ?? config.ai?.rag?.chunkOverlap ?? 150;
    const targetFields = ragConfig?.fields;

    // Resolve document title for citation references
    const titleField = ragConfig?.titleField || col.admin?.useAsTitle || 'title';
    const documentTitle = String(doc[titleField] || doc.name || doc.headline || doc.question || `${col.labels?.singular || col.slug} #${docId}`);

    const extractedFields = extractTextFromDoc(doc, targetFields);
    if (extractedFields.length === 0) {
      // If document has no text, remove any prior chunks
      await this.deleteDocumentChunks({ db, collection: collectionSlug, documentId: docId, projectId });
      return { indexed: 0, skipped: 0 };
    }

    let indexedCount = 0;
    let skippedCount = 0;

    for (const field of extractedFields) {
      const fullFieldText = field.text;
      const contentHash = hashContent(fullFieldText);

      // Check if existing chunks for this document field match the content hash
      if (!force) {
        try {
          const existing = await db.find({
            collection: AI_CHUNKS_COLLECTION,
            where: {
              projectId,
              collection: collectionSlug,
              documentId: docId,
              field: field.field,
              contentHash,
            },
            limit: 1,
          });

          if (existing?.docs && existing.docs.length > 0) {
            skippedCount++;
            continue; // Hash matches; text did not change, skip embedding API call!
          }
        } catch {
          // If query fails (e.g. table not created yet), proceed to re-embed
        }
      }

      // Text changed or not yet indexed: split into chunks
      const chunks = chunkText(fullFieldText, { maxChunkSize, chunkOverlap });
      if (chunks.length === 0) continue;

      // 1. Delete previous chunks for this document field
      try {
        const previousChunks = await db.find({
          collection: AI_CHUNKS_COLLECTION,
          where: {
            projectId,
            collection: collectionSlug,
            documentId: docId,
            field: field.field,
          },
          limit: 200,
        });
        if (previousChunks?.docs) {
          for (const prev of previousChunks.docs) {
            await db.delete({ collection: AI_CHUNKS_COLLECTION, id: prev.id });
          }
        }
      } catch {
        // Table might not exist yet
      }

      // 2. Generate embeddings
      const embeddingService = this.getEmbeddingService(config);
      const chunkTexts = chunks.map((c) => c.text);
      const embeddings = await embeddingService.embedBatch(chunkTexts);

      // 3. Persist new chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]!;
        const embedding = embeddings[i] || [];
        const chunkRecord: AIChunk = {
          id: `chunk_${docId}_${field.field}_${chunk.index}_${Math.random().toString(36).substring(2, 7)}`,
          projectId,
          collection: collectionSlug,
          documentId: docId,
          field: field.field,
          chunkIndex: chunk.index,
          text: chunk.text,
          embedding,
          tokenCount: chunk.tokenCount,
          contentHash,
          metadata: {
            title: documentTitle,
            slug: typeof doc.slug === 'string' ? doc.slug : undefined,
            status: typeof doc.status === 'string' ? doc.status : undefined,
            updatedAt: new Date(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        try {
          await db.create({ collection: AI_CHUNKS_COLLECTION, data: chunkRecord });
          indexedCount++;
        } catch (err: any) {
          console.error(`[dyrected/rag] Failed to save chunk ${chunkRecord.id}:`, err?.message || err);
        }
      }
    }

    return { indexed: indexedCount, skipped: skippedCount };
  }

  /**
   * Deletes all vector chunks associated with a specific document.
   */
  static async deleteDocumentChunks(options: DeleteDocumentChunksOptions): Promise<number> {
    const { db, collection: collectionSlug, documentId, projectId } = options;
    try {
      const existing = await db.find({
        collection: AI_CHUNKS_COLLECTION,
        where: {
          projectId,
          collection: collectionSlug,
          documentId,
        },
        limit: 500,
      });

      let count = 0;
      if (existing?.docs) {
        for (const doc of existing.docs) {
          await db.delete({ collection: AI_CHUNKS_COLLECTION, id: doc.id });
          count++;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Reindexes all documents in a specific collection.
   */
  static async reindexCollection(options: ReindexCollectionOptions): Promise<{ collection: string; totalDocs: number; indexedChunks: number }> {
    const { db, config, collection: collectionSlug, projectId, force = false } = options;
    const col = config.collections?.find((c) => c.slug === collectionSlug);
    if (!col || !this.isCollectionRAGEnabled(config, col)) {
      return { collection: collectionSlug, totalDocs: 0, indexedChunks: 0 };
    }

    const result = await db.find({
      collection: collectionSlug,
      where: {},
      limit: 1000,
    });

    const docs = result.docs || [];
    let indexedChunks = 0;

    for (const doc of docs) {
      const res = await this.indexDocument({
        db,
        config,
        collection: collectionSlug,
        doc,
        projectId,
        force,
      });
      indexedChunks += res.indexed;
    }

    return {
      collection: collectionSlug,
      totalDocs: docs.length,
      indexedChunks,
    };
  }

  /**
   * Reindexes all RAG-enabled collections across the project.
   */
  static async reindexAll(options: ReindexAllOptions): Promise<{ collections: Array<{ collection: string; totalDocs: number; indexedChunks: number }>; totalChunks: number }> {
    const { db, config, projectId, force = false } = options;
    const results: Array<{ collection: string; totalDocs: number; indexedChunks: number }> = [];
    let totalChunks = 0;

    const collections = (config.collections || []).filter((c) => this.isCollectionRAGEnabled(config, c));

    for (const col of collections) {
      try {
        const stats = await this.reindexCollection({
          db,
          config,
          collection: col.slug,
          projectId,
          force,
        });
        results.push(stats);
        totalChunks += stats.indexedChunks;
      } catch (err: any) {
        console.error(`[dyrected/rag] Reindex failed for collection "${col.slug}":`, err?.message || err);
      }
    }

    return { collections: results, totalChunks };
  }

  /**
   * Performs semantic vector search over project chunks with access filtering.
   */
  static async search(options: RAGSearchOptions): Promise<{ query: string; resultsCount: number; sources: RAGSearchResult[] }> {
    const {
      db,
      config,
      query,
      projectId,
      collections: requestedCollections,
      limit = config.ai?.rag?.topK || 4,
      minScore = config.ai?.rag?.minScore ?? 0.45,
      user,
    } = options;

    if (!query || !query.trim()) {
      return { query: '', resultsCount: 0, sources: [] };
    }

    // 1. Resolve candidate collections that user has permission to read
    const allCollections = config.collections || [];
    const candidateCollections: string[] = [];

    for (const col of allCollections) {
      if (!this.isCollectionRAGEnabled(config, col)) continue;
      if (requestedCollections && requestedCollections.length > 0 && !requestedCollections.includes(col.slug)) {
        continue;
      }

      // Check read permission
      const canRead = await isAccessAllowed(config, col.access?.read, {
        req: { user, siteId: projectId } as any,
        user,
      });

      if (canRead) {
        candidateCollections.push(col.slug);
      }
    }

    if (candidateCollections.length === 0) {
      return { query, resultsCount: 0, sources: [] };
    }

    // 2. Generate embedding for user query
    const embeddingService = this.getEmbeddingService(config);
    const queryVector = await embeddingService.embedText(query.trim());

    // 3. Fetch candidate chunks for active projectId
    let chunks: AIChunk[];
    try {
      const result = await db.find({
        collection: AI_CHUNKS_COLLECTION,
        where: { projectId },
        limit: 1000,
      });
      chunks = (result.docs || []) as AIChunk[];
    } catch {
      chunks = [];
    }

    // Filter chunks to permitted collections
    const filteredChunks = chunks.filter((c) => candidateCollections.includes(c.collection));

    // 4. Compute cosine similarity scores
    const scored = filteredChunks
      .map((chunk) => {
        const score = cosineSimilarity(queryVector, chunk.embedding);
        return {
          chunk,
          score,
        };
      })
      .filter((item) => item.score >= minScore)
      .sort((a, b) => b.score - a.score);

    // 5. Select top K non-duplicate snippets
    const topResults = scored.slice(0, limit);

    const sources: RAGSearchResult[] = topResults.map(({ chunk, score }) => {
      const title = chunk.metadata?.title || `${chunk.collection} #${chunk.documentId}`;
      const url = `/admin/collections/${chunk.collection}/${chunk.documentId}`;

      return {
        id: chunk.id,
        collection: chunk.collection,
        documentId: chunk.documentId,
        title,
        field: chunk.field,
        score: Number(score.toFixed(3)),
        text: chunk.text,
        url,
        metadata: chunk.metadata,
      };
    });

    return {
      query,
      resultsCount: sources.length,
      sources,
    };
  }
}
