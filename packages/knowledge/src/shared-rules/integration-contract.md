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
- Existing-site agent workflow: https://docs.dyrected.com/docs/quick-start-guides/coding-agents-and-ai-app-builders/using-the-dyrected-prompt
- Installation: https://docs.dyrected.com/docs/basics/getting-started/installation
- CLI and schema synchronization: https://docs.dyrected.com/docs/basics/cli/overview
- Configuration: https://docs.dyrected.com/docs/basics/configuration/overview
- Collections: https://docs.dyrected.com/docs/basics/configuration/collections
- Globals: https://docs.dyrected.com/docs/basics/configuration/globals
- Fields: https://docs.dyrected.com/docs/basics/fields/overview
- Rich text: https://docs.dyrected.com/docs/basics/fields/rich-text
- Blocks: https://docs.dyrected.com/docs/basics/fields/blocks
- Admin: https://docs.dyrected.com/docs/features/admin/overview
- Preview: https://docs.dyrected.com/docs/features/admin/preview
- Storage adapters: https://docs.dyrected.com/docs/features/upload/storage-adapters
- SDK: https://docs.dyrected.com/docs/managing-data/sdk-api/overview

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

For routable collections, configure preview only when the installed package
supports it:

- Derive preview from existing frontend routes.
- Prefer a serializable Jexl string for Cloud-compatible schemas.
- Return a relative route such as `"/blog/" + slug`; do not prefix it with
  `siteUrl`. Dyrected resolves relative preview routes against the configured
  site URL.
- Use a function only when the installed package and self-hosted runtime support
  that non-serializable form.
- Do not invent preview token handling or expose private credentials in URLs.

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
