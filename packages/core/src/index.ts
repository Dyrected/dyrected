import type { CollectionConfig, DyrectedConfig, Field, GlobalConfig, InferDocShape, Prettify, SystemDocFields, AuthDocFields, UploadDocFields } from './types/index.js';

/**
 * Define a collection. When called without an explicit type argument, TypeScript
 * automatically infers the document shape from the `fields` array you provide —
 * no manual interface required:
 *
 * ```ts
 * export const Posts = defineCollection({
 *   slug: 'posts',
 *   fields: [
 *     { name: 'title', type: 'text', required: true },
 *     { name: 'status', type: 'select', options: ['draft', 'published'], required: true },
 *   ],
 *   hooks: {
 *     beforeChange: [({ data }) => {
 *       // data is { title: string; status: 'draft' | 'published' } — fully inferred
 *     }],
 *   },
 * })
 * ```
 *
 * When you need a richer interface (e.g. with methods, JSDoc, or types that
 * can't be derived from fields), pass it explicitly:
 *
 * ```ts
 * interface Post { id: string; title: string; status: 'draft' | 'published' }
 *
 * export const Posts = defineCollection<Post>({ ... })
 * ```
 */
// Overload 1: auth collection — infer fields + add system + auth fields
export function defineCollection<const TFields extends Field[]>(
  config: Omit<CollectionConfig<Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields & AuthDocFields>>, 'fields' | 'auth'> & { fields: TFields; auth: true },
): CollectionConfig<Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields & AuthDocFields>>;
// Overload 2: upload/media collection — infer fields + add system + upload fields
export function defineCollection<const TFields extends Field[]>(
  config: Omit<CollectionConfig<Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields & UploadDocFields>>, 'fields' | 'upload'> & { fields: TFields; upload: true },
): CollectionConfig<Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields & UploadDocFields>>;
// Overload 3: base collection — infer fields + add system fields
export function defineCollection<const TFields extends Field[]>(
  config: Omit<CollectionConfig<Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields>>, 'fields'> & { fields: TFields },
): CollectionConfig<Prettify<{ id: string } & InferDocShape<TFields> & SystemDocFields>>;
// Overload 4: explicit TDoc
export function defineCollection<TDoc extends object>(
  config: CollectionConfig<TDoc>,
): CollectionConfig<TDoc>;
// Implementation
export function defineCollection(config: unknown): unknown {
  return config;
}

/**
 * Define a global (singleton document). TypeScript automatically infers the
 * document shape from the `fields` array, or you can pass an explicit type:
 *
 * ```ts
 * // Inferred — no interface needed
 * export const Settings = defineGlobal({
 *   slug: 'site-settings',
 *   fields: [
 *     { name: 'siteName', type: 'text', required: true },
 *     { name: 'maintenanceMode', type: 'boolean' },
 *   ],
 *   hooks: {
 *     afterChange: [({ doc }) => {
 *       // doc.siteName is string, doc.maintenanceMode is boolean | undefined
 *       if (doc.maintenanceMode) alertOnCall()
 *     }],
 *   },
 * })
 *
 * // Explicit type
 * interface SiteSettings { siteName: string; maintenanceMode?: boolean }
 * export const Settings = defineGlobal<SiteSettings>({ ... })
 * ```
 */
// Overload 1: no explicit TDoc — infer from fields
export function defineGlobal<const TFields extends Field[]>(
  config: Omit<GlobalConfig<Prettify<InferDocShape<TFields>>>, 'fields'> & { fields: TFields },
): GlobalConfig<Prettify<InferDocShape<TFields>>>;
// Overload 2: explicit TDoc
export function defineGlobal<TDoc extends object>(
  config: GlobalConfig<TDoc>,
): GlobalConfig<TDoc>;
// Implementation
export function defineGlobal(config: unknown): unknown {
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
