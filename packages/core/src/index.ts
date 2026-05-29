import type { CollectionConfig, DyrectedConfig, GlobalConfig } from './types/index.js';

/**
 * Define a collection with an optional document type for fully-typed hooks.
 *
 * Pass your document's TypeScript interface as `TDoc` to get type-checked
 * `data`, `doc`, and `previousDoc` inside every hook:
 *
 * ```ts
 * interface Post {
 *   id: string
 *   title: string
 *   slug: string
 *   status: 'draft' | 'published'
 * }
 *
 * export const Posts = defineCollection<Post>({
 *   slug: 'posts',
 *   hooks: {
 *     beforeChange: [({ data, operation }) => {
 *       // data is Partial<Post> — full autocomplete and type checking
 *       if (operation === 'create') return { ...data, status: 'draft' }
 *       return data
 *     }],
 *     afterChange: [({ doc, previousDoc }) => {
 *       // doc and previousDoc are Post
 *       if (doc.status !== previousDoc?.status) notifySubscribers(doc)
 *     }],
 *   },
 *   fields: [...],
 * })
 * ```
 *
 * Omit `TDoc` to use the untyped default (`Record<string, unknown>`), which
 * is backwards-compatible with all existing code.
 */
export function defineCollection<
  TDoc extends Record<string, unknown> = Record<string, unknown>,
>(config: CollectionConfig<TDoc>): CollectionConfig<TDoc> {
  return config;
}

/**
 * Define a global (singleton document) with an optional document type for
 * fully-typed hooks.
 *
 * ```ts
 * interface SiteSettings {
 *   siteName: string
 *   tagline: string
 *   maintenanceMode: boolean
 * }
 *
 * export const Settings = defineGlobal<SiteSettings>({
 *   slug: 'site-settings',
 *   hooks: {
 *     afterChange: [({ doc }) => {
 *       // doc is SiteSettings
 *       if (doc.maintenanceMode) alertOnCall()
 *     }],
 *   },
 *   fields: [...],
 * })
 * ```
 */
export function defineGlobal<
  TDoc extends Record<string, unknown> = Record<string, unknown>,
>(config: GlobalConfig<TDoc>): GlobalConfig<TDoc> {
  return config;
}

/**
 * Define the root Dyrected configuration.
 *
 * This is the single object passed to `createDyrectedApp`. It wires together
 * the database adapter, collections, globals, storage, email, and all other
 * server-level configuration.
 */
export function defineConfig(config: DyrectedConfig): DyrectedConfig {
  return config;
}

export * from './types/index.js';
export * from './utils/setup-prompt.js';
export * from './utils/config.js';
export * from './utils/parse-where.js';
export * from './utils/hooks.js';
export * from './app.js';
