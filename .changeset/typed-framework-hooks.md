---
"@dyrected/sdk": patch
"@dyrected/react": patch
"@dyrected/vue": patch
"dyrected": patch
---

Type the SDK client and framework hooks against your generated schema automatically

Previously the framework hooks were loosely typed: React's client came through context as `DyrectedClient<BaseSchema>`, and the Vue composables took an untyped `collection: string` with a hand-annotated `<T = any>` result. You got no slug autocomplete and no document types unless you passed a generic at every call site.

Now `dyrected generate:types` emits a module augmentation that registers your schema globally:

```ts
// dyrected-types.ts (generated)
declare module "@dyrected/sdk" {
  interface Register { schema: DyrectedSchema }
}
```

Once that generated file is part of your compilation, the SDK client and every framework hook (React, Vue, and Nuxt via auto-import) are typed against your schema with **no per-call generics**:

```ts
// Vue
const { docs } = useDyrectedCollection("posts") // "posts" autocompleted, docs: Post[]

// React
const { client } = useDyrected()
const { docs } = await client.collection("posts").find().exec() // typed
```

The mechanism is a new `Register` seam in `@dyrected/sdk`; `DyrectedClient` and `createClient` now default their schema type parameter to the registered schema, falling back to `BaseSchema` until the generated types are present. Existing code that passed an explicit schema generic is unchanged.

Note for Vue: `useDyrected`, `useDyrectedCollection`, and `useDyrectedGlobal` now take a collection/global slug as their first type parameter. To override the inferred document type, pass both — `useDyrectedCollection<"posts", CustomPost>("posts")`.

**Generated types now land in your app's source directory.** `generate:types` (and `sync:schema`) write `dyrected-types.ts` into `src/` (Vite/Next) or `app/` (Nuxt) instead of the project root. This is required for the schema augmentation to take effect: TypeScript only applies a `declare module` augmentation when the file is inside the program's `include` globs, and a `dyrected-types.ts` at a Nuxt project root is silently ignored. Your `dyrected.config.ts` stays at the project root. Pass `--output` to override the location.

**Generator correctness fixes:**

- Auth collections no longer emit a duplicate `roles` property. When your collection declares its own `roles` field (e.g. a `select`/`radio` with options), that definition wins — you get the enum union `"admin" | "editor" | "viewer"` instead of a conflicting second `roles?: string[]` declaration (which was a TypeScript error).
- `multiSelect` fields now generate an array of the option literals — `("admin" | "editor")[]` — instead of a loose `string[]`, so multi-valued fields like `roles` stay typed as their allowed values.
- The SDK's schema-generic constraint was loosened to a `SchemaShape` bound so a generated `DyrectedSchema` (built from named `interface`s, which lack an implicit index signature) satisfies it. Previously the augmentation silently fell back to `BaseSchema`.

The Nuxt composables (`useDyrectedDoc`, `useDyrectedCollection`, `useDyrectedGlobal`) now return a properly typed `AsyncData<...>` instead of `any` — their `data` is typed as your document/global shape — and are constrained to your schema's slugs.
