## CMS Configuration and Migration Rules

Translate the approved editing plan into Dyrected without asking the operator
to choose technical implementation details.

Use the installed public exports from `@dyrected/core`. Prefer:

- `defineCollection` for collections
- `defineGlobal` for globals
- `defineBlock` for reusable blocks
- the dedicated `define[FieldName]Field` helper for each field

Do not use generic field objects when a dedicated installed helper exists. Do
not use `defineJsonField` as an escape hatch for structured editor content.
Every named field must have an explicit human-readable `label`.

## Admin Authoring

Configure the Admin around the editor's language:

- Collections use `labels.singular` and `labels.plural`.
- Globals use their singular `label`.
- Every collection and global gets a valid `admin.icon` chosen from the
  installed `AdminIconName` Lucide icon names.
- `admin.icon` stores the icon name string. It is not a React component.
- Collections with a recognizable title or name set `admin.useAsTitle` to that
  field.
- The same title field comes first in `admin.defaultColumns`.
- Slugs and internal identifiers remain secondary.
- Fields receive concise descriptions only when the expected input is unclear.
- Fixed choices use controlled options with friendly labels and stable values.

Do not claim that globals support collection-only list, title, or preview
options. Verify the installed `GlobalConfig` and `CollectionConfig` types before
setting Admin properties.

## Blocks and Variants

Define reusable blocks at the config level when several content types share
them, then reference those block slugs from blocks fields. Use inline blocks
when a block is deliberately local to one content type.

A blocks field uses one definition mechanism:

- `blocks` for inline block definitions, or
- `blockReferences` for registered reusable blocks

Never set both.

Give blocks clear labels, descriptions where useful, and valid Lucide icon
names when supported. Use the installed block `variants` contract for approved
visual variants. Fall back to a controlled select field only when the installed
package does not support block variants.

## Preview Configuration

Configure preview only for content that already has a public route.

- Derive the path from the project's existing route pattern.
- Map the home-page slug to `/`.
- Use `admin.useAsTitle` for display and the slug only for routing.
- Prefer a serializable Jexl string for Cloud-compatible schemas.
- Return a relative route. Do not concatenate or prefix `siteUrl`; Dyrected
  resolves relative preview paths against the configured site URL.
- Use a JavaScript function only for a supported self-hosted case that requires
  runtime logic.
- Configure `previewMode` only after reading the installed package types and
  current preview docs.
- Prefer `previewMode: "postMessage"` for normal iframe live preview. It is
  still appropriate for server-rendered pages when a hydrated client component
  receives the server-fetched document and overlays the admin draft with
  `useLivePreview`.
- Use `previewMode: "token"` only when the preview cannot run a browser-side
  `postMessage` listener and must fetch draft data during a server request.
- Do not invent token redemption, postMessage handling, message payloads,
  field paths, or preview routes.

For previewable collections that include a blocks/layout field, put the
layout-building field in its own Admin tab with `defineTab`. Keep primary page
details and SEO metadata in separate tabs when that improves editor focus.
Tabs are editor presentation only; they must not change stored data shape.

Reference: https://docs.dyrected.com/docs/model-content/fields/tabs

## Access and Validation

Grant the smallest permissions required by the approved editing plan.

- Enforce permissions in server access configuration, not only Admin
  visibility.
- Reserve destructive, publishing, workflow, scoring, and access-sensitive
  controls for the roles that need them.
- Prefer hide/archive over delete when removal could break routes,
  relationships, or interactive flows.
- Use a documented workflow when draft, review, and publication are required.
- Add validation and limits only where they protect rendering, data quality, or
  existing behaviour.
- Keep auth-generated fields out of `auth: true` collection definitions.
- Use server hooks for correctness; Admin hooks are an optional feedback layer.
- Use serializable declarative conditions, hooks, and access values when the
  schema must synchronize to Dyrected Cloud.

## Type Synchronization Workflow

Immediately after creating or editing `dyrected.config.ts`, synchronize TypeScript types:

```bash
npx dyrected generate:types
```

- `npx dyrected generate:types` outputs `dyrected-types.ts` into your application source directory.
- `npx dyrected sync:schema` also auto-runs type generation upon successful synchronization.
- **Always import generated interfaces** into seed scripts, page components, and block definitions to catch schema mismatches (such as array shape errors) at compile time before committing code.

## Schema and Seed Safety

Before changing a schema:

1. Read the existing local config and remote schema.
2. Identify persisted slugs, fields, blocks, variants, relationships, and URL
   patterns affected by the change.
3. Add or evolve one related batch at a time.
4. Generate types (`npx dyrected generate:types`) and validate the local schema.
5. Review changes that could affect stored documents.
6. Synchronize only after local validation passes.

Never silently remove or directly rename persisted structures. Use the
installed rename/migration mechanism and compatible defaults. Test relational
or promoted-field changes against a safe environment before production.

Seed only approved existing content during migration. Keep seed identities and
relationships deterministic, and do not overwrite populated collections,
globals, or editor changes. Do not fabricate media records.

## Batch Execution

Keep each implementation batch to no more than three related content areas.

For the base batch:

1. Complete CLI-generated setup and environment configuration.
2. Verify database, storage, Admin, and deployment assumptions.
3. Add server-side clients or fetch utilities through supported public APIs.
4. Run generation, lint, type checking, focused tests, and build.

For each content batch:

1. Add related globals, collections, blocks, fields, labels, and Admin icons.
2. Add validation, access, preview, and hooks only where approved.
3. Seed existing content without duplication.
4. Connect the real frontend and normalize data shapes where needed.
5. Verify one recognizable edit on the real route.
6. Run the project's available validation commands.

If a batch fails, fix it before adding another content type. Do not stack new
schema or frontend work on an unverified batch.
