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
