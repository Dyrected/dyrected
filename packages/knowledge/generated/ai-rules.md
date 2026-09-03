# Dyrected AI Rules

This file combines one shared integration contract, focused implementation
rules, generated package facts, and behavior-tested recipes.

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
- Cloud concise index: https://docs.dyrected.com/llms-cloud.txt
- Self-hosted concise index: https://docs.dyrected.com/llms-self-hosted.txt
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
  authentication, dashboards, analytics, and private user data in
  application code unless explicitly approved (incoming form submissions,
  leads, and contact requests may be stored in an approved collection).
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
  `admin.condition`, `admin.previewUrl`, `access.*`, and `admin.hooks.onChange`
  when configuration synchronizes with Dyrected Cloud. JavaScript/TypeScript
  functions are supported in self-hosted runtimes only.
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
## Content Modeling Rules

Model the meaning of content before its current component shape. A sound model
should still make sense if the frontend is redesigned, while the integration
must preserve the frontend that exists today.

Use three content categories:

1. **Globals** for one shared site-wide value.
2. **Collections** for repeatable business content.
3. **Page sections** for meaningful content areas arranged inside pages.

Do not create a content type merely because the current code contains an
object, array, component, tab, or group of strings.

## Editing Boundary

Treat a value as editable when an owner could reasonably change what the site
communicates, asks, shows, recommends, or presents without changing how the
interface works.

Common editable content includes:

- page headings, supporting copy, calls to action, and destination links
- services, products, projects, people, testimonials, FAQs, posts, and events
- meaningful images and alternative text
- navigation, footer content, contact details, and shared business information
- questions, options, ranges, recommendations, and result copy that define an
  existing interactive experience
- long-form articles, policies, resources, and case studies

Keep these in application or UI code unless explicitly approved:

- layout, spacing, typography, visual styling, animation, and responsive logic
- decorative assets, interface icons, loading text, validation messages, and
  control labels tied to application behaviour
- state management, navigation logic, calculations, scoring functions,
  authentication, submissions, API calls, dashboards, analytics, and user data
- fragments whose extraction would make the code harder to understand without
  giving the owner useful control

Content definitions used by an interactive feature may be editable. The
feature's runtime behaviour remains code-owned.

## Globals

Use a Global only when there is exactly one shared current document.

Typical examples:

- site settings
- navigation
- footer
- contact details
- social links
- announcement banner
- default SEO information

Do not turn a page, page section, list, or repeatable business concept into a
Global because only one instance exists today.

## Collections

Use a Collection when the project has, or is expected to have, multiple entries
of the same recognizable concept.

Strong signals include:

- cards, lists, grids, archives, directories, or repeated routes
- entries the owner should add, remove, hide, sort, filter, or relate
- real business concepts such as articles, products, services, people,
  projects, locations, events, questions, or recommendations

Name collections after the content, not the presentation. Prefer `Projects`,
`Team Members`, or `FAQs` over `Blue Cards`, `Homepage Boxes`, or `Section
Two`.

A repeated list inside one section may remain local block data when its items
have no independent identity, route, reuse, workflow, or expected growth.
Promote it to a Collection when editors need to manage the items independently.

## Pages and Page Sections

When modeling marketing websites or content-driven applications:

- **Always default to a `Pages` collection with an ordered `blocks` field** rather than hardcoding section composition in `page.tsx` or `pages/[slug].vue`.
- **Define a cohesive block registry** (`Hero`, `TwoColumnFeature`, `CardGrid`, `PricingTierGrid`, `Timeline`, `FinalCTA`, etc.) in `dyrected.config.ts`.
- **Dynamic Route Fetching**: Routes should fetch via `getPageByPath(pathname, fallbackData)` or `client.collection('pages').findBySlug(slug)` and render through `<Blocks items={page.layout} path="layout" />` with `useDyPath` click-to-edit support.
- **Preserve Existing Layouts**: The block registry must 100% reflect the design, typography, spacing, and responsive behavior of the existing site.

A page normally contains:

- a human-readable title
- a routing slug or path
- existing SEO fields where the project already uses them
- one ordered blocks field containing its visible sections

Every meaningful visible content area belongs in that ordered block list,
including Hero. Do not place Hero, CTA, FAQ, testimonials, pricing, gallery,
statistics, process, contact, or similar sections in special top-level page
fields.

Page sections are reusable by default. Reuse one section type when multiple
sections have the same purpose, and use approved variants for the visual
differences already present in the project.

For example, prefer one `Hero` block with existing variants such as centered,
split, image, or minimal over separate `Home Hero`, `About Hero`, and `Blog
Hero` blocks.

Use either inline blocks or reusable block references for a blocks field. Never
configure both forms on the same field.

Editors may:

- edit safe content fields
- add or remove approved blocks when the design supports it
- arrange approved blocks
- select approved variants

Editors may not create arbitrary components, styles, layouts, block types, or
variant names the frontend cannot render.

If editors may create new pages, the project also needs a tested public route
that resolves a page by slug or path, renders its blocks, preserves the home
route, and returns a safe not-found response.

## Pattern and Variant Decisions

Compare all relevant pages before defining blocks.

Use one reusable block when sections share a purpose even if their copy,
position, or approved visual treatment differs. Split blocks only when their
meaning, fields, or rendering contract is genuinely different.

Variants must:

- correspond to layouts already supported by the frontend
- use stable slugs and friendly labels
- share the block's content fields
- map to existing components or layout branches
- fall back safely when missing or unknown

Do not expose colors, CSS classes, spacing values, arbitrary component names,
or other implementation details as variants.

## Media

Make an image editable when it communicates content and the owner could
reasonably replace it. Keep decorative backgrounds, effects, interface icons,
and design-only assets in code.

For editable media:

- use supported image or media relationships
- preserve dimensions, aspect ratio, cropping, loading, and responsive
  behaviour
- keep or add meaningful alternative text where appropriate
- use media document URLs instead of reconstructing storage paths
- do not seed fake media records or placeholder URLs

Configure storage from the actual deployment target. Local filesystem storage
requires persistent writable disk; serverless deployments need compatible
network storage. Dyrected Cloud projects should follow Cloud storage guidance
instead of adding an unnecessary custom adapter.

## Rich Content

Preserve semantic structure for articles, policies, resources, case studies,
and other long-form content.

- Use `defineRichTextField` for formatted long-form content. Do not store a blog
  or article body as Markdown inside a text or textarea field.
- Dyrected rich text stores an HTML string produced by the editor.
- If existing source content is Markdown, convert it to equivalent safe HTML
  for seeding without inventing or flattening its structure.
- Preserve headings, paragraphs, lists, links, quotes, and inline emphasis.
- Do not flatten prose into arrays of paragraph strings. If the editor is
  managing prose paragraphs rather than repeatable cards, steps, FAQs, or
  links, use rich text.
- Do not invent formatting that is absent from the source.
- Render rich content through `DyrectedRichText` or the installed documented
  rich-content boundary.

Reference: https://docs.dyrected.com/docs/model-content/fields/rich-text

## Array Fields & Object Shape Contract (Crucial)

- In Dyrected, `defineArrayField({ name: "checklist", fields: [defineTextField({ name: "item" })] })` **ALWAYS produces and expects an array of objects**, e.g.:

  ```ts
  checklist: [{ item: "First point" }, { item: "Second point" }]
  ```

- **Never pass primitive arrays** (e.g. `checklist: ["First point", "Second point"]`) in fallback data, seed scripts, or SDK mutations, as CMS schema validation will drop them.
- When rendering in frontend components, always defensively normalize items to support live-preview edits and fallbacks:

  ```tsx
  const text = typeof item === 'string' ? item : item?.item || item?.text || '';
  ```

- Use arrays for real repeatable items such as steps, FAQs, links, features, or
  cards, not as a substitute for rich text.

## Interactive Content

Separate editable definitions from runtime behaviour.

Editable definitions may include existing:

- questions, prompts, labels, options, help text, and step copy
- scores or weights already represented as data
- result categories, score ranges, recommendations, and result-page copy
- messages, calls to action, and images shown inside the flow

Keep state, validation behaviour, navigation, scoring functions, submissions,
authentication, storage, history, and analytics in code. Do not put private
answers, submissions, or user records in Dyrected unless product-data
management is explicitly approved.

Protect values that can break the feature with required fields, controlled
options, validation, limits, workflows, or administrator-only access.

## Initial Content

Seed only content that belongs to the approved model.

For existing projects, seed only content already present in the project. For
new-site generation, write coherent content based on the approved business
brief and never use placeholders or lorem ipsum.

Initial content must:

- use stable identifiers for referenced records
- preserve content order and relationships
- include block types and approved variants
- keep links pointed at real destinations
- avoid fake media references
- remain idempotent and avoid overwriting editor-owned content

`initialData` is a starting state, not a runtime content source.

## New-Site Coherence

When generating a new site rather than migrating one:

- create only pages, sections, and collections justified by the approved brief
- keep one consistent brand name, voice, tagline, contact identity, and visual
  direction
- ensure navigation, footer links, calls to action, authors, categories, and
  relationships resolve to content that actually exists
- give every page a distinct purpose, title, and description
- seed enough complete content for every approved route and list to render
- use real supported icon names and valid link/media shapes

The permission to invent content in a greenfield workflow does not permit
unrequested product features, disconnected pages, fake integrations, or
unsupported frontend behaviour.

## Modeling Completion Check

Before implementation, confirm:

- every editable area has exactly one owner in Globals, Collections, or page
  sections
- no page is disguised as a Global
- repeatable business content is not trapped inside page layout fields
- page sections are reusable without exposing arbitrary design freedom
- editable images and long-form content retain their meaning and structure
- interactive definitions are separated from runtime behaviour
- every proposed content type and variant already exists in the project or was
  explicitly approved for a greenfield site
<!-- GENERATED:MODELING_RULES:END -->

## CMS Configuration and Migration

<!-- GENERATED:CMS_GENERATION_RULES:START -->
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
<!-- GENERATED:CMS_GENERATION_RULES:END -->

## Frontend Integration

<!-- GENERATED:FRONTEND_RULES:START -->
## Frontend Integration Rules

Connect Dyrected to the existing component and routing system. Make the content
model fit the current interface; do not redesign the interface to fit the CMS.

## Source of Truth

- Fetch approved globals, collections, pages, and interactive definitions from
  Dyrected through supported public APIs.
- Stop using matching local constants, JSON, Markdown, or static imports as the
  normal source after verification.
- Keep a local fallback only for an intentional failure or first-run state.
  Surface connection failures instead of silently rendering stale content
  forever.
- Use the project's server-rendering and data-fetching conventions. Avoid
  unnecessary browser requests.
- Keep private credentials, storage secrets, and privileged SDK clients out of
  browser bundles.

## Data Boundaries

Dyrected data may not match existing component props exactly. Add a small,
explicit normalizer instead of changing the UI or weakening the schema.

Pass only serializable values across server/client boundaries:

- strings, numbers, booleans, null, arrays, and plain objects
- stable icon, component, or variant names when the client must resolve them

Do not pass React components, Lucide components, functions, classes, symbols,
or objects with methods from a server component or loader into client code.
Resolve executable UI values inside the component boundary that owns them.

## Blocks and Variants

- Map each approved block type to an existing component.
- Render Hero from the ordered page blocks field, not a separate page property.
- Map approved variant slugs to existing layouts.
- Ignore or safely fall back for missing block data, unknown block types, and
  unknown variants.
- Preserve markup, styling, layout, motion, image behaviour, and responsive
  behaviour.
- When the installed package provides a blocks renderer or field-path helpers,
  use those documented helpers instead of hand-building preview identifiers.
- For React and Next.js Client Components, render blocks through the installed
  React helper (`Blocks`) and annotate editable elements with `useDyPath` so
  click-to-edit can focus the matching field. Set the block renderer `path` to
  the actual blocks field name, such as `layout` or `sections`.
- Do not add wrapper elements that alter layout just to carry preview paths. If
  a wrapper is needed only for `data-dy-path`, make it layout-neutral.

## Routing

Keep every existing route working.

If editors are approved to create pages:

- add the framework-appropriate dynamic or catch-all route
- fetch the matching page by its slug or path
- render its ordered blocks
- map the home page to `/`
- preserve nested paths only when the project already supports them
- return the project's normal not-found response for missing pages
- test conflicts with existing static routes

Do not promise arbitrary page creation unless this route exists and has been
tested.

## Preview and Freshness

Use the existing public route for preview. A relative `previewUrl` is resolved
against the configured site URL; the frontend should not require the schema to
manually prefix that origin.

Wire live preview only through the installed package's documented mechanism.
Do not invent token handling, message formats, field paths, or click-to-edit
identifiers.

Prefer `previewMode: "postMessage"` for previewable content. In SSR frameworks,
fetch the published document on the server and pass it into a hydrated Client
Component that calls `useLivePreview`; the browser overlay receives draft data
by `postMessage` while the public route still renders normally without draft
data. Use `previewMode: "token"` only when the preview route cannot run a
browser-side listener, such as a fully server-only or static preview path that
must redeem draft data during the request.

Keep framework imports on the right side of the server/client boundary. In
Next.js, use `@dyrected/next/server` for server helpers and use the browser-safe
React package for Client Component helpers such as `useLivePreview`, `Blocks`,
and `useDyPath`. Do not import a package entry that also exports server handlers
inside Client Components.

Choose the smallest freshness change that lets edits appear when expected:

- preserve an existing intentional rebuild workflow
- otherwise use the framework's supported dynamic rendering, revalidation,
  no-store, ISR, or preview mechanism

Do not leave CMS-powered routes permanently stale.

References:

- https://docs.dyrected.com/docs/editor-experience/preview
- https://docs.dyrected.com/docs/editor-experience/publishing/live-preview/overview
- https://docs.dyrected.com/docs/editor-experience/publishing/live-preview/frontend
- https://docs.dyrected.com/docs/editor-experience/publishing/live-preview/client-side

## Links, Media, and Rich Content

Normalize URL-field values before rendering:

- derive the resolved href
- preserve same-site navigation for internal links
- set safe target and rel values for external links
- use the URL field's own label when present
- do not render an empty or broken destination

For media:

- consume returned media document URLs
- preserve dimensions, aspect ratio, cropping, loading, and responsive styles
- render missing optional media safely
- keep meaningful alternative text
- never reconstruct storage paths or expose provider credentials

For rich content:

- consume the HTML string returned by a Dyrected rich-text field
- preserve headings, paragraphs, lists, links, quotes, and inline emphasis
- render through `DyrectedRichText` or the installed safe rich-content boundary
- do not inject unsanitized HTML in the browser
- do not interpret textarea Markdown as rich-text content
- preserve the existing article typography and layout

## Interactive Features

Fetch approved content definitions from Dyrected and normalize them into the
shape existing logic expects. Keep state, validation behaviour, navigation,
scoring, submissions, authentication, history, and analytics in code.

A content edit must not silently change behaviour. Validate or protect fields
whose values affect a feature's correctness.

## Embedded Admin

Use the Admin route and integration generated or documented for the framework.
When Admin is embedded inside a public application shell:

- keep public navigation and footer out of the Admin surface
- do not wrap Admin handlers in unsupported custom authentication
- keep Admin-only components and configuration out of public content payloads

## Frontend Completion Check

For every connected area, prove:

1. Dyrected is the normal runtime source.
2. A recognizable edit appears on the correct route.
3. Loading, empty, missing, and error states are safe.
4. Existing routes, design, responsive behaviour, and interactions are
   unchanged.
5. Preview and caching behave as documented.
6. No private credential or non-serializable value crosses into browser data.
7. The production build and relevant route tests pass.
<!-- GENERATED:FRONTEND_RULES:END -->

## Supported Field Types

<!-- GENERATED:FIELD_TYPES:START -->
`text`, `textarea`, `richText`, `number`, `boolean`, `date`, `datetime`, `time`, `select`, `multiSelect`, `radio`, `relationship`, `array`, `object`, `json`, `blocks`, `image`, `email`, `url`, `icon`, `join`, `row`
<!-- GENERATED:FIELD_TYPES:END -->

## Compiled Recipes

<!-- GENERATED:RECIPES:START -->
- [Archive records instead of deleting them](https://docs.dyrected.com/docs/examples-and-recipes/library/archive-instead-of-delete) — Problem: Content should disappear from normal views without being permanently deleted from the database. Summary: Use an `archived` flag plus read and delete rules so records can be retired safely instead of destroyed.
- [Generate a slug from a title](https://docs.dyrected.com/docs/examples-and-recipes/library/auto-slug) — Problem: You want readable URLs without asking editors to hand-author slugs for every document. Summary: Generate the slug on the server and optionally mirror it live in Admin so titles and URL fields stay aligned.
- [Set up a Calendar schedule view](https://docs.dyrected.com/docs/examples-and-recipes/library/calendar-schedule-view) — Problem: Event coordinators need to schedule tasting sessions and inspection bookings across calendar slots without overlapping dates. Summary: Configure a Calendar operational view using defineView with layout: 'calendar' and dateField pointed to an ISO datetime field.
- [Create a category taxonomy for content](https://docs.dyrected.com/docs/examples-and-recipes/library/category-taxonomy) — Problem: Entries need reusable categories so editors can organize content and build filtered listing pages. Summary: Store taxonomy entries in their own collection and connect content to them with a has-many relationship field.
- [Compute fields and calculate totals live](https://docs.dyrected.com/docs/examples-and-recipes/library/computed-fields-and-totals) — Problem: You want multi-field calculations (like price totals and remaining balances) to calculate live in the Admin UI while guaranteeing consistency in the database. Summary: Use beforeChange for server-side persistence guarantees combined with admin.hooks.onChange for instant live reactivity as editors type.
- [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/examples-and-recipes/library/conditional-admin-field) — Problem: Some fields only make sense after an editor has made an earlier choice. Summary: Use an Admin condition to hide irrelevant fields until the current form state makes them useful.
- [Validate related fields before saving](https://docs.dyrected.com/docs/examples-and-recipes/library/cross-field-validation) — Problem: A field value is only valid in relation to another field, such as a start date and an end date. Summary: Use a collection hook to reject invalid combinations before the document reaches the database.
- [Build a field editor directly into a page](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-page-field-editor) — Problem: A customer dashboard needs to edit customer-owned complaint draft fields and nested order details without recreating form state, validation, and path handling. Summary: Create one form controller for the signed-in customer record, then use the public form and field APIs in smaller dashboard components so complaint editing stays consistent.
- [Build a media picker directly into a page](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-page-media-picker) — Problem: Customers need to upload screenshots, import a proof URL, and choose an existing attachment without leaving the complaint form in the app. Summary: Use the public media APIs together on a customer dashboard page so complaint attachments, uploads, and library selection all share Dyrected's media pipeline.
- [Build a theme-aware shell around Dyrected UI](https://docs.dyrected.com/docs/examples-and-recipes/library/custom-theme-shell) — Problem: The page, layout shell, and Dyrected-powered UI all need to agree on the same light and dark mode. Summary: Use the public theme provider and hook near the app root so custom shells, dashboards, and Dyrected UI share one resolved theme state.
- [Calculate field values and format strings live](https://docs.dyrected.com/docs/examples-and-recipes/library/declarative-reactive-hooks) — Problem: You want live form calculations, dynamic pricing, or auto-slug generation that syncs across environments and works in Dyrected Cloud without server-side function code. Summary: Use the when fluent builder to produce declarative, sandboxed JEXL expressions that calculate values live as editors type.
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

## Intent-to-Pattern Index

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
- “calculate order totals from sibling inputs” → [Compute fields and calculate totals live](https://docs.dyrected.com/docs/examples-and-recipes/library/computed-fields-and-totals)
- “compute remaining balances automatically” → [Compute fields and calculate totals live](https://docs.dyrected.com/docs/examples-and-recipes/library/computed-fields-and-totals)
- “update field values live as an editor types” → [Compute fields and calculate totals live](https://docs.dyrected.com/docs/examples-and-recipes/library/computed-fields-and-totals)
- “guarantee computed values in the database” → [Compute fields and calculate totals live](https://docs.dyrected.com/docs/examples-and-recipes/library/computed-fields-and-totals)
- “show a field conditionally” → [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/examples-and-recipes/library/conditional-admin-field)
- “hide irrelevant form fields” → [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/examples-and-recipes/library/conditional-admin-field)
- “show discount only with a coupon” → [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/examples-and-recipes/library/conditional-admin-field)
- “make the admin form react to another field” → [Show an Admin field only when it is relevant](https://docs.dyrected.com/docs/examples-and-recipes/library/conditional-admin-field)
- “validate fields before saving” → [Validate related fields before saving](https://docs.dyrected.com/docs/examples-and-recipes/library/cross-field-validation)
- “make sure an end date is after the start date” → [Validate related fields before saving](https://docs.dyrected.com/docs/examples-and-recipes/library/cross-field-validation)
- “reject invalid form submissions” → [Validate related fields before saving](https://docs.dyrected.com/docs/examples-and-recipes/library/cross-field-validation)
- “validate multiple fields together” → [Validate related fields before saving](https://docs.dyrected.com/docs/examples-and-recipes/library/cross-field-validation)
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
- “build reactive form transforms that survive Cloud schema sync” → [Calculate field values and format strings live](https://docs.dyrected.com/docs/examples-and-recipes/library/declarative-reactive-hooks)
- “compute field values without writing raw JavaScript functions” → [Calculate field values and format strings live](https://docs.dyrected.com/docs/examples-and-recipes/library/declarative-reactive-hooks)
- “calculate status-based pricing or conditional totals declaratively” → [Calculate field values and format strings live](https://docs.dyrected.com/docs/examples-and-recipes/library/declarative-reactive-hooks)
- “format reference codes or IDs from sibling inputs in real-time” → [Calculate field values and format strings live](https://docs.dyrected.com/docs/examples-and-recipes/library/declarative-reactive-hooks)
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

## Canonical References

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

## Completion Check

Run generation, schema validation, lint, type checking, focused tests, and the
production build. Confirm generated artifacts are current, stored data remains
compatible, access is server-enforced, and one real edit reaches the intended
frontend route.
