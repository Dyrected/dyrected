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
<!-- GENERATED:RECIPES:END -->

## Intent-to-pattern index

<!-- GENERATED:INTENTS:START -->
<!-- GENERATED:INTENTS:END -->

## Generated contract map

<!-- GENERATED:REFERENCES:START -->
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
