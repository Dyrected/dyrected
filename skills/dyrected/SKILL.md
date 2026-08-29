---
name: dyrected
description: Install, model, migrate, and connect Dyrected in new or existing projects using current docs, installed package types, safe schema changes, and verified frontend editing.
---

# Dyrected

Dyrected is a declarative, schema-driven headless CMS configured primarily
through `dyrected.config.ts`.

## Existing Project Integration Contract

<!-- GENERATED:INTEGRATION_CONTRACT:START -->
## Existing Project Integration Contract

Use this contract when adding Dyrected to an existing project. It defines the
non-negotiable result. The detailed field, configuration, Admin, and SDK docs
define how to implement that result with the installed package version.

### Required outcome

- Make approved existing content manageable in Dyrected.
- Preserve the current design, layout, styling, components, routes, content
  order, visual hierarchy, animations, responsive behaviour, and application
  behaviour.
- Do not redesign, rewrite copy, add features, remove features, or refactor
  unrelated code.
- Do not invent content, pages, sections, collections, fields, routes, media,
  variants, interactions, or behaviour.
- Do not extract a value merely because it is a string. Move content only when
  a non-technical owner could reasonably change it without changing the
  interface or behaviour.
- Ask the operator plain-language questions about editing scope. Do not ask
  them to choose schemas, field types, hooks, adapters, preview modes, or other
  implementation details.

### Read current documentation first

Start with the documentation index and then read the pages relevant to the
feature being implemented:

- Documentation index: https://docs.dyrected.com/llms.txt
- Documentation home: https://docs.dyrected.com
- Existing-site agent workflow: https://docs.dyrected.com/docs/guides/ai-and-coding-agents/using-the-dyrected-prompt
- Installation: https://docs.dyrected.com/docs/start-here/installation
- CLI and schema synchronization: https://docs.dyrected.com/docs/reference/cli
- Configuration: https://docs.dyrected.com/docs/model-content/configuration/overview
- Collections: https://docs.dyrected.com/docs/model-content/configuration/collections
- Globals: https://docs.dyrected.com/docs/model-content/configuration/globals
- Fields: https://docs.dyrected.com/docs/model-content/fields/overview
- Rich text: https://docs.dyrected.com/docs/model-content/fields/rich-text
- Blocks: https://docs.dyrected.com/docs/model-content/fields/blocks
- Admin: https://docs.dyrected.com/docs/editor-experience/overview
- Preview: https://docs.dyrected.com/docs/editor-experience/preview
- Storage adapters: https://docs.dyrected.com/docs/model-content/media/storage-adapters
- SDK: https://docs.dyrected.com/docs/deliver-content/sdk-api/overview

Read the installed package version, public exports, and TypeScript types before
using a Dyrected API. If the docs and installed package differ, explain the
difference plainly and use the installed package as the source of truth. Never
invent functions, field types, configuration options, hooks, access rules,
adapters, routes, or preview behaviour.

### Determine the project state

- If Dyrected is absent, use the documented CLI initialization flow. In agent
  or script-driven work, pass non-interactive `dyrected init` options such as
  `--yes`, `--framework`, `--backend`, `--db`, `--storage`, and `--path` instead
  of bypassing the CLI because its default mode can prompt. Let the CLI scaffold
  configuration, environment variables, Admin integration, type generation, and
  AI rules before modelling content.
- If Dyrected is partially installed, inspect and complete the generated setup
  instead of recreating it by hand.
- If Dyrected is already connected, read the existing config and remote schema
  before extending them.
- Treat the nearest `dyrected.config.ts` as the project configuration source;
  preserve its established package exports, adapters, collections, globals,
  blocks, access rules, and framework integration.
- Detect the framework, package manager, deployment target, database, storage,
  routes, caching strategy, and current content sources before changing setup.
- Preserve existing Admin routes and do not wrap them in unsupported custom
  authentication.

### Model only what exists

Classify every approved editable area by meaning:

- **Global:** one shared site-wide value, such as navigation, footer, contact
  details, or default metadata.
- **Collection:** repeatable business content, such as articles, projects,
  products, people, services, events, FAQs, questions, or recommendations.
- **Page section:** content that exists because of its place on a page and
  should be rendered as an approved reusable block.

Do not force every project to have the same collections. Create a Pages
collection only when the project contains appropriate public content pages.
When it does:

- Represent existing pages, including the home page, as page entries rather
  than globals.
- Give each page a human-readable title, route data, existing metadata, and one
  ordered blocks field for visible sections.
- Put Hero and every other meaningful visible section inside that blocks field.
- Use approved reusable blocks and variants that map to designs already present
  in the project.
- Give editors only the block types, variants, and ordering freedom the
  frontend can safely render.
- Add a dynamic or fallback route only when editors are approved to create new
  pages, and verify it preserves every existing route.

Use either inline `blocks` or `blockReferences` on one blocks field, never both.
Use the installed dedicated `define[FieldName]Field` helper for each field and
`defineBlock` for blocks. Do not use `defineJsonField` to avoid modelling
structured editable content.

### Make the Admin understandable

- Give every named field an explicit human-readable label.
- Give collections clear singular and plural labels. Give globals a clear
  singular label.
- Give every collection and global a semantically appropriate
  `admin.icon` using a valid Lucide icon name supported by the installed
  `AdminIconName` type.
- Store the icon name in configuration. Do not import a Lucide React component
  for `admin.icon`, store components in content, or pass icon components across
  server/client boundaries.
- Set collection `admin.useAsTitle` to the best human-readable title or name
  field.
- Put that same title field first in `admin.defaultColumns`; keep slugs and
  technical identifiers secondary.
- Add concise field descriptions only where the expected input is not obvious.
- Use controlled options for supported variants and other fixed choices. Do
  not make editors type internal values or arbitrary style names.
- Protect technical, behavioural, scoring, and access-sensitive values from
  ordinary editors unless the approved plan explicitly includes them.

### Protect stored content

- Treat collection slugs, global slugs, field names, block slugs, and public URL
  patterns as persisted contracts.
- Read the current local and remote schema before changing either.
- Never silently remove a collection, global, field, block, or variant.
- Never directly rename or delete a persisted field. Use the installed
  migration or rename mechanism and compatible defaults.
- Make schema changes in small related batches and validate each batch before
  synchronization.
- Before schema synchronization, identify changes that could affect stored
  content. Do not synchronize a schema with validation errors.
- Seed only approved content that already exists in the project.
- Keep seeding idempotent: do not overwrite editor changes or create duplicate
  entries when initialization runs again.
- Treat `initialData` as a seed, never as the normal frontend data source.
- Keep credentials and storage secrets in server-only configuration.

### Connect the real frontend

- Make Dyrected the runtime source of truth for every approved content area.
- Stop using old constants, JSON, Markdown, or static imports as the normal
  source after a content area is verified.
- Use a small explicit adapter when Dyrected data shapes differ from existing
  component props.
- Keep state, event handlers, calculations, validation behaviour,
  authentication, submissions, dashboards, analytics, and user data in
  application code unless explicitly approved.
- Pass only serializable data across server/client boundaries. Resolve icons,
  components, functions, classes, and other executable values inside the
  appropriate code boundary.
- Preserve safe fallbacks during migration, but do not hide a broken Dyrected
  connection behind fallback content.
- Preserve image dimensions, cropping, responsive behaviour, and meaningful
  alt text. Keep decorative assets in code.
- Preserve rich-text structure and render it through a safe supported boundary.
- Model blog bodies, articles, policies, case studies, and other formatted
  long-form content with `defineRichTextField`, not a textarea containing
  Markdown. Dyrected rich text stores an HTML string produced by the editor.
- When existing long-form source is Markdown, convert it to equivalent safe
  HTML for the initial seed without inventing or flattening its structure.
- Use the project's existing caching strategy, adjusted only as needed so
  published edits and preview data can appear when expected.
- For block-based pages, render the ordered blocks field with the installed
  block renderer when available and use installed field-path helpers for
  click-to-edit. Do not hand-write block indexes or custom `data-dy-path`
  formats.
- In React/Next.js Client Components, import live-preview and path helpers from
  a browser-safe package entry. Use framework server helpers only in server
  files.

For routable collections, configure preview only when the installed package
supports it:

- Derive preview from existing frontend routes.
- Prefer a serializable Jexl string for Cloud-compatible schemas.
- Return a relative route such as `"/blog/" + slug`; do not prefix it with
  `siteUrl`. Dyrected resolves relative preview routes against the configured
  site URL.
- Prefer `postMessage` preview. For SSR apps, server-render the published data
  first and pass it to a hydrated component that calls `useLivePreview`; choose
  `token` only for routes that cannot receive browser messages and must redeem
  draft data on the server.
- Use a function only when the installed package and self-hosted runtime support
  that non-serializable form.
- Do not invent preview token handling, postMessage payloads, click-to-edit
  paths, or expose private credentials in URLs.

### Prove the complete editing loop

For every batch, verify:

1. Existing content appears in Dyrected without duplicates.
2. A non-technical editor can find and understand it.
3. The frontend reads it from Dyrected.
4. One recognizable edit appears on the correct public route.
5. Add, remove, arrange, and preview work only where approved.
6. Missing, incomplete, or unknown content fails safely.
7. The original design and behaviour remain unchanged.
8. Private credentials do not reach browser code.
9. Generated types, schema validation, lint, type checking, tests, and the
   production build pass where the project provides them.
10. Schema synchronization succeeds only after the local checks pass.

Do not call the integration complete because the Admin loads or the schema
synchronizes. Completion requires a verified edit from Dyrected through the
real frontend.
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
`text`, `textarea`, `richText`, `number`, `boolean`, `date`, `datetime`, `time`, `select`, `multiSelect`, `radio`, `relationship`, `array`, `object`, `json`, `blocks`, `image`, `email`, `url`, `icon`, `join`, `row`
<!-- GENERATED:FIELD_TYPES:END -->

## Compiled recipes

Select recipes from the user's desired outcome. Do not require the user to know
Dyrected terminology.

<!-- GENERATED:RECIPES:START -->
- [Archive records instead of deleting them](https://docs.dyrected.com/docs/examples-and-recipes/library/archive-instead-of-delete) — Problem: Content should disappear from normal views without being permanently deleted from the database. Summary: Use an `archived` flag plus read and delete rules so records can be retired safely instead of destroyed.
- [Generate a slug from a title](https://docs.dyrected.com/docs/examples-and-recipes/library/auto-slug) — Problem: You want readable URLs without asking editors to hand-author slugs for every document. Summary: Generate the slug on the server and optionally mirror it live in Admin so titles and URL fields stay aligned.
- [Set up a Calendar schedule view](https://docs.dyrected.com/docs/examples-and-recipes/library/calendar-schedule-view) — Problem: Event coordinators need to schedule tasting sessions and inspection bookings across calendar slots without overlapping dates. Summary: Configure a Calendar operational view using defineView with layout: 'calendar' and dateField pointed to an ISO datetime field.
- [Create a category taxonomy for content](https://docs.dyrected.com/docs/examples-and-recipes/library/category-taxonomy) — Problem: Entries need reusable categories so editors can organize content and build filtered listing pages. Summary: Store taxonomy entries in their own collection and connect content to them with a has-many relationship field.
- [Chat-to-order AI proposals](https://docs.dyrected.com/docs/examples-and-recipes/library/chat-to-order-proposal) — Problem: Customer orders arrive inside unstructured chat transcripts and require manual data entry and price calculation. Summary: Instruct Dyrected AI to extract customer details, query live pricing rules, calculate deposits, and generate an order proposal for approval.
- [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/examples-and-recipes/library/conditional-admin-field) — Problem: Some fields only make sense after an editor has made an earlier choice. Summary: Use an Admin condition to hide irrelevant fields until the current form state makes them useful.
- [Validate related fields before saving](https://docs.dyrected.com/docs/examples-and-recipes/library/cross-field-validation) — Problem: A field value is only valid in relation to another field, such as a start date and an end date. Summary: Use a collection hook to reject invalid combinations before the document reaches the database.
- [Custom business logic AI tools](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-ai-tools) — Problem: The AI assistant needs to invoke custom server logic beyond basic collection CRUD operations. Summary: Register custom tools in config.ai.tools with Zod parameter validation and server execution handlers.
- [Build a field editor directly into a page](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-page-field-editor) — Problem: A customer dashboard needs to edit customer-owned complaint draft fields and nested order details without recreating form state, validation, and path handling. Summary: Create one form controller for the signed-in customer record, then use the public form and field APIs in smaller dashboard components so complaint editing stays consistent.
- [Build a media picker directly into a page](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-page-media-picker) — Problem: Customers need to upload screenshots, import a proof URL, and choose an existing attachment without leaving the complaint form in the app. Summary: Use the public media APIs together on a customer dashboard page so complaint attachments, uploads, and library selection all share Dyrected's media pipeline.
- [Build a theme-aware shell around Dyrected UI](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-theme-shell) — Problem: The page, layout shell, and Dyrected-powered UI all need to agree on the same light and dark mode. Summary: Use the public theme provider and hook near the app root so custom shells, dashboards, and Dyrected UI share one resolved theme state.
- [Update a dropdown from another field](https://docs.dyrected.com/docs/examples-and-recipes/library/dependent-dropdown) — Problem: The valid options for one field depend on what the editor picked in another field. Summary: Update select options from sibling field data so the next choice stays constrained by the current form state.
- [Create a document download library](https://docs.dyrected.com/docs/examples-and-recipes/library/document-download-library) — Problem: Editors need a dedicated place to manage downloadable files instead of attaching them ad hoc in many records. Summary: Create an upload-enabled collection for documents so downloads stay reusable, searchable, and consistently described.
- [Add draft, review, and publishing states](https://docs.dyrected.com/docs/examples-and-recipes/library/editorial-publishing-workflow) — Problem: Content should move through draft and review before the right person is allowed to publish it. Summary: Attach Dyrected's editorial workflow so documents move through named states instead of going live immediately.
- [Build a Kanban pipeline board](https://docs.dyrected.com/docs/examples-and-recipes/library/kanban-pipeline-view) — Problem: Fulfillment teams need to see orders progress across stages (Requested → Paid → Collected) and drag cards between columns to update status. Summary: Configure a Kanban operational view using defineView with layout: 'kanban', groupBy: 'statusField', and quick status actions.
- [Create a navigation global with nested links](https://docs.dyrected.com/docs/examples-and-recipes/library/navigation-global-links) — Problem: Editors need to manage shared site navigation without hardcoding links into the frontend. Summary: Use a global with repeatable link rows so navigation stays editable, structured, and reused across pages.
- [Add KPI metric cards above a view](https://docs.dyrected.com/docs/examples-and-recipes/library/operational-metrics) — Problem: Event managers need real-time summary indicators (total attendees, check-in percentage, collected revenue) without manual counting or slow table scanning. Summary: Attach metric cards to a view with native database aggregate queries, JEXL transform math, and sub-metric breakdowns.
- [Configure an operational table view](https://docs.dyrected.com/docs/examples-and-recipes/library/operational-table-view) — Problem: Front-of-house staff need a fast list of confirmed attendees with a single-click check-in button, without wading through full collection fields. Summary: Define a dedicated table view using defineView, filtering confirmed records and attaching a declarative checkIn row action.
- [Let owners edit records while admins manage everything](https://docs.dyrected.com/docs/examples-and-recipes/library/owner-or-admin-access) — Problem: Records should belong to one user, but administrators still need a way to review or fix any entry. Summary: Scope writes to the owner by default and return `true` for admin users when they need broader access.
- [Limit documents to their owner](https://docs.dyrected.com/docs/examples-and-recipes/library/owner-scoped-access) — Problem: Signed-in users should only see or manage the records they own. Summary: Scope reads and writes to the current user in access control, then stamp ownership when records are created.
- [Build flexible pages from reusable blocks](https://docs.dyrected.com/docs/examples-and-recipes/library/page-builder-blocks) — Problem: Editors need to build or rearrange page sections without turning every page into one giant content object. Summary: Use blocks to model reusable page sections inside a page layout so pages stay flexible without becoming unstructured.
- [Configure preview URLs with postMessage live preview](https://docs.dyrected.com/docs/examples-and-recipes/library/preview-url-token-mode) — Problem: Editors need to preview draft content on the real route before it is published. Summary: Set a relative `previewUrl`, prefer `previewMode: 'postMessage'`, and reserve token mode for routes that cannot receive browser messages.
- [Model a relationship and its reverse lookup](https://docs.dyrected.com/docs/examples-and-recipes/library/relationship-and-reverse-join) — Problem: One record should point to another record, and you also want the reverse view without storing duplicate data. Summary: Store the owning relationship on one side and use a join field for the reverse lookup when you need one-to-many content structures.
- [Create a responsive image library](https://docs.dyrected.com/docs/examples-and-recipes/library/responsive-image-library) — Problem: Editors need a reusable image library with predictable generated sizes for cards, hero sections, and thumbnails. Summary: Use upload image sizes so one source image can serve multiple frontend layouts without custom per-page handling.
- [Restrict content operations by user role](https://docs.dyrected.com/docs/examples-and-recipes/library/role-based-access) — Problem: Different roles should have different permissions for reading, editing, publishing, or deleting content. Summary: Check user roles in collection access control so each operation matches the responsibilities of the current user.
- [Rename a field without orphaning existing data](https://docs.dyrected.com/docs/examples-and-recipes/library/safe-field-rename) — Problem: You need to change a field name on a live schema without breaking the documents that already exist. Summary: Use renameTo and a safe default so old data keeps working while the schema evolves toward the new field name.
- [Group SEO fields into an Admin tab](https://docs.dyrected.com/docs/examples-and-recipes/library/seo-tab-fields) — Problem: SEO fields are useful, but they clutter the main content form when they sit beside every primary field. Summary: Use `defineTab` to keep SEO metadata grouped in the Admin without changing the stored document shape.
- [Create a site settings global](https://docs.dyrected.com/docs/examples-and-recipes/library/site-settings-global) — Problem: You need one shared place for site name, support details, and other site-wide settings. Summary: Use a global for singleton content that should be edited once and reused across the site or app.
- [Scope content to the current workspace](https://docs.dyrected.com/docs/examples-and-recipes/library/tenant-scoped-access) — Problem: Users should only see or manage records that belong to their current workspace or organization. Summary: Use collection access rules and a create-time hook to keep each tenant's data isolated from the others.
- [Create a media upload collection](https://docs.dyrected.com/docs/examples-and-recipes/library/upload-collection) — Problem: Editors need a proper place to upload and reuse files instead of scattering media fields across unrelated documents. Summary: Create a dedicated upload collection with file rules and metadata fields so media can be managed and reused cleanly.
<!-- GENERATED:RECIPES:END -->

## Intent-to-pattern index

<!-- GENERATED:INTENTS:START -->
- “archive content instead of deleting it” → [Archive records instead of deleting them](https://docs.dyrected.com/docs/examples-and-recipes/library/archive-instead-of-delete)
- “hide old records from normal queries” → [Archive records instead of deleting them](https://docs.dyrected.com/docs/examples-and-recipes/library/archive-instead-of-delete)
- “soft delete documents” → [Archive records instead of deleting them](https://docs.dyrected.com/docs/examples-and-recipes/library/archive-instead-of-delete)
- “retire entries without removing them” → [Archive records instead of deleting them](https://docs.dyrected.com/docs/examples-and-recipes/library/archive-instead-of-delete)
- “make the URL follow the title” → [Generate a slug from a title](https://docs.dyrected.com/docs/examples-and-recipes/library/auto-slug)
- “automatically generate a slug” → [Generate a slug from a title](https://docs.dyrected.com/docs/examples-and-recipes/library/auto-slug)
- “create friendly URLs from titles” → [Generate a slug from a title](https://docs.dyrected.com/docs/examples-and-recipes/library/auto-slug)
- “keep a slug synchronized with a title” → [Generate a slug from a title](https://docs.dyrected.com/docs/examples-and-recipes/library/auto-slug)
- “create a calendar view” → [Set up a Calendar schedule view](https://docs.dyrected.com/docs/examples-and-recipes/library/calendar-schedule-view)
- “display bookings on a calendar” → [Set up a Calendar schedule view](https://docs.dyrected.com/docs/examples-and-recipes/library/calendar-schedule-view)
- “schedule appointments on monthly/weekly view” → [Set up a Calendar schedule view](https://docs.dyrected.com/docs/examples-and-recipes/library/calendar-schedule-view)
- “map dateField to an event calendar” → [Set up a Calendar schedule view](https://docs.dyrected.com/docs/examples-and-recipes/library/calendar-schedule-view)
- “add categories to posts” → [Create a category taxonomy for content](https://docs.dyrected.com/docs/examples-and-recipes/library/category-taxonomy)
- “model reusable taxonomy entries” → [Create a category taxonomy for content](https://docs.dyrected.com/docs/examples-and-recipes/library/category-taxonomy)
- “tag content with multiple categories” → [Create a category taxonomy for content](https://docs.dyrected.com/docs/examples-and-recipes/library/category-taxonomy)
- “build filtered content listings” → [Create a category taxonomy for content](https://docs.dyrected.com/docs/examples-and-recipes/library/category-taxonomy)
- “convert chat to order” → [Chat-to-order AI proposals](https://docs.dyrected.com/docs/examples-and-recipes/library/chat-to-order-proposal)
- “parse whatsapp conversation to quote” → [Chat-to-order AI proposals](https://docs.dyrected.com/docs/examples-and-recipes/library/chat-to-order-proposal)
- “telegram bot order creation” → [Chat-to-order AI proposals](https://docs.dyrected.com/docs/examples-and-recipes/library/chat-to-order-proposal)
- “automate deposit calculation from chat” → [Chat-to-order AI proposals](https://docs.dyrected.com/docs/examples-and-recipes/library/chat-to-order-proposal)
- “show a field conditionally” → [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/examples-and-recipes/library/conditional-admin-field)
- “hide irrelevant form fields” → [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/examples-and-recipes/library/conditional-admin-field)
- “show discount only with a coupon” → [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/examples-and-recipes/library/conditional-admin-field)
- “make the admin form react to another field” → [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/examples-and-recipes/library/conditional-admin-field)
- “validate fields before saving” → [Validate related fields before saving](https://docs.dyrected.com/docs/examples-and-recipes/library/cross-field-validation)
- “make sure an end date is after the start date” → [Validate related fields before saving](https://docs.dyrected.com/docs/examples-and-recipes/library/cross-field-validation)
- “reject invalid form submissions” → [Validate related fields before saving](https://docs.dyrected.com/docs/examples-and-recipes/library/cross-field-validation)
- “validate multiple fields together” → [Validate related fields before saving](https://docs.dyrected.com/docs/examples-and-recipes/library/cross-field-validation)
- “add custom tool to ai assistant” → [Custom business logic AI tools](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-ai-tools)
- “connect external api to ai” → [Custom business logic AI tools](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-ai-tools)
- “custom server functions for ai” → [Custom business logic AI tools](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-ai-tools)
- “zod schema ai tools” → [Custom business logic AI tools](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-ai-tools)
- “build a custom field editor in my app” → [Build a field editor directly into a page](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-page-field-editor)
- “edit a dyrected document inside a customer dashboard” → [Build a field editor directly into a page](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-page-field-editor)
- “mount dyrected form state in a customer route” → [Build a field editor directly into a page](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-page-field-editor)
- “edit nested customer complaint fields without the admin page” → [Build a field editor directly into a page](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-page-field-editor)
- “build a media picker in my app” → [Build a media picker directly into a page](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-page-media-picker)
- “add upload and media selection to a customer dashboard page” → [Build a media picker directly into a page](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-page-media-picker)
- “let customers attach screenshots without using the admin modal” → [Build a media picker directly into a page](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-page-media-picker)
- “create a complaint attachment picker” → [Build a media picker directly into a page](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-page-media-picker)
- “build a theme aware shell around dyrected ui” → [Build a theme-aware shell around Dyrected UI](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-theme-shell)
- “share dyrected theme state across a dashboard” → [Build a theme-aware shell around Dyrected UI](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-theme-shell)
- “add a dyrected theme switcher to my app shell” → [Build a theme-aware shell around Dyrected UI](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-theme-shell)
- “keep my product page and dyrected ui on the same theme” → [Build a theme-aware shell around Dyrected UI](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-theme-shell)
- “make one dropdown depend on another” → [Update a dropdown from another field](https://docs.dyrected.com/docs/examples-and-recipes/library/dependent-dropdown)
- “show states based on the selected country” → [Update a dropdown from another field](https://docs.dyrected.com/docs/examples-and-recipes/library/dependent-dropdown)
- “create a cascading dropdown” → [Update a dropdown from another field](https://docs.dyrected.com/docs/examples-and-recipes/library/dependent-dropdown)
- “update select options while editing” → [Update a dropdown from another field](https://docs.dyrected.com/docs/examples-and-recipes/library/dependent-dropdown)
- “store downloadable documents” → [Create a document download library](https://docs.dyrected.com/docs/examples-and-recipes/library/document-download-library)
- “create a pdf library” → [Create a document download library](https://docs.dyrected.com/docs/examples-and-recipes/library/document-download-library)
- “manage shared downloads” → [Create a document download library](https://docs.dyrected.com/docs/examples-and-recipes/library/document-download-library)
- “add a documents upload collection” → [Create a document download library](https://docs.dyrected.com/docs/examples-and-recipes/library/document-download-library)
- “add draft and publish states” → [Add draft, review, and publishing states](https://docs.dyrected.com/docs/examples-and-recipes/library/editorial-publishing-workflow)
- “require review before publishing” → [Add draft, review, and publishing states](https://docs.dyrected.com/docs/examples-and-recipes/library/editorial-publishing-workflow)
- “create an editorial workflow” → [Add draft, review, and publishing states](https://docs.dyrected.com/docs/examples-and-recipes/library/editorial-publishing-workflow)
- “let editors submit content for approval” → [Add draft, review, and publishing states](https://docs.dyrected.com/docs/examples-and-recipes/library/editorial-publishing-workflow)
- “create a kanban board view” → [Build a Kanban pipeline board](https://docs.dyrected.com/docs/examples-and-recipes/library/kanban-pipeline-view)
- “group records into status columns” → [Build a Kanban pipeline board](https://docs.dyrected.com/docs/examples-and-recipes/library/kanban-pipeline-view)
- “build an order fulfillment pipeline” → [Build a Kanban pipeline board](https://docs.dyrected.com/docs/examples-and-recipes/library/kanban-pipeline-view)
- “drag cards to change document status” → [Build a Kanban pipeline board](https://docs.dyrected.com/docs/examples-and-recipes/library/kanban-pipeline-view)
- “create editable navigation” → [Create a navigation global with nested links](https://docs.dyrected.com/docs/examples-and-recipes/library/navigation-global-links)
- “store menu links in the cms” → [Create a navigation global with nested links](https://docs.dyrected.com/docs/examples-and-recipes/library/navigation-global-links)
- “manage a navbar global” → [Create a navigation global with nested links](https://docs.dyrected.com/docs/examples-and-recipes/library/navigation-global-links)
- “add nested navigation links” → [Create a navigation global with nested links](https://docs.dyrected.com/docs/examples-and-recipes/library/navigation-global-links)
- “add summary cards above a table view” → [Add KPI metric cards above a view](https://docs.dyrected.com/docs/examples-and-recipes/library/operational-metrics)
- “calculate total revenue from quantity and unit price” → [Add KPI metric cards above a view](https://docs.dyrected.com/docs/examples-and-recipes/library/operational-metrics)
- “display door check-in attendance percentage” → [Add KPI metric cards above a view](https://docs.dyrected.com/docs/examples-and-recipes/library/operational-metrics)
- “configure aggregate and subMetrics on a view” → [Add KPI metric cards above a view](https://docs.dyrected.com/docs/examples-and-recipes/library/operational-metrics)
- “create a filtered table view” → [Configure an operational table view](https://docs.dyrected.com/docs/examples-and-recipes/library/operational-table-view)
- “add a check-in button to table rows” → [Configure an operational table view](https://docs.dyrected.com/docs/examples-and-recipes/library/operational-table-view)
- “customize visible columns on an operational table” → [Configure an operational table view](https://docs.dyrected.com/docs/examples-and-recipes/library/operational-table-view)
- “define an operational view for staff” → [Configure an operational table view](https://docs.dyrected.com/docs/examples-and-recipes/library/operational-table-view)
- “let users edit their own records” → [Let owners edit records while admins manage everything](https://docs.dyrected.com/docs/examples-and-recipes/library/owner-or-admin-access)
- “allow admins to manage every document” → [Let owners edit records while admins manage everything](https://docs.dyrected.com/docs/examples-and-recipes/library/owner-or-admin-access)
- “combine ownership with admin overrides” → [Let owners edit records while admins manage everything](https://docs.dyrected.com/docs/examples-and-recipes/library/owner-or-admin-access)
- “restrict records to owners unless admin” → [Let owners edit records while admins manage everything](https://docs.dyrected.com/docs/examples-and-recipes/library/owner-or-admin-access)
- “users should only see their own records” → [Limit documents to their owner](https://docs.dyrected.com/docs/examples-and-recipes/library/owner-scoped-access)
- “add row level access” → [Limit documents to their owner](https://docs.dyrected.com/docs/examples-and-recipes/library/owner-scoped-access)
- “scope documents by owner” → [Limit documents to their owner](https://docs.dyrected.com/docs/examples-and-recipes/library/owner-scoped-access)
- “prevent users reading another user's data” → [Limit documents to their owner](https://docs.dyrected.com/docs/examples-and-recipes/library/owner-scoped-access)
- “build a page builder” → [Build flexible pages from reusable blocks](https://docs.dyrected.com/docs/examples-and-recipes/library/page-builder-blocks)
- “let editors arrange page sections” → [Build flexible pages from reusable blocks](https://docs.dyrected.com/docs/examples-and-recipes/library/page-builder-blocks)
- “create reusable content blocks” → [Build flexible pages from reusable blocks](https://docs.dyrected.com/docs/examples-and-recipes/library/page-builder-blocks)
- “model flexible landing pages” → [Build flexible pages from reusable blocks](https://docs.dyrected.com/docs/examples-and-recipes/library/page-builder-blocks)
- “preview draft content privately” → [Configure preview URLs with postMessage live preview](https://docs.dyrected.com/docs/examples-and-recipes/library/preview-url-token-mode)
- “open live preview on the real route” → [Configure preview URLs with postMessage live preview](https://docs.dyrected.com/docs/examples-and-recipes/library/preview-url-token-mode)
- “use postmessage preview” → [Configure preview URLs with postMessage live preview](https://docs.dyrected.com/docs/examples-and-recipes/library/preview-url-token-mode)
- “configure preview urls for a collection” → [Configure preview URLs with postMessage live preview](https://docs.dyrected.com/docs/examples-and-recipes/library/preview-url-token-mode)
- “connect posts to authors” → [Model a relationship and its reverse lookup](https://docs.dyrected.com/docs/examples-and-recipes/library/relationship-and-reverse-join)
- “show every post written by a user” → [Model a relationship and its reverse lookup](https://docs.dyrected.com/docs/examples-and-recipes/library/relationship-and-reverse-join)
- “create a reverse relationship” → [Model a relationship and its reverse lookup](https://docs.dyrected.com/docs/examples-and-recipes/library/relationship-and-reverse-join)
- “model one-to-many content” → [Model a relationship and its reverse lookup](https://docs.dyrected.com/docs/examples-and-recipes/library/relationship-and-reverse-join)
- “create responsive image sizes” → [Create a responsive image library](https://docs.dyrected.com/docs/examples-and-recipes/library/responsive-image-library)
- “add generated media thumbnails” → [Create a responsive image library](https://docs.dyrected.com/docs/examples-and-recipes/library/responsive-image-library)
- “build a reusable image library” → [Create a responsive image library](https://docs.dyrected.com/docs/examples-and-recipes/library/responsive-image-library)
- “configure upload image presets” → [Create a responsive image library](https://docs.dyrected.com/docs/examples-and-recipes/library/responsive-image-library)
- “only editors can update content” → [Restrict content operations by user role](https://docs.dyrected.com/docs/examples-and-recipes/library/role-based-access)
- “restrict deletion to admins” → [Restrict content operations by user role](https://docs.dyrected.com/docs/examples-and-recipes/library/role-based-access)
- “make content publicly readable” → [Restrict content operations by user role](https://docs.dyrected.com/docs/examples-and-recipes/library/role-based-access)
- “add role based access” → [Restrict content operations by user role](https://docs.dyrected.com/docs/examples-and-recipes/library/role-based-access)
- “rename a field safely” → [Rename a field without orphaning existing data](https://docs.dyrected.com/docs/examples-and-recipes/library/safe-field-rename)
- “change a field name without losing data” → [Rename a field without orphaning existing data](https://docs.dyrected.com/docs/examples-and-recipes/library/safe-field-rename)
- “migrate an existing schema” → [Rename a field without orphaning existing data](https://docs.dyrected.com/docs/examples-and-recipes/library/safe-field-rename)
- “keep old documents working after a rename” → [Rename a field without orphaning existing data](https://docs.dyrected.com/docs/examples-and-recipes/library/safe-field-rename)
- “group seo fields in the admin” → [Group SEO fields into an Admin tab](https://docs.dyrected.com/docs/examples-and-recipes/library/seo-tab-fields)
- “move metadata into a separate tab” → [Group SEO fields into an Admin tab](https://docs.dyrected.com/docs/examples-and-recipes/library/seo-tab-fields)
- “keep forms cleaner with tabs” → [Group SEO fields into an Admin tab](https://docs.dyrected.com/docs/examples-and-recipes/library/seo-tab-fields)
- “add an seo tab to a collection” → [Group SEO fields into an Admin tab](https://docs.dyrected.com/docs/examples-and-recipes/library/seo-tab-fields)
- “create site settings” → [Create a site settings global](https://docs.dyrected.com/docs/examples-and-recipes/library/site-settings-global)
- “store one shared settings document” → [Create a site settings global](https://docs.dyrected.com/docs/examples-and-recipes/library/site-settings-global)
- “make a singleton config record” → [Create a site settings global](https://docs.dyrected.com/docs/examples-and-recipes/library/site-settings-global)
- “manage site-wide content in one place” → [Create a site settings global](https://docs.dyrected.com/docs/examples-and-recipes/library/site-settings-global)
- “add multi-tenant access control” → [Scope content to the current workspace](https://docs.dyrected.com/docs/examples-and-recipes/library/tenant-scoped-access)
- “scope records to a workspace” → [Scope content to the current workspace](https://docs.dyrected.com/docs/examples-and-recipes/library/tenant-scoped-access)
- “keep organizations isolated” → [Scope content to the current workspace](https://docs.dyrected.com/docs/examples-and-recipes/library/tenant-scoped-access)
- “limit data by tenant” → [Scope content to the current workspace](https://docs.dyrected.com/docs/examples-and-recipes/library/tenant-scoped-access)
- “let editors upload images” → [Create a media upload collection](https://docs.dyrected.com/docs/examples-and-recipes/library/upload-collection)
- “create a media library” → [Create a media upload collection](https://docs.dyrected.com/docs/examples-and-recipes/library/upload-collection)
- “store uploaded files” → [Create a media upload collection](https://docs.dyrected.com/docs/examples-and-recipes/library/upload-collection)
- “add image uploads to my project” → [Create a media upload collection](https://docs.dyrected.com/docs/examples-and-recipes/library/upload-collection)
<!-- GENERATED:INTENTS:END -->

## Generated contract map

<!-- GENERATED:REFERENCES:START -->
- [Installation](https://docs.dyrected.com/docs/start-here/installation)
- [CLI and schema synchronization](https://docs.dyrected.com/docs/reference/cli)
- [Configuration](https://docs.dyrected.com/docs/model-content/configuration/overview)
- [Collections](https://docs.dyrected.com/docs/model-content/configuration/collections)
- [Globals](https://docs.dyrected.com/docs/model-content/configuration/globals)
- [Fields](https://docs.dyrected.com/docs/model-content/fields/overview)
- [Rich text](https://docs.dyrected.com/docs/model-content/fields/rich-text)
- [Blocks](https://docs.dyrected.com/docs/model-content/fields/blocks)
- [Admin](https://docs.dyrected.com/docs/editor-experience/overview)
- [Preview](https://docs.dyrected.com/docs/editor-experience/preview)
- [Hooks](https://docs.dyrected.com/docs/model-content/content-rules/hooks)
- [Database adapters](https://docs.dyrected.com/docs/deployment-and-operations/infrastructure/database/overview)
- [Storage adapters](https://docs.dyrected.com/docs/model-content/media/storage-adapters)
- [SDK](https://docs.dyrected.com/docs/deliver-content/sdk-api/overview)
- [Workflows](https://docs.dyrected.com/docs/editor-experience/publishing/overview)
- [REST and OpenAPI](https://docs.dyrected.com/docs/deliver-content/rest-api/overview)
- [Documentation index for agents](https://docs.dyrected.com/llms.txt)
- [Existing-site agent workflow](https://docs.dyrected.com/docs/guides/ai-and-coding-agents/using-the-dyrected-prompt)
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
