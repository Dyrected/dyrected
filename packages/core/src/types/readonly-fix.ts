import type { CollectionConfig } from "./index.js"

/**
 * Helper to work around TypeScript readonly inference issues with `const` collection definitions.
 *
 * When using `const Collection = defineCollection({...})`, TypeScript may infer all properties
 * as readonly, which can cause type compatibility issues with the schema type system in complex
 * nested field scenarios. This is a known TypeScript limitation with deep readonly inference.
 *
 * **Note**: The collection works perfectly at runtime. This is purely a type-checking limitation.
 *
 * Use this helper or `satisfies` when you hit type errors:
 *
 * Option 1: Wrap with asCollection (automatic in defineCollection):
 * ```ts
 * const Pages = asCollection(defineCollection({
 *   slug: "pages",
 *   fields: [...]
 * }))
 * ```
 *
 * Option 2: Use `satisfies` pattern:
 * ```ts
 * const Pages = {
 *   slug: "pages",
 *   fields: [...]
 * } satisfies CollectionConfig
 * ```
 *
 * Option 3: Use // @ts-expect-error for readonly inference only:
 * ```ts
 * // @ts-expect-error TypeScript readonly inference limitation with deeply nested fields
 * const Pages = defineCollection({...})
 * ```
 *
 * The collection functions and APIs work correctly despite the type error.
 */
export function asCollection<T extends CollectionConfig<any>>(config: T): T {
  return config
}
