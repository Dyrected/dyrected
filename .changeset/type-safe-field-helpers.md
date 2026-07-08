---
"@dyrected/core": patch
"@dyrected/admin": patch
"dyrected": patch
"@dyrected/nuxt": patch
"@dyrected/knowledge": patch
---

Add type-safe field builder helpers and related updates.

- Add `defineField`, `defineBlock`, and a dedicated `define<Type>Field` helper for every field type (`defineTextField`, `defineRichTextField`, `defineRelationshipField`, …) to `@dyrected/core`. Each is an identity helper that injects the field `type` and preserves full document-shape inference through `defineCollection`/`defineGlobal`.
- Add configurable `features` and `headingLevels` to rich-text fields. The Admin rich-text editor now enables only the configured toolbar controls and editor capabilities (disabling a feature also removes its keyboard shortcut and paste handling).
- Migrate documentation examples, the `dyrected init` scaffold, and the `@dyrected/knowledge` recipes and prompt templates to use the new `define*Field` helpers.
- Rename the `JWT_SECRET` environment variable to `DYRECTED_JWT_SECRET` — update your `.env` accordingly.
- Filter unpublished documents out of public read responses.
