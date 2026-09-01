# Dyrected AI Rules

This file combines one shared integration contract, focused implementation
rules, generated package facts, and behavior-tested recipes.

## Existing Project Integration Contract

<!-- GENERATED:INTEGRATION_CONTRACT:START -->
<!-- GENERATED:INTEGRATION_CONTRACT:END -->

## Core Architecture & Modeling Invariants

1. **Marketing Site Default: Page Builder Architecture**
   - When modeling marketing websites or content-driven applications, **always default to a `Pages` collection with an ordered `blocks` field** (`defineBlocksField({ name: "layout", blocks: [...] })`) rather than hardcoding section layouts in `page.tsx` or `pages/[slug].vue`.
   - Define a cohesive block registry (`Hero`, `TwoColumnFeature`, `CardGrid`, `PricingTierGrid`, `Timeline`, `FinalCTA`, etc.) in `dyrected.config.ts`.
   - Routes must query `getPageByPath(pathname, fallbackData)` or `client.collection('pages').findBySlug(slug)` and render through `<Blocks items={page.layout} path="layout" />` with `useDyPath` click-to-edit support.
   - 100% preserve existing design, typography, spacing, and responsive styling.

2. **Array Field Object Shape Contract (Crucial)**
   - In Dyrected, `defineArrayField({ name: "checklist", fields: [defineTextField({ name: "item" })] })` **ALWAYS produces and expects an array of objects**, e.g.:
     ```ts
     checklist: [{ item: "First point" }, { item: "Second point" }]
     ```
   - **Never pass primitive arrays** (e.g. `checklist: ["First point", "Second point"]`) in fallback data, seed scripts, or SDK mutations, as CMS schema validation will drop them.
   - In frontend components, always defensively normalize items: `const text = typeof item === 'string' ? item : item?.item || item?.text || '';`.

3. **Type Safety Workflow**
   - Immediately after creating or updating `dyrected.config.ts`, always run:
     ```bash
     npx dyrected generate:types
     ```
   - Import generated interfaces into seed scripts, page components, and block definitions to catch schema mismatches at compile time.

## API and Security Invariants

- Import public APIs from `@dyrected/core`, `@dyrected/sdk`, and the documented
  framework package. Never import another workspace package's source files.
- Keep server and browser package entry points separate. Do not import a
  framework package entry that exports server handlers inside Client
  Components; use the browser-safe React/Vue live-preview helpers there.
- Verify the installed package's public exports before writing configuration.
- Every named field has an explicit human-readable `label`.
- Use the dedicated installed `define[FieldName]Field` helper for each field.
- Use `client.collection('slug')`, never `client.collections`.
- Do not define `email` or `password` fields on an `auth: true` collection.
- Do not wrap Dyrected Admin routes in unsupported custom authentication.
- Use server hooks for correctness. Admin hooks may improve feedback but cannot
  be the only enforcement layer.
- Enforce access and validation on the server. Admin visibility is not
  authorization.
- Use the type-safe `when` condition builder (or serializable Jexl strings) for
  `admin.condition`, `admin.previewUrl`, `access.*`, and `admin.hooks.onChange`.
- Keep API keys, database credentials, encryption keys, and storage credentials
  out of browser code.
- Use `relationship` for a stored owning reference and `join` for a virtual
  reverse lookup.
- Use `depth: 0` for lightweight lists and increase depth only when the view
  needs populated relationships.
- Use a documented publishing workflow when the requirement is draft, review,
  and publication.

## Rename a field safely

The current `name` is the new key and `renameTo` is the previous stored key:

```ts
defineTextField({
  name: "fullName",
  label: "Full name",
  renameTo: "name",
  defaultValue: "",
});
```

Keep `renameTo` until stored documents have been migrated and verified. Test
relational or promoted-field changes in a safe environment before production
synchronization.

## Content Modeling

<!-- GENERATED:MODELING_RULES:START -->
<!-- GENERATED:MODELING_RULES:END -->

## CMS Configuration and Migration

<!-- GENERATED:CMS_GENERATION_RULES:START -->
<!-- GENERATED:CMS_GENERATION_RULES:END -->

## Frontend Integration

<!-- GENERATED:FRONTEND_RULES:START -->
<!-- GENERATED:FRONTEND_RULES:END -->

## Supported Field Types

<!-- GENERATED:FIELD_TYPES:START -->
<!-- GENERATED:FIELD_TYPES:END -->

## Compiled Recipes

<!-- GENERATED:RECIPES:START -->
<!-- GENERATED:RECIPES:END -->

## Intent-to-Pattern Index

<!-- GENERATED:INTENTS:START -->
<!-- GENERATED:INTENTS:END -->

## Canonical References

<!-- GENERATED:REFERENCES:START -->
<!-- GENERATED:REFERENCES:END -->

## Completion Check

Run generation, schema validation, lint, type checking, focused tests, and the
production build. Confirm generated artifacts are current, stored data remains
compatible, access is server-enforced, and one real edit reaches the intended
frontend route.
