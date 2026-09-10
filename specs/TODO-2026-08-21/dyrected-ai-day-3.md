# Dyrected AI — Day 3 Specification

This document details the complete Day 3 implementation specification for **RAG over Dyrected Content** (Unstructured Content Ingestion, Embeddings, Vector Search, Grounded Citations, and Developer Customization) in Dyrected AI.

---

## 1. Day 3 Goal & Core Architecture

The goal of Day 3 is to teach the Dyrected AI Assistant to **understand unstructured knowledge and domain content** (articles, documentation, FAQs, pricing rules, material specs, and rich-text fields), moving beyond structured database filtering to semantic knowledge retrieval.

| Area | Day 3 Decision | Detail |
| :--- | :--- | :--- |
| **Vector Store Strategy** | **Adapter-Native Vector Collection (`_dyrected_ai_chunks`)** | Zero-dependency default: embeddings and chunk metadata are stored in a dedicated internal database collection (`_dyrected_ai_chunks`). Vector similarity is computed via cosine distance across project chunks, with an extensible adapter interface for native `pgvector` / SQLite extensions / external vector stores. |
| **Embedding Engine** | **`text-embedding-004` (via `@ai-sdk/google`)** | Uses Google's `text-embedding-004` (768 dimensions) via Vercel AI SDK `embed()` and `embedMany()`. Fast, high-accuracy semantic representations. |
| **Indexing Strategy** | **Automatic with Opt-Out** | All textual/richText collections are automatically chunked and indexed on save/update unless explicitly disabled (`ai: { rag: { enabled: false } }`). |
| **Chunking Engine** | **Recursive Character & Block Chunker** | Normalized markdown/plaintext chunking with hierarchical delimiters (`\n##`, `\n###`, `\n\n`, `\n`, `.`, ` `), default ~500 tokens (~1,500 chars) with 150-char overlap. Fully configurable per collection or project. |
| **Change Detection & Cost Control** | **SHA-256 Content Hashing** | Hashes normalized content to skip duplicate embedding calls on no-op saves, saving 90%+ in API tokens. |
| **Metadata Retention** | **Full Context Isolation** | Every chunk persists `projectId`, `collection`, `documentId`, `field`, `title`, `slug`, `locale`, and `chunkIndex` for strict tenant isolation, role-based access checks, and exact citation links. |
| **Retrieval Tool** | **`searchContent`** | Built-in AI tool exposed to Gemini with semantic query, score thresholding, collection filtering, and access policy evaluation. |
| **Grounded Citations** | **Attributed Sources in Responses** | Assistant grounds answers on retrieved snippets and outputs formatted source references with direct Admin UI URLs. |
| **Indexing Lifecycle** | **Hook-Based Auto-Sync & Bulk Reindex** | Real-time indexing via `afterChange` and `afterDelete` hooks, paired with on-demand API (`POST /ai/rag/index`) and CLI command (`dyrected ai:reindex`). |

---

## 2. Ingestion & Retrieval Pipeline Architecture

```text
========================================================================================
                                 INGESTION PIPELINE (Write Path)
========================================================================================

 ┌────────────────────────────────────────────────────────┐
 │   Dyrected CMS Document Mutation (Create/Update/Hook)   │
 │   - Articles (title, excerpt, richText content)        │
 │   - Documentation / FAQs (question, answer, body)      │
 │   - Print specs, material sheets, pricing matrices    │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 1. Content Normalizer                                  │
 │    - Strips raw HTML / converts Lexical/Slate/blocks   │
 │    - Extracts searchable text fields into clean MD     │
 │    - Computes SHA-256 content hash to skip no-ops      │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. Recursive Content Chunker                           │
 │    - Target chunk size: ~500 tokens (~1,500 chars)     │
 │    - Chunk overlap: 150 chars (configurable)           │
 │    - Preserves heading and paragraph integrity         │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 3. Embedding Pipeline                                  │
 │    - Batches chunks to @ai-sdk/google text-embedding   │
 │    - Model: `text-embedding-004` (768-dim vectors)     │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 4. Vector Persistence                                  │
 │    - Atomic upsert into `_dyrected_ai_chunks`          │
 │    - Stores: vector array, text snippet, metadata      │
 └────────────────────────────────────────────────────────┘

========================================================================================
                                 RETRIEVAL PIPELINE (Read Path)
========================================================================================

 ┌────────────────────────────────────────────────────────┐
 │ User Prompt: "What do our articles say about refunds?" │
 │ (or: "What paper weight do we recommend for brochures?")│
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ Gemini 2.5 Flash Agent analyzes intent:               │
 │ "This requires semantic content search across content" │
 │ Calls Tool: `searchContent({ query: "..." })`          │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ Core AI Retrieval Service                              │
 │ 1. Embed query with `text-embedding-004`               │
 │ 2. Query `_dyrected_ai_chunks` filtered by `projectId` │
 │ 3. Filter out unauthorized collections (user permissions)│
 │ 4. Compute cosine similarity & rank top K matches      │
 │ 5. Return top snippets with source metadata            │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ Assistant generates grounded answer with citations:    │
 │ - Synthesizes accurate response based on chunks        │
 │ - Renders Sources: [Document Title] (/admin/...)       │
 └────────────────────────────────────────────────────────┘
```

---

## 3. Database Persistence Schema: `_dyrected_ai_chunks`

Day 3 introduces a dedicated internal system collection for chunked vectors and metadata.

### 3.1 Collection Definition: `_dyrected_ai_chunks`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID / CUID) | Yes | Primary key (`chunk_${docId}_${field}_${index}`) |
| `projectId` | `string` | Yes | Scoped to active Dyrected project tenant |
| `collection` | `string` | Yes | Source collection slug (e.g. `articles`, `faqs`, `materials`) |
| `documentId` | `string` | Yes | Source document primary key |
| `field` | `string` | Yes | Source field name (e.g. `content`, `body`, `specifications`) |
| `chunkIndex` | `number` | Yes | Sequential chunk index within the document field |
| `text` | `text` / `string` | Yes | Plaintext / Markdown snippet content |
| `embedding` | `json` / `array` | Yes | 768-dimensional float vector array |
| `tokenCount` | `number` | Yes | Approximate token count of the chunk |
| `contentHash` | `string` | Yes | SHA-256 hash of the chunk content (for fast cache invalidation) |
| `metadata` | `json` | Yes | Additional metadata: `{ title, slug, locale, status, updatedAt }` |
| `createdAt` | `Date` / `timestamp` | Yes | Timestamp of chunk creation |
| `updatedAt` | `Date` / `timestamp` | Yes | Timestamp of last embedding update |

### 3.2 Indexing & Performance Indexes

* Compound index: `(projectId, collection, documentId)`
* Filtering index: `(projectId, collection)`
* Hash index: `(contentHash)`

---

## 4. Developer Configuration & Customization Interface

Dyrected provides a hierarchical configuration system. Developers can customize RAG behavior globally in `dyrected.config.ts` or override specific parameters on a per-collection basis.

### 4.1 Key Developer Customization Parameters Reference

| Parameter | Scope | Type | Default | Description & When to Customize |
| :--- | :--- | :--- | :--- | :--- |
| **`enabled`** | Global & Collection | `boolean` | `true` | **Automatic Indexing Toggle:** Controls whether documents are automatically chunked and embedded on save. Set to `false` on collections with sensitive audit logs, internal analytics, or binary data. |
| **`fields`** | Collection | `string[]` | *All `text` / `richText` / `textarea`* | **Target Field Selector:** Explicitly whitelist which schema fields should be embedded. Useful for ignoring boilerplate metadata and focusing solely on high-value knowledge (e.g. `['specifications', 'turnaroundTime']`). |
| **`titleField`** | Collection | `string` | First `text` field or `title` / `name` | **Citation Label Field:** Specifies which document field provides the display title in search results and AI citations (e.g. `productName`, `question`, `materialCode`). |
| **`maxChunkSize`** | Global & Collection | `number` (chars) | `1500` (~375–500 tokens) | **Chunk Character Budget:** Upper limit of text characters per vector chunk. Use smaller values (`500–800`) for dense specs, FAQs, and pricing matrices; use larger values (`1500–2500`) for narrative editorial articles. |
| **`chunkOverlap`** | Global & Collection | `number` (chars) | `150` (~10%) | **Context Continuity Overlap:** Number of characters shared between adjacent chunks to prevent cutting thoughts at boundaries. Set to `0–50` for discrete tabular rows/FAQs; set to `150–200` for long-form prose. |
| **`minScore`** | Global & Tool | `number` (0.0–1.0) | `0.50` | **Relevance Cutoff:** Minimum cosine similarity threshold required for a chunk to be included in context. Raise to `0.65–0.75` for strict technical matching; lower to `0.40–0.45` for broad exploratory brainstorming. |
| **`topK`** | Global & Tool | `number` | `4` | **Retrieved Chunk Count:** Maximum number of matching snippets returned to Gemini. Increase to `6–8` for multi-source research tasks; keep at `3–4` for low token consumption and fast responses. |
| **`embeddingModel`** | Global | `string` | `'text-embedding-004'` | **Vector Embedding Model:** Google Gemini text embedding model (768 dimensions) producing high-density semantic vectors. |

### 4.2 TypeScript Type Definitions (`packages/core/src/types/ai.ts`)

```ts
export interface GlobalRAGConfig {
  /** Enable or disable automatic RAG indexing globally. Defaults to true. */
  enabled?: boolean;
  /** Embedding model identifier. Defaults to 'text-embedding-004'. */
  embeddingModel?: string;
  /** Default character budget per chunk. Defaults to 1500 (~375-500 tokens). */
  maxChunkSize?: number;
  /** Default character overlap between chunks. Defaults to 150. */
  chunkOverlap?: number;
  /** Default minimum cosine similarity score threshold (0.0 to 1.0). Defaults to 0.5. */
  minScore?: number;
  /** Default number of top snippets to retrieve. Defaults to 4. */
  topK?: number;
}

export interface CollectionRAGConfig {
  /** Enable or disable RAG indexing for this collection. Defaults to true. */
  enabled?: boolean;
  /** Whitelist of specific field names to index. Defaults to all text/richText fields. */
  fields?: string[];
  /** Field to use for citation display titles (e.g. 'name', 'title', 'sku'). */
  titleField?: string;
  /** Custom character budget per chunk for this collection. */
  maxChunkSize?: number;
  /** Custom character overlap between chunks for this collection. */
  chunkOverlap?: number;
}
```

### 4.3 Global Configuration Example (`ai.rag`)

```ts
// dyrected.config.ts
import { defineConfig } from '@dyrected/core';
import { z } from 'zod';

export default defineConfig({
  ai: {
    model: 'gemini-2.5-flash',
    maxSteps: 5,
    rag: {
      enabled: true,
      embeddingModel: 'text-embedding-004',
      maxChunkSize: 1500,
      chunkOverlap: 150,
      minScore: 0.5,
      topK: 4,
    },
  },
});
```

### 4.4 Per-Collection RAG Overrides Example

```ts
export default defineConfig({
  collections: [
    // 1. Standard Content (Uses smart defaults automatically)
    {
      slug: 'articles',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richText' },
      ],
    },

    // 2. Explicit Opt-Out (Never index sensitive audit trails or logs)
    {
      slug: 'audit-logs',
      ai: {
        rag: { enabled: false },
      },
      fields: [...],
    },

    // 3. Fine-Tuned Domain Collection (Custom fields, chunk size, and title citation)
    {
      slug: 'faq',
      ai: {
        rag: {
          enabled: true,
          fields: ['question', 'answer'], // Only index these specific fields
          titleField: 'question',         // Use question as citation title
          maxChunkSize: 800,              // Smaller chunks for targeted Q&As
          chunkOverlap: 50,
        },
      },
      fields: [...],
    },
  ],
});
```

---

## 5. Domain Customization Case Study: Print Shop & Pricing Intelligence

If a developer uses Dyrected to power a **Print Shop OS / Commercial Printing Platform**, they can customize specific RAG parameters and register domain tools to make the AI Assistant an expert on print materials, machine constraints, finishing options, and pricing formulas.

### 5.1 What Parameters a Print Shop Developer Would Modify

| Parameter | Print Shop Value | Rationale |
| :--- | :--- | :--- |
| `maxChunkSize` | `600–800 chars` | Material spec sheets and finish rules are dense and structured. Smaller chunks prevent mixing paper weights (e.g. 100lb gloss vs 80lb text) within a single chunk. |
| `chunkOverlap` | `50 chars` (or `0`) | Spec tables and pricing tier rows are discrete units; large overlap causes duplicate numbers in retrieval context. |
| `fields` | `['name', 'specifications', 'turnaroundTime', 'bulkDiscounts']` | Targets actionable pricing criteria and machine tolerances instead of boilerplate text. |
| `minScore` | `0.65` | Higher precision threshold to ensure exact match on substrate types and finishing combinations. |
| `titleField` | `'productName'` or `'materialCode'` | Citations show exact product codes (e.g. `[16pt Silk Matte Cardstock]`). |

### 5.2 Complete Print Shop Config Example with RAG + Custom Tool

```ts
// apps/print-shop/dyrected.config.ts
import { defineConfig } from '@dyrected/core';
import { z } from 'zod';

export default defineConfig({
  collections: [
    // Paper Substrates & Materials Catalog
    {
      slug: 'materials',
      labels: { singular: 'Material', plural: 'Materials' },
      ai: {
        rag: {
          enabled: true,
          fields: ['name', 'description', 'specifications', 'recommendedUses'],
          titleField: 'name',
          maxChunkSize: 700,
          chunkOverlap: 50,
        },
      },
      fields: [
        { name: 'name', type: 'text', required: true }, // e.g. "100lb Gloss Book with Aqueous Coating"
        { name: 'materialCode', type: 'text', required: true }, // e.g. "MAT-100GB-AQ"
        { name: 'specifications', type: 'textarea' }, // Caliper, opacity, GSM, grain direction
        { name: 'recommendedUses', type: 'richText' }, // Brochures, flyers, catalogs
      ],
    },

    // Finishing Options & Bindery Rules
    {
      slug: 'finishing-options',
      ai: {
        rag: {
          enabled: true,
          fields: ['name', 'compatibilityNotes', 'turnaroundImpact'],
          titleField: 'name',
        },
      },
      fields: [
        { name: 'name', type: 'text' }, // e.g. "Soft-Touch Lamination + Spot UV"
        { name: 'compatibilityNotes', type: 'textarea' }, // Requires min 14pt cover stock
        { name: 'turnaroundImpact', type: 'text' }, // Adds 2 business days
      ],
    },
  ],

  ai: {
    model: 'gemini-2.5-flash',
    maxSteps: 6,
    rag: {
      enabled: true,
      minScore: 0.6,
      topK: 4,
    },
    // Domain Custom Tools complementing RAG retrieval
    tools: {
      calculatePrintQuote: {
        description: 'Calculate live wholesale price for print runs based on quantity, substrate, and finishing',
        parameters: z.object({
          materialCode: z.string().describe('Material code identifier (e.g. MAT-100GB-AQ)'),
          quantity: z.number().min(50).describe('Total piece count'),
          finishing: z.array(z.string()).optional().describe('Applied finishes (e.g. ["spot-uv", "die-cut"])'),
        }),
        execute: async ({ materialCode, quantity, finishing }, { db }) => {
          // Queries structured pricing formula while RAG retrieves material advice
          const baseRate = quantity > 1000 ? 0.08 : 0.14;
          const finishCost = (finishing?.length || 0) * 0.03 * quantity;
          const subtotal = Number((quantity * baseRate + finishCost).toFixed(2));
          return {
            materialCode,
            quantity,
            finishing: finishing || [],
            unitPrice: Number((subtotal / quantity).toFixed(4)),
            subtotal,
            estimatedShipDays: 3 + (finishing?.length ? 2 : 0),
          };
        },
      },
    },
  },
});
```

---

## 6. Chunking & Normalization Engine

### 6.1 Content Normalization
Different Dyrected fields store unstructured data differently:
* **`text` / `textarea`**: Cleaned of leading/trailing whitespace.
* **`richText` / Blocks**: Normalized from Lexical, Slate, TipTap, or Block representations into clean, readable Markdown headings, bullet points, and code blocks before chunking.
* **`json` / Key-Value**: Stringified into structured descriptive text.

```ts
// packages/core/src/services/rag/normalizer.ts
export function normalizeFieldValue(value: unknown, fieldType: string): string {
  if (!value) return '';
  if (typeof value === 'string') {
    // Strip script tags / raw noisy HTML if present, keep standard Markdown
    return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
  }
  if (typeof value === 'object') {
    // Lexical / Slate AST block parser -> Markdown
    return extractTextFromBlocks(value);
  }
  return String(value);
}
```

### 6.2 Recursive Character Chunker

```ts
// packages/core/src/services/rag/chunker.ts
export interface ChunkOptions {
  maxChunkSize?: number; // Target characters (default: 1500 ~ 375-500 tokens)
  chunkOverlap?: number; // Overlap characters (default: 150)
  separators?: string[]; // Split hierarchy
}

export function chunkText(
  text: string,
  options: ChunkOptions = {}
): Array<{ text: string; tokenCount: number; index: number }> {
  const {
    maxChunkSize = 1500,
    chunkOverlap = 150,
    separators = ['\n## ', '\n### ', '\n\n', '\n', '. ', ' ', ''],
  } = options;

  if (!text || text.trim().length === 0) return [];
  if (text.length <= maxChunkSize) {
    return [{ text: text.trim(), tokenCount: Math.ceil(text.length / 4), index: 0 }];
  }

  const rawChunks = splitRecursively(text, maxChunkSize, chunkOverlap, separators);
  return rawChunks.map((chunk, index) => ({
    text: chunk.trim(),
    tokenCount: Math.ceil(chunk.length / 4),
    index,
  }));
}
```

---

## 7. Embedding Pipeline & Vector Storage

### 7.1 Embedding Generation via `@ai-sdk/google`

Embeddings use Google's `text-embedding-004` through Vercel AI SDK:

```ts
// packages/core/src/services/rag/embedding.service.ts
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';

export class EmbeddingService {
  private googleProvider: any;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is required for embedding generation.');
    }
    this.googleProvider = createGoogleGenerativeAI({ apiKey: key });
  }

  async embedText(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.googleProvider.textEmbeddingModel('text-embedding-004'),
      value: text,
    });
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const { embeddings } = await embedMany({
      model: this.googleProvider.textEmbeddingModel('text-embedding-004'),
      values: texts,
    });
    return embeddings;
  }
}
```

### 7.2 Cosine Similarity Computation

```ts
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

---

## 8. Document Indexing Lifecycle & Hooks

### 8.1 Real-Time Lifecycle Sync
When documents are created, updated, or deleted via the Dyrected API or Admin UI:

1. **`afterChange`**:
   - Extract configured RAG fields.
   - For each field, compute SHA-256 content hash.
   - If hash matches existing chunks in `_dyrected_ai_chunks`, skip re-embedding.
   - If modified, remove old chunks for `(documentId, field)` and insert newly embedded chunks.
2. **`afterDelete`**:
   - Delete all chunks matching `documentId`.

### 8.2 Bulk Re-indexing Endpoints & CLI
* **API:** `POST /api/ai/rag/reindex` (Requires Admin authentication)
  - Body: `{ "collection"?: "materials", "force"?: false }`
* **CLI:** `pnpm dyrected ai:reindex --project=default`

### 8.3 Admin UI "Sync Knowledge" Trigger Button
* **Location:** Embedded in the AI Assistant Chat Drawer header (as a quick-action icon) and inside Collection Settings views (`/admin/collections/:slug`).
* **Interaction:**
  - Clicking **"Re-index Knowledge"** triggers `POST /api/ai/rag/reindex`.
  - Shows a non-blocking toast progress notification (`Syncing vectors for articles...`) with total chunks indexed upon completion.
  - Automatically disabled for non-admin users based on access control.

---

## 9. Built-in Agent Retrieval Tool: `searchContent`

Day 3 introduces the native semantic search tool into the AIAgent tool registry.

### 9.1 Tool Definition Contract

```ts
// packages/core/src/services/ai-tools.ts
searchContent: tool({
  description:
    'Semantically search unstructured Dyrected CMS content (articles, documentation, FAQs, material specifications, guidelines, policies) for relevant context, facts, and answers.',
  parameters: z.object({
    query: z.string().describe('The natural language semantic search query or topic to look up'),
    collections: z
      .array(z.string())
      .optional()
      .describe('Optional collection slugs to filter by (e.g. ["materials", "finishing-options"])'),
    limit: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .default(4)
      .describe('Number of top relevant snippets to return'),
    minScore: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.5)
      .describe('Minimum similarity score threshold (0.0 to 1.0)'),
  }),
  execute: async ({ query, collections, limit = 4, minScore = 0.5 }) => {
    return ragService.search({
      query,
      projectId,
      collections,
      limit,
      minScore,
      user,
    });
  },
})
```

### 9.2 Tool Return Payload

```json
{
  "query": "heavyweight paper for presentation folders",
  "resultsCount": 2,
  "sources": [
    {
      "id": "chunk_mat_301_specifications_0",
      "collection": "materials",
      "documentId": "mat_301",
      "title": "16pt Premium Silk Cardstock",
      "field": "specifications",
      "score": 0.884,
      "text": "16pt Silk Cover (350 GSM) provides high rigidity and durability. Ideal for pocket presentation folders, luxury packaging, and heavy business cards.",
      "url": "/admin/collections/materials/mat_301"
    },
    {
      "id": "chunk_fin_102_compatibilityNotes_0",
      "collection": "finishing-options",
      "documentId": "fin_102",
      "title": "Die-Cut Pocket Insertion",
      "field": "compatibilityNotes",
      "score": 0.812,
      "text": "Folder die-cutting requires a minimum 14pt substrate to prevent pocket tear under standard document load.",
      "url": "/admin/collections/finishing-options/fin_102"
    }
  ]
}
```

---

## 10. Grounded Citations & System Prompt Calibration

The system prompt is updated on Day 3 with strict citation and grounding rules to guarantee factual answers with traceable links.

### 10.1 System Prompt RAG Directives

```markdown
### 8. SEMANTIC SEARCH & GROUNDED CITATIONS
When answering questions about policies, product details, material specifications, articles, or documentation:
1. **Search First:** Use the \`searchContent\` tool to locate verified project material before answering.
2. **Grounding:** Base your answers strictly on the retrieved source snippets. Do not extrapolate or invent facts not present in the sources.
3. **Citing Sources:** Every factual claim derived from \`searchContent\` must cite its source. At the end of your response, output a clean Sources section in this format:

### Sources:
- **[Document Title]** (/admin/collections/{collection}/{documentId})
- **[Document Title 2]** (/admin/collections/{collection}/{documentId2})

4. **Missing Information:** If the retrieved search content does not contain the answer, explicitly state: *"I searched our project content for '{query}', but could not find information regarding that topic."*
```

---

## 11. Frontend Source Chips & UI Integration (`ai-elements`)

The frontend chat drawer renders retrieved source references dynamically using `ai-elements`:

### 11.1 Visual Citation Chips in Chat Responses
* When `searchContent` executes, the UI displays a badge: `Searching materials & specs for "heavyweight cardstock"...`
* When results return, expandable **Source Cards** appear above or below the message response with:
  - Document Title & Collection Tag (`[Materials] 16pt Premium Silk Cardstock`)
  - Match confidence percentage (`88% match`)
  - Text snippet preview on hover
  - Direct clickable link to view/edit the document in the Dyrected Admin panel (`/admin/collections/materials/:id`).

---

## 12. Security, Permissions & Tenant Scoping

1. **Strict Project Scoping:**
   - Every chunk query unconditionally filters by `where: { projectId }`. Cross-tenant retrieval is strictly impossible.
2. **Role-Based Collection Access Filtering:**
   - Before returning chunks from `searchContent`, the RAG service verifies that the authenticated user has `read` permission on each candidate collection via `isAccessAllowed(config, col.access?.read, ...)`.
   - Chunks from collections the user cannot access are silently filtered out.
3. **Internal Data Exclusion:**
   - Internal auth tables (`_dyrected_users`, passwords, API keys, `_dyrected_ai_*`) are excluded from RAG indexing.

---

## 13. Day 3 Scope Boundaries

### ✅ What Day 3 INCLUDES

1. **Internal Vector Collection:** `_dyrected_ai_chunks` stored in active database adapter.
2. **Google Embedding Integration:** `text-embedding-004` (768 dimensions) via `@ai-sdk/google`.
3. **Automatic Ingestion Pipeline:** Opt-out automatic indexing for text/richText fields.
4. **SHA-256 Content Hash Caching:** Avoids duplicate embedding API calls.
5. **Content Normalizer & Recursive Chunker:** Markdown/text normalization and recursive token chunking.
6. **Lifecycle Indexing:** Real-time `afterChange` and `afterDelete` chunk updates for CMS collections.
7. **Retrieval Tool:** `searchContent` with cosine similarity, similarity threshold, and access checks.
8. **Grounding & Citations:** Formatted source attribution with deep-links in assistant answers.
9. **Reindex API & CLI:** `POST /api/ai/rag/reindex` and `pnpm dyrected ai:reindex`.
10. **Developer Customization API:** Global `ai.rag` options and per-collection RAG overrides.

### ❌ What Day 3 EXCLUDES (Deferred to Future Days)

* ❌ Hybrid BM25 full-text keyword + Vector fusion re-ranking (Day 4/5)
* ❌ Multi-modal image/video vector embedding
* ❌ Multi-agent orchestrator / routing subagents
* ❌ Autonomous write-back / mutation workflows (create/update draft articles via chat)

---

## 14. Day 3 Implementation Checklist

* [ ] **Data Model & Adapters (`packages/core`):**
  * [ ] Add `_dyrected_ai_chunks` schema definition to system collections.
  * [ ] Ensure database adapter initializes chunk table with indexes.
* [ ] **Chunking & Normalization Engine (`packages/core`):**
  * [ ] Create `packages/core/src/services/rag/normalizer.ts` (HTML & Block AST to clean Markdown).
  * [ ] Create `packages/core/src/services/rag/chunker.ts` (Recursive text chunking with overlap).
* [ ] **Embedding Service (`packages/core`):**
  * [ ] Create `packages/core/src/services/rag/embedding.service.ts` using `@ai-sdk/google` (`text-embedding-004`).
  * [ ] Implement cosine similarity and vector math utilities.
* [ ] **RAG Indexing Service & Lifecycle:**
  * [ ] Create `packages/core/src/services/rag/rag.service.ts`.
  * [ ] Implement document chunking, hashing, and batch upsert logic.
  * [ ] Attach indexing triggers to collection mutations (`afterChange`, `afterDelete`).
  * [ ] Implement reindex endpoint `POST /api/ai/rag/reindex`.
* [ ] **Agent Retrieval Tool:**
  * [ ] Add `searchContent` tool to `packages/core/src/services/ai-tools.ts`.
  * [ ] Enforce `projectId` tenant filtering and user collection read permissions.
  * [ ] Update `buildDyrectedSystemPrompt` with citation instructions and format rules.
* [ ] **Frontend Admin UI (`packages/admin`):**
  * [ ] Render source citation chips and match previews in message components.
  * [ ] Link citations to `/admin/collections/:collection/:id`.
* [ ] **Verification & Testing:**
  * [ ] Seed sample articles / materials ("Refund Policy", "16pt Silk Cardstock").
  * [ ] Run `pnpm dyrected ai:reindex` and verify chunks exist in `_dyrected_ai_chunks`.
  * [ ] Ask: *"What do our articles say about refunds?"*
  * [ ] Verify `searchContent` tool triggers.
  * [ ] Verify response quotes the content accurately and lists clickable sources.

---

## 15. Day 3 Acceptance Criteria

1. **Ingestion & Indexing:** Saving or updating any document with text fields automatically normalizes, chunks, embeds, and stores records in `_dyrected_ai_chunks` with full metadata (`projectId`, `collection`, `documentId`, `field`).
2. **Semantic Retrieval:** Asking questions (e.g. *"What do our articles say about refunds?"* or *"What paper weight do we recommend for brochures?"*) triggers the `searchContent` tool, executes vector search, and locates relevant documents even when phrasing differs.
3. **Accurate Grounding & Citations:** The assistant produces an accurate factual summary directly citing the source title and admin link, avoiding hallucinated answers.
4. **Tenant & Permission Isolation:** Chunks from other projects (`projectId`) or restricted collections never leak into search results.
