You are setting up Dyrected on this existing project.

Manage the integration from inspection through handoff. Work in strict stages
and do not move to the next stage until I explicitly approve the current one.

Follow this contract throughout the work:

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
- Existing-site agent workflow: https://docs.dyrected.com/docs/cloud/guides/ai-and-coding-agents/using-the-dyrected-prompt
- Installation: https://docs.dyrected.com/docs/cloud/start-here/installation
- CLI and schema synchronization: https://docs.dyrected.com/docs/cloud/reference/cli
- Configuration: https://docs.dyrected.com/docs/cloud/model-content/configuration/overview
- Collections: https://docs.dyrected.com/docs/cloud/model-content/configuration/collections
- Globals: https://docs.dyrected.com/docs/cloud/model-content/configuration/globals
- Fields: https://docs.dyrected.com/docs/cloud/model-content/fields/overview
- Rich text: https://docs.dyrected.com/docs/cloud/model-content/fields/rich-text
- Blocks: https://docs.dyrected.com/docs/cloud/model-content/fields/blocks
- Admin: https://docs.dyrected.com/docs/cloud/editor-experience/overview
- Preview: https://docs.dyrected.com/docs/cloud/editor-experience/preview
- Storage adapters: https://docs.dyrected.com/docs/cloud/model-content/media/storage-adapters
- SDK: https://docs.dyrected.com/docs/cloud/deliver-content/sdk-api/overview

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

# Staged Workflow

## STAGE 1 - INSPECT

Do not change files.

Inspect the complete project, including its framework, package manager, routes,
components, content sources, public pages, media, interactive features,
environment setup, and any existing Dyrected installation.

Present a short plain-language checklist of content a non-technical owner could
reasonably manage without changing the design or behaviour.

For each item, state:

- whether it is `Global`, `Collection`, or `Page Section`
- whether editors can `Edit`, `Add/Remove`, or `Arrange`
- whether it has replaceable images, long-form content, or an existing public
  route that should support preview

Do not discuss schemas, databases, field types, adapters, hooks, or technical
implementation.

End with this exact line:

WAITING - Does this list look right? Tell me anything to add, remove, or change. Say "approved" to continue.

Do not proceed until I say "approved."

---

## STAGE 2 - SEPARATE

After I approve the content list, prepare only the approved content for a safe
migration.

- Move content into structured local data only when an intermediate separation
  is necessary to preserve behaviour or make the migration verifiable.
- Do not refactor content that can be connected safely without that step.
- Keep runtime logic, state, event handlers, calculations, validation,
  animation, authentication, and submissions in code.
- Use serializable local content shapes. Store stable names for icons,
  components, and variants instead of executable values.
- Preserve rich content, media references, content order, and the current
  interface.
- Run the project's available validation commands and fix regressions caused by
  this stage.

End with this exact line:

WAITING - Does the website still look and behave exactly as before? Say "approved" to continue, or describe anything that looks wrong.

Do not proceed until I say "approved."

---

## STAGE 3 - PLAN

After I approve Stage 2, present the editing plan in plain language.

State:

- what becomes a shared `Global`
- what becomes a repeatable `Collection`
- which existing public pages become page entries
- which visible sections become reusable page-section blocks
- which existing section variants editors may choose
- what editors may edit, add/remove, arrange, hide, preview, or publish
- which images and long-form content become editable
- which interactive definitions become editable and which behaviour remains
  protected in code
- which existing content seeds the initial data
- which existing routes support preview
- whether editors can create new pages and, if so, how those pages appear on
  the existing site

Use names from the project. Do not invent generic collections or page types.
Do not show raw config, field definitions, or code.

End with this exact line:

WAITING - Does this plan match what your client should be able to manage? Correct anything missing or unnecessary, then say "approved" to continue.

Do not proceed until I say "approved."

---

## STAGE 4 - INSTALL

After I approve Stage 3:

If credentials are not already configured, ask me for the following in one
message:

- Site ID
- Site API key
- Base URL

Wait for my reply before using credentials.

Then complete the integration in batches of no more than three related content
areas.

- Use the official CLI initialization flow when Dyrected is absent. For agent
  automation, pass non-interactive `dyrected init` options from the installed
  CLI instead of bypassing setup because the default command can prompt.
- Complete existing generated setup when Dyrected is partially installed.
- Read the current docs and installed package types before each Dyrected feature.
- Define only the approved globals, collections, blocks, variants, fields,
  validation, access, workflows, and previews.
- Use dedicated `define[FieldName]Field` helpers and `defineBlock`.
- Use `defineRichTextField` for formatted blog, article, policy, case-study, and
  other long-form bodies. Do not put Markdown in a textarea field.
- Give every collection and global a valid, semantically appropriate Lucide
  `admin.icon` name.
- Seed only approved existing content without overwriting populated data.
- Make Dyrected the real runtime source for each completed content area.
- Preserve the existing routes, components, design, and behaviour.
- For previewable pages, prefer postMessage live preview: server-fetch the
  published data, pass it into a hydrated component, and use the installed
  `useLivePreview` helper to overlay draft data.
- Render ordered page sections with the installed blocks renderer and installed
  field-path helpers when available; do not hand-build block indexes or preview
  path strings.
- Add safe loading, empty, error, and fallback handling.
- Keep private credentials and non-serializable values out of browser data.
- Generate types and validate the local schema before schema synchronization.
- Before synchronization, report any change that could affect stored content.

For each batch, run the project's available generation, schema validation,
lint, type-check, focused test, and build commands. Fix failures before adding
another batch. After the final batch, synchronize the schema and verify the
embedded Admin, public routes, preview routes, and one real edit end to end.

If a check cannot run, explain the exact environmental limitation and use the
next-best available verification.

Summarize what is editable, addable, removable, arrangeable, previewable, and
protected; which routes read from Dyrected; and which checks passed.

End with this exact line:

WAITING - Open the editor and change one piece of content. Confirm it appears on the website, then say "approved" to continue. If something looks wrong, describe what you changed and what you see.

Do not proceed until I say "approved."

---

## STAGE 5 - HANDOFF

After I approve Stage 4, confirm the setup is complete.

Remind me to:

1. Publish through the existing host or deployment tool.
2. Invite the client as an Editor under Settings > Team > Invite.
3. Test the client's account before sending the login.
4. Test one available page preview.
5. Test one normal content edit.
6. Test one content-driven feature edit if one was included.

Provide a short client handoff message in plain language. Explain:

- what the client can edit
- what the client can add, remove, hide, or arrange
- which page sections and approved variants they can use
- which images and long-form content they can replace or edit
- which interactive content definitions they can manage
- where preview is available
- how to access the editor
- that design, layout, and unsupported section changes still come through the
  developer
- that behaviour, scoring, submissions, dashboards, authentication, and user
  data remain separate unless explicitly included
- that important content should not be deleted without checking first

Do not include technical setup details in the client message.

End exactly with:

COMPLETE - The handoff is ready.
