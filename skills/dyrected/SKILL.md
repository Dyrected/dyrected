---
name: dyrected
description: Work correctly with Dyrected in new and existing projects using installation checks, schema safety rules, and compiled implementation recipes.
---

# Dyrected

Dyrected is a declarative, schema-driven headless CMS configured primarily through `dyrected.config.ts`.

## Step 0 — determine the project state

Before changing code, inspect the nearest `package.json` and the workspace root.

### Dyrected is not installed

Use the CLI:

```bash
npx @dyrected/cli init
```

Detect the framework, package manager, database requirements, storage requirements and deployment target. Let the CLI scaffold configuration, environment variables, Admin integration and AI rules. Verify lint, types and build before modeling content.

For an existing website, first inventory editable content and distinguish repeatable entries from singleton settings. Preserve the existing interface, content, URLs and behavior. Do not invent a new content model merely because it is convenient.

### Dyrected is installed

Read `dyrected.config.ts`, the installed `@dyrected/core` version and its public exports. Inspect the configured database, storage, email, collections, globals, authentication and workflows before proposing changes. Installed types take precedence over remembered APIs or newer documentation.

## Operational rules

1. Use public package imports such as `@dyrected/core` and `@dyrected/sdk`; do not reach into another workspace package's source directory.
2. Every named field must define an explicit `label`.
3. Never invent field types, hook names, configuration keys, adapter methods, SDK methods or REST routes.
4. Use `client.collection('slug')`, never `client.collections`.
5. Do not wrap Dyrected Admin routes in custom auth/session middleware.
6. Do not define `email` or `password` fields on `auth: true` collections; Dyrected injects them.
7. Do not delete or directly rename persisted fields. Use `renameTo`; add a safe `defaultValue` when introducing fields to existing schemas.
8. Use server hooks for data correctness. Admin hooks improve live editor feedback but API writes bypass them.
9. Use serializable Jexl conditions for Cloud-compatible schemas.
10. Enforce permissions in server access configuration, not only by hiding Admin controls.

## Core imports

Import public APIs from package entry points:

```ts
import { defineCollection, defineConfig, defineGlobal } from "@dyrected/core";
import { createClient, type InferSchema } from "@dyrected/sdk";
```

Never import from a monorepo source path such as `packages/core/src`. Verify the installed package exports when documentation and local types disagree.

## Schema and deployment safety

- Read the existing schema before editing it.
- Make related changes in small batches and verify each batch.
- Confirm whether the project is Cloud or self-hosted before giving schema synchronization instructions.
- MongoDB is schema-less; relational adapters may require synchronization for promoted fields.
- Use `relationship` for the owning stored reference and `join` for a virtual reverse lookup.
- Use `depth: 0` for lightweight lists and increase depth only when related documents are required.
- Use hooks for derived values, validation, side effects and revalidation.
- Use `workflow: publishingWorkflow()` when the requirement is draft, review and publication rather than inventing status logic.
- Use `defineGlobal` for singleton settings and `defineCollection` for repeatable entries.

### Rename a field safely

The current `name` is the new key and `renameTo` is the previous stored key:

```ts
{
  name: "fullName",
  type: "text",
  label: "Full name",
  renameTo: "name",
  defaultValue: "",
}
```

Keep the fallback until production documents are migrated and verified. For relational adapters, test promoted or unique changes in staging before synchronization.

### Zero-state behavior

Use `initialData` only when deliberate seed/fallback behavior is desired:

```ts
const { docs } = await client.collection("posts").find({ initialData: [] });
const settings = await client
  .global("site-settings")
  .get({ initialData: { siteName: "My site" } });
```

Do not convert authentication, validation, or network failures into empty successful states.

## Relationships and depth

`relationship` is the stored owning reference. `join` is a virtual reverse lookup.

```ts
{ name: "author", type: "relationship", label: "Author", relationTo: "users" }
{
  name: "posts",
  type: "join",
  label: "Posts",
  collection: "posts",
  on: "author",
  limit: 20,
}
```

Use `depth: 0` for lightweight lists and increase depth only when related values are needed. Bound joins and account for their query cost.

## Auth and access

`auth: true` injects authentication fields and endpoints. Do not redefine `email` or `password`. Treat roles as trusted only when clients cannot assign them to themselves.

```ts
export const Users = defineCollection({
  slug: "users",
  auth: true,
  fields: [
    { name: "name", type: "text", label: "Name" },
    {
      name: "role",
      type: "select",
      label: "Role",
      options: ["member", "editor", "admin"],
    },
  ],
});
```

Grant read, create, update, delete, and workflow capabilities independently. UI visibility is not authorization.

## Uploads

```ts
export const Media = defineCollection({
  slug: "media",
  upload: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxFileSize: 5_000_000,
  },
  fields: [
    { name: "alt", type: "text", label: "Alternative text", required: true },
  ],
});
```

Consume the returned URL, keep provider credentials server-side, and validate untrusted file contents in addition to MIME metadata.

## Dynamic and conditional fields

- Static `options`: fixed choices.
- Server `options` resolver: database access, secrets, user filtering, or caching.
- `admin.hooks.options`: instant browser-only dependent choices.
- `admin.condition`: presentation only; use Jexl strings for Cloud synchronization.

Server validation is still required when a dependent choice or condition is part of the data contract.

## Custom Admin components

Reference custom inputs and slots with registered string keys in serializable configuration. Register the actual framework component in the Admin integration. Keep validation and access in the server field definition.

## Supported field types

<!-- GENERATED:FIELD_TYPES:START -->

<!-- GENERATED:FIELD_TYPES:END -->

## Compiled recipes

These recipes are compiled and behavior-tested. Select them from the user's desired outcome; do not require the user to know Dyrected terminology.

<!-- GENERATED:RECIPES:START -->
- [Generate a slug from a title](https://docs.dyrected.com/docs/recipes/auto-slug) — Generate stable URL slugs on the server while showing editors the value live in the Admin UI.
- [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/recipes/conditional-admin-field) — Use a serializable Admin condition to reveal a field from the editor's current form values.
- [Validate related fields before saving](https://docs.dyrected.com/docs/recipes/cross-field-validation) — Reject invalid combinations of field values before they reach the database.
- [Update a dropdown from another field](https://docs.dyrected.com/docs/recipes/dependent-dropdown) — Change available Admin UI options immediately when an editor changes a related field.
- [Add draft, review, and publishing states](https://docs.dyrected.com/docs/recipes/editorial-publishing-workflow) — Attach Dyrected's standard editorial workflow and its capability-aware transitions to a collection.
- [Limit documents to their owner](https://docs.dyrected.com/docs/recipes/owner-scoped-access) — Return a where constraint from access control so authenticated users only read their own records.
- [Build flexible pages from reusable blocks](https://docs.dyrected.com/docs/recipes/page-builder-blocks) — Define labeled hero, rich-text, and call-to-action blocks for an editor-controlled page layout.
- [Model a relationship and its reverse lookup](https://docs.dyrected.com/docs/recipes/relationship-and-reverse-join) — Store an author relationship on posts and expose the author's posts through a virtual join field.
- [Restrict content operations by user role](https://docs.dyrected.com/docs/recipes/role-based-access) — Allow public reads, editor writes, and administrator deletion with collection access rules.
- [Rename a field without orphaning existing data](https://docs.dyrected.com/docs/recipes/safe-field-rename) — Use renameTo and a safe default while documents migrate lazily to a new field name.
- [Create a media upload collection](https://docs.dyrected.com/docs/recipes/upload-collection) — Enable file uploads and capture accessible metadata in a dedicated media collection.
<!-- GENERATED:RECIPES:END -->

## Intent-to-pattern index

<!-- GENERATED:INTENTS:START -->
- “make the URL follow the title” → [Generate a slug from a title](https://docs.dyrected.com/docs/recipes/auto-slug)
- “automatically generate a slug” → [Generate a slug from a title](https://docs.dyrected.com/docs/recipes/auto-slug)
- “create friendly URLs from titles” → [Generate a slug from a title](https://docs.dyrected.com/docs/recipes/auto-slug)
- “keep a slug synchronized with a title” → [Generate a slug from a title](https://docs.dyrected.com/docs/recipes/auto-slug)
- “show a field conditionally” → [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/recipes/conditional-admin-field)
- “hide irrelevant form fields” → [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/recipes/conditional-admin-field)
- “show discount only with a coupon” → [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/recipes/conditional-admin-field)
- “make the admin form react to another field” → [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/recipes/conditional-admin-field)
- “validate fields before saving” → [Validate related fields before saving](https://docs.dyrected.com/docs/recipes/cross-field-validation)
- “make sure an end date is after the start date” → [Validate related fields before saving](https://docs.dyrected.com/docs/recipes/cross-field-validation)
- “reject invalid form submissions” → [Validate related fields before saving](https://docs.dyrected.com/docs/recipes/cross-field-validation)
- “validate multiple fields together” → [Validate related fields before saving](https://docs.dyrected.com/docs/recipes/cross-field-validation)
- “make one dropdown depend on another” → [Update a dropdown from another field](https://docs.dyrected.com/docs/recipes/dependent-dropdown)
- “show states based on the selected country” → [Update a dropdown from another field](https://docs.dyrected.com/docs/recipes/dependent-dropdown)
- “create a cascading dropdown” → [Update a dropdown from another field](https://docs.dyrected.com/docs/recipes/dependent-dropdown)
- “update select options while editing” → [Update a dropdown from another field](https://docs.dyrected.com/docs/recipes/dependent-dropdown)
- “add draft and publish states” → [Add draft, review, and publishing states](https://docs.dyrected.com/docs/recipes/editorial-publishing-workflow)
- “require review before publishing” → [Add draft, review, and publishing states](https://docs.dyrected.com/docs/recipes/editorial-publishing-workflow)
- “create an editorial workflow” → [Add draft, review, and publishing states](https://docs.dyrected.com/docs/recipes/editorial-publishing-workflow)
- “let editors submit content for approval” → [Add draft, review, and publishing states](https://docs.dyrected.com/docs/recipes/editorial-publishing-workflow)
- “users should only see their own records” → [Limit documents to their owner](https://docs.dyrected.com/docs/recipes/owner-scoped-access)
- “add row level access” → [Limit documents to their owner](https://docs.dyrected.com/docs/recipes/owner-scoped-access)
- “scope documents by owner” → [Limit documents to their owner](https://docs.dyrected.com/docs/recipes/owner-scoped-access)
- “prevent users reading another user's data” → [Limit documents to their owner](https://docs.dyrected.com/docs/recipes/owner-scoped-access)
- “build a page builder” → [Build flexible pages from reusable blocks](https://docs.dyrected.com/docs/recipes/page-builder-blocks)
- “let editors arrange page sections” → [Build flexible pages from reusable blocks](https://docs.dyrected.com/docs/recipes/page-builder-blocks)
- “create reusable content blocks” → [Build flexible pages from reusable blocks](https://docs.dyrected.com/docs/recipes/page-builder-blocks)
- “model flexible landing pages” → [Build flexible pages from reusable blocks](https://docs.dyrected.com/docs/recipes/page-builder-blocks)
- “connect posts to authors” → [Model a relationship and its reverse lookup](https://docs.dyrected.com/docs/recipes/relationship-and-reverse-join)
- “show every post written by a user” → [Model a relationship and its reverse lookup](https://docs.dyrected.com/docs/recipes/relationship-and-reverse-join)
- “create a reverse relationship” → [Model a relationship and its reverse lookup](https://docs.dyrected.com/docs/recipes/relationship-and-reverse-join)
- “model one-to-many content” → [Model a relationship and its reverse lookup](https://docs.dyrected.com/docs/recipes/relationship-and-reverse-join)
- “only editors can update content” → [Restrict content operations by user role](https://docs.dyrected.com/docs/recipes/role-based-access)
- “restrict deletion to admins” → [Restrict content operations by user role](https://docs.dyrected.com/docs/recipes/role-based-access)
- “make content publicly readable” → [Restrict content operations by user role](https://docs.dyrected.com/docs/recipes/role-based-access)
- “add role based access” → [Restrict content operations by user role](https://docs.dyrected.com/docs/recipes/role-based-access)
- “rename a field safely” → [Rename a field without orphaning existing data](https://docs.dyrected.com/docs/recipes/safe-field-rename)
- “change a field name without losing data” → [Rename a field without orphaning existing data](https://docs.dyrected.com/docs/recipes/safe-field-rename)
- “migrate an existing schema” → [Rename a field without orphaning existing data](https://docs.dyrected.com/docs/recipes/safe-field-rename)
- “keep old documents working after a rename” → [Rename a field without orphaning existing data](https://docs.dyrected.com/docs/recipes/safe-field-rename)
- “let editors upload images” → [Create a media upload collection](https://docs.dyrected.com/docs/recipes/upload-collection)
- “create a media library” → [Create a media upload collection](https://docs.dyrected.com/docs/recipes/upload-collection)
- “store uploaded files” → [Create a media upload collection](https://docs.dyrected.com/docs/recipes/upload-collection)
- “add image uploads to my project” → [Create a media upload collection](https://docs.dyrected.com/docs/recipes/upload-collection)
<!-- GENERATED:INTENTS:END -->

## Generated contract map

<!-- GENERATED:REFERENCES:START -->
- [Configuration](https://docs.dyrected.com/docs/reference/configuration)
- [Fields and hooks](https://docs.dyrected.com/docs/reference/fields)
- [Database adapters](https://docs.dyrected.com/docs/adapters/databases)
- [Storage adapters](https://docs.dyrected.com/docs/adapters/storage)
- [SDK](https://docs.dyrected.com/docs/reference/sdk)
- [Workflows](https://docs.dyrected.com/docs/reference/generated-workflows)
- [REST and OpenAPI](https://docs.dyrected.com/docs/reference/rest-api)
<!-- GENERATED:REFERENCES:END -->

## Work sequence

1. Inspect installation, versions, framework and existing configuration.
2. Translate the plain-language outcome into the matching recipe or documented contract.
3. Implement no more than three related collections or globals in one batch.
4. Keep every field labeled and preserve stored data during schema evolution.
5. Run lint, types, focused tests and build; fix failures before expanding scope.
6. Explain decisions in the user's language. Do not ask them to choose between technical CMS concepts when the intent determines the correct pattern.

## Troubleshooting

- Missing export: inspect the installed package version; do not substitute an internal source import.
- Admin route failure: remove custom auth wrappers and verify the framework integration generated by the CLI.
- Empty frontend: provide an intentional zero-state or SDK `initialData` fallback.
- Relationship payload too large: lower query depth.
- Cloud condition missing: replace callback conditions with Jexl strings.
- Existing records fail after a schema change: restore the old key through `renameTo` and add a compatible default.

## Completion checklist

- Installed package APIs were verified.
- Existing configuration and content were inspected.
- Named fields have labels.
- Access and auth are server-enforced.
- Migrations preserve existing data.
- Generated knowledge is current.
- Lint, type checking, tests and build pass.
