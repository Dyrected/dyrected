/**
 * Example: Using typed field builders with slug inference
 *
 * This example demonstrates how to use relationship, image, and join fields
 * with automatic type checking against your collection configuration.
 */

import {
  defineCollection,
  defineRelationshipField,
  defineImageField,
  defineJoinField,
  ExtractCollectionSlugs,
} from "../index.js";

// Define your collections
const User = defineCollection({
  slug: "users",
  labels: { singular: "User", plural: "Users" },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "email", type: "email", required: true },
  ],
});

const Post = defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    { name: "title", type: "text", required: true },
    // This would previously accept any string for relationTo, causing typos:
    // { name: "author", type: "relationship", relationTo: "usrs" } ❌ Typo!
    // Now with typed fields:
  ],
});

const Media = defineCollection({
  slug: "media",
  labels: { singular: "Media", plural: "Media" },
  fields: [{ name: "filename", type: "text", required: true }],
});

// Extract all valid collection slugs
type ValidSlugs = ExtractCollectionSlugs<typeof collections>;
// ValidSlugs = "users" | "posts" | "media"

// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-useless-assignment
const collections = [User, Post, Media];

// ============================================================================
// EXAMPLE 1: Typed Relationship Field
// ============================================================================

const postFields = [
  {
    name: "title",
    type: "text" as const,
    required: true,
  },
  // ✅ VALID: 'users' is a real collection
  defineRelationshipField<ValidSlugs>({
    name: "author",
    relationTo: "users", // TypeScript validates this!
    hasMany: false,
  }),
  // ❌ INVALID: This should produce a TypeScript error
  defineRelationshipField<ValidSlugs>({
    name: "author",
    // @ts-expect-error 'usrs' is a typo and not a valid collection slug
    relationTo: "usrs", // TypeScript Error: 'usrs' is not in ValidSlugs
    hasMany: false,
  }),
];

// ============================================================================
// EXAMPLE 2: Typed Image Field
// ============================================================================

const mediaFields = [
  {
    name: "filename",
    type: "text" as const,
    required: true,
  },
  // ✅ VALID: 'media' is a real collection
  defineImageField<ValidSlugs>({
    name: "thumbnail",
    relationTo: "media", // Type-checked!
    hasMany: false,
  }),
];

// ============================================================================
// EXAMPLE 3: Typed Join Field
// ============================================================================

const commentFields = [
  {
    name: "text",
    type: "text" as const,
    required: true,
  },
  // ✅ VALID: 'posts' is a real collection, 'comments' is the back-reference field
  defineJoinField<ValidSlugs>({
    name: "post_comments",
    collection: "posts", // Type-checked!
    on: "comments", // Back-reference field name (not type-checked)
  }),
];

// ============================================================================
// BENEFITS
// ============================================================================

/**
 * Benefits of using typed field builders:
 *
 * 1. **Compile-time validation**: Typos in collection names are caught before runtime
 * 2. **IDE autocomplete**: Get suggestions for valid collection slugs
 * 3. **Refactoring safety**: Rename a collection slug and TypeScript highlights all usages
 * 4. **No runtime cost**: Types are erased at compile time - no performance impact
 *
 * BEFORE (Old way - prone to errors):
 * ```ts
 * {
 *   name: "author",
 *   type: "relationship",
 *   relationTo: "usrs",  // ❌ Typo! Won't be caught until runtime
 * }
 * ```
 *
 * AFTER (New way - type-safe):
 * ```ts
 * defineRelationshipField<ValidSlugs>({
 *   name: "author",
 *   relationTo: "usrs",  // ✅ TypeScript Error: 'usrs' not in ValidSlugs
 * })
 * ```
 */

export { postFields, mediaFields, commentFields, ValidSlugs };
