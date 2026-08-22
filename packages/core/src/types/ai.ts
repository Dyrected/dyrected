export interface AIThread {
  id: string;
  projectId: string;
  userId: string;
  title?: string;
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
  collections: Array<{
    slug: string;
    label?: string;
    fields?: Array<{ name: string; type: string; required?: boolean }>;
  }>;
  globals: Array<{ slug: string; label?: string }>;
  user: { name?: string; role?: string };
}

export const AI_THREADS_COLLECTION = '_dyrected_ai_threads';
export const AI_MESSAGES_COLLECTION = '_dyrected_ai_messages';

export function isAICollection(slug: string): boolean {
  return slug === AI_THREADS_COLLECTION || slug === AI_MESSAGES_COLLECTION;
}