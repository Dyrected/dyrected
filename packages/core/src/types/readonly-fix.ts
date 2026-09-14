import type { CollectionConfig } from "./index.js"

/**
 * Helper to work around TypeScript readonly inference issues with `const` collection definitions.
 *
 * When using `const Collection = defineCollection({...})`, TypeScript infers all properties
 * as readonly, which can cause type compatibility issues with the schema type system.
 *
 * Use this helper to ensure the collection config is properly typed as mutable:
 *
 * ```ts
 * const Pages = asCollection(defineCollection({
 *   slug: "pages",
 *   // ... rest of config
 * }))
 * ```
 *
 * Alternatively, use `satisfies` instead of `const`:
 * ```ts
 * const Pages = {
 *   slug: "pages",
 *   // ... rest of config
 * } satisfies CollectionConfig
 * ```
 */
export function asCollection<T extends CollectionConfig<any>>(config: T): T {
  return config
}
