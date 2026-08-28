import type { z } from 'zod';

export interface AIThread {
  id: string;
  projectId: string;
  userId: string;
  title?: string;
  summary?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  [key: string]: unknown;
}

export interface AIMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: any[];
  createdAt: Date | string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DyrectedAIContext {
  project: { name: string; id: string };
  globalPrompt?: string;
  collections: Array<{
    slug: string;
    label?: string;
    prompt?: string;
    fields?: Array<{ name: string; type: string; required?: boolean }>;
  }>;
  globals: Array<{ slug: string; label?: string; prompt?: string }>;
  user: { name?: string; role?: string };
}

export interface AIToolContext {
  db: any;
  user?: any;
  projectId?: string;
  config?: any;
}

export interface AIToolDefinition<TParams = any, TResult = any> {
  description: string;
  inputSchema?: z.ZodType<TParams>;
  parameters?: z.ZodType<TParams>;
  execute: (args: TParams, context: AIToolContext) => Promise<TResult> | TResult;
}

export interface GlobalRAGConfig {
  /** Enable or disable automatic RAG indexing globally. Defaults to true. */
  enabled?: boolean;
  /** Embedding model identifier. Defaults to 'text-embedding-004' (Google) or 'text-embedding-3-small' (OpenAI/AgentRouter). */
  embeddingModel?: string;
  /** Default character budget per chunk. Defaults to 1500 (~375-500 tokens). */
  maxChunkSize?: number;
  /** Default character overlap between chunks. Defaults to 150. */
  chunkOverlap?: number;
  /** Default minimum cosine similarity score threshold (0.0 to 1.0). Defaults to 0.45. */
  minScore?: number;
  /** Default number of top snippets to retrieve. Defaults to 4. */
  topK?: number;
}

export interface CollectionRAGConfig {
  /** Enable or disable RAG indexing for this collection. Defaults to true. */
  enabled?: boolean;
  /** Whitelist of specific field names to index. Defaults to all text/richText/textarea fields. */
  fields?: string[];
  /** Field to use for citation display titles (e.g. 'title', 'name', 'question'). */
  titleField?: string;
  /** Custom character budget per chunk for this collection. */
  maxChunkSize?: number;
  /** Custom character overlap between chunks for this collection. */
  chunkOverlap?: number;
}

export interface AIChunk {
  id: string;
  projectId: string;
  collection: string;
  documentId: string;
  field: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  tokenCount: number;
  contentHash: string;
  metadata?: {
    title?: string;
    slug?: string;
    locale?: string;
    status?: string;
    updatedAt?: Date | string;
    [key: string]: unknown;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
  [key: string]: unknown;
}

export interface RAGSearchResult {
  id: string;
  collection: string;
  documentId: string;
  title: string;
  field: string;
  score: number;
  text: string;
  url: string;
  metadata?: Record<string, unknown>;
}

export interface AIConfig {
  /** AI Provider to use. Defaults to 'google' or auto-detects from environment variables. */
  provider?: 'google' | 'agentrouter' | 'openrouter' | 'openai' | 'custom';
  /** Custom base URL for OpenAI-compatible gateways (e.g. https://agentrouter.org/v1). */
  baseURL?: string;
  /** Optional custom API key (or read from environment variables). */
  apiKey?: string;
  /** Global system prompt / brand persona instructions for the project. */
  systemPrompt?: string;
  /** Model to use for AI assistant. Defaults to 'gemini-2.0-flash' for Google or 'claude-3-haiku-20240307' for AgentRouter. */
  model?: string;
  /** Fallback model to use if primary model hits rate limits. */
  fallbackModel?: string;
  /** Maximum number of sequential tool execution steps per user message. Defaults to 5. */
  maxSteps?: number;
  /** Number of automatic retry attempts on transient rate limits / network errors. Defaults to 3. */
  maxRetries?: number;
  /** Global RAG (Retrieval-Augmented Generation) configuration options. */
  rag?: GlobalRAGConfig;
  /** Conversation compaction options. */
  compaction?: {
    enabled?: boolean;
    maxMessages?: number;
    recentMessagesCount?: number;
  };
  /** Custom developer-defined tools. */
  tools?: Record<string, AIToolDefinition>;
}

export interface CollectionSummaryResult {
  slug: string;
  label: string;
  auth: boolean;
  timestamps: boolean;
}

export interface CollectionSchemaResult {
  slug: string;
  label: string;
  auth: boolean;
  fields: Array<{
    name: string;
    type: string;
    label?: string;
    required: boolean;
    unique: boolean;
    relationTo?: string;
    options?: any;
  }>;
}

export interface GlobalSummaryResult {
  slug: string;
  label: string;
}

export interface GlobalSchemaResult {
  slug: string;
  label: string;
  fields: Array<{
    name: string;
    type: string;
    label?: string;
    required: boolean;
  }>;
  data: Record<string, unknown> | null;
}

export interface QueryCollectionResult {
  collection: string;
  docs: Array<Record<string, unknown>>;
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface GetDocumentResult {
  collection: string;
  doc: Record<string, unknown>;
}

export interface AggregateCollectionResult {
  collection: string;
  result: Record<string, unknown>;
}

export type AIActionType = 'createDocument' | 'updateDocument' | 'deleteDocument' | 'updateGlobal';
export type AIActionStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';

export interface AIAction {
  id: string;
  projectId: string;
  threadId?: string;
  userId?: string;
  type: AIActionType;
  targetCollection?: string;
  targetGlobal?: string;
  documentId?: string;
  summary: string;
  beforeSnapshot?: Record<string, unknown> | null;
  proposedData: Record<string, unknown>;
  status: AIActionStatus;
  errorMessage?: string;
  expiresAt: Date | string;
  createdAt: Date | string;
  executedAt?: Date | string;
  [key: string]: unknown;
}

export interface AIAuditRecord {
  id: string;
  projectId: string;
  actionId: string;
  executedBy?: string;
  actionType: AIActionType;
  target: string;
  snapshotBefore?: Record<string, unknown> | null;
  snapshotAfter?: Record<string, unknown> | null;
  rollbackPayload?: Record<string, unknown> | null;
  createdAt: Date | string;
  [key: string]: unknown;
}

export const AI_THREADS_COLLECTION = '_dyrected_ai_threads';
export const AI_MESSAGES_COLLECTION = '_dyrected_ai_messages';
export const AI_CHUNKS_COLLECTION = '_dyrected_ai_chunks';
export const AI_ACTIONS_COLLECTION = '_dyrected_ai_actions';
export const AI_AUDIT_COLLECTION = '_dyrected_ai_audit';

export function isAICollection(slug: string): boolean {
  return (
    slug === AI_THREADS_COLLECTION ||
    slug === AI_MESSAGES_COLLECTION ||
    slug === AI_CHUNKS_COLLECTION ||
    slug === AI_ACTIONS_COLLECTION ||
    slug === AI_AUDIT_COLLECTION
  );
}