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

export const AI_THREADS_COLLECTION = '_dyrected_ai_threads';
export const AI_MESSAGES_COLLECTION = '_dyrected_ai_messages';

export function isAICollection(slug: string): boolean {
  return slug === AI_THREADS_COLLECTION || slug === AI_MESSAGES_COLLECTION;
}