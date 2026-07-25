---
name: dyrected
description: Install, model, migrate, and connect Dyrected in new or existing projects using current docs, installed package types, safe schema changes, and verified frontend editing.
---

# Dyrected

Dyrected is a declarative, schema-driven headless CMS configured primarily
through `dyrected.config.ts`.

## Existing Project Integration Contract

<!-- GENERATED:INTEGRATION_CONTRACT:START -->
<!-- GENERATED:INTEGRATION_CONTRACT:END -->

## Start from the installed state

Inspect the nearest `package.json`, workspace root, and existing config.

If Dyrected is absent, use the CLI:

```bash
npx dyrected init
```

For automated agent work, pass the non-interactive options instead of skipping
the CLI because the default command is interactive:

```bash
npx dyrected init -y -f next -b cloud -p admin
npx dyrected init -y -f next -b self-hosted -d postgres -s s3 -p admin
```

Choose those option values from the existing project and user-provided site
details. If the needed values are not obvious, run `npx dyrected init --help`
and use the installed CLI's current option list. Let the CLI detect the
framework and scaffold configuration, environment variables, Admin integration,
type generation, and AI rules where possible. If Dyrected is already installed,
inspect its version, public exports, config, database, storage, authentication,
workflows, collections, and globals before changing anything.

## Public API

Import only from package entry points:

```ts
import {
  defineBlock,
  defineBlocksField,
  defineCollection,
  defineConfig,
  defineGlobal,
  defineJoinField,
  defineRelationshipField,
  defineRichTextField,
  defineSelectField,
  defineTextField,
} from "@dyrected/core";
import { createClient, type InferSchema } from "@dyrected/sdk";
```

Use the dedicated installed `define[FieldName]Field` helper and give every
named field a `label`. Never substitute an internal monorepo source import when
an export is missing.

Use package entry points that match the runtime boundary. In Next.js, import
server helpers from `@dyrected/next/server`; import browser live-preview and
path helpers for Client Components from the browser-safe React package when the
installed framework package root also exports server handlers.

## Rename a field safely

Treat field names as persisted data contracts. Use the rename mechanism
supported by the installed package instead of deleting the old field and
creating a new one.

```ts
defineTextField({
  name: "fullName",
  label: "Full name",
  renameTo: "name",
  defaultValue: "",
});
```

Keep `renameTo` until stored documents have been migrated and verified.
Generate and validate the schema before synchronization, then verify existing
records retain their values.

## Relationships and depth

`relationship` stores the owning reference. `join` is a virtual reverse lookup.

```ts
defineRelationshipField({
  name: "author",
  label: "Author",
  relationTo: "users",
});

defineJoinField({
  name: "posts",
  label: "Posts",
  collection: "posts",
  on: "author",
  limit: 20,
});
```

Use `depth: 0` for lists and increase depth only when populated data is needed.
Bound joins and account for their query cost.

## Auth and access

`auth: true` injects authentication fields and endpoints. Do not redefine
`email` or `password`.

```ts
export const Users = defineCollection({
  slug: "users",
  auth: true,
  fields: [
    defineTextField({ name: "name", label: "Name" }),
    defineSelectField({
      name: "roles",
      label: "Role",
      options: ["member", "editor", "admin"],
    }),
  ],
});
```

Grant read, create, update, delete, and workflow capabilities independently.
Enforce ownership, roles, validation, and trusted values on the server.

## Uploads

```ts
export const Media = defineCollection({
  slug: "media",
  upload: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxFileSize: 5_000_000,
  },
  fields: [
    defineTextField({
      name: "alt",
      label: "Alternative text",
      required: true,
    }),
  ],
});
```

Use returned media URLs, keep provider credentials server-side, and validate
untrusted file contents in addition to MIME metadata.

## Conditions and custom Admin surfaces

- Use static options for fixed choices.
- Use server option resolvers for database, secret, user, or cached choices.
- Use Admin option hooks only for browser-safe dependent choices.
- Treat `admin.condition` as presentation, not validation or authorization.
- Use registered string keys for custom components in serializable config.

## Supported field types

<!-- GENERATED:FIELD_TYPES:START -->
<!-- GENERATED:FIELD_TYPES:END -->

## Compiled recipes

Select recipes from the user's desired outcome. Do not require the user to know
Dyrected terminology.

<!-- GENERATED:RECIPES:START -->
<!-- GENERATED:RECIPES:END -->

## Intent-to-pattern index

<!-- GENERATED:INTENTS:START -->
<!-- GENERATED:INTENTS:END -->

## Generated contract map

<!-- GENERATED:REFERENCES:START -->
<!-- GENERATED:REFERENCES:END -->

## Troubleshooting

- Missing export: inspect the installed version; do not use an internal source
  import.
- Admin route failure: compare the route with the framework integration
  generated by the CLI and remove unsupported wrappers.
- Empty frontend: distinguish intentional zero-state content from an
  authentication, validation, or network failure.
- Large relationship payload: lower query depth.
- Cloud config missing after sync: replace non-serializable functions with a
  documented declarative form.
- Existing records fail after a schema change: restore compatibility through
  the installed rename mechanism and safe defaults.

## Completion checklist

- Current docs and installed exports were checked.
- Existing configuration and content were inspected.
- Named fields have labels and Admin content types have valid icon names.
- Schema changes preserve stored data.
- Dyrected is the verified frontend source of truth.
- Access and secrets remain server-side.
- Generated artifacts, lint, types, tests, and build pass.
