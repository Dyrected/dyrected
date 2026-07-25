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

When the project contains public content pages, model each appropriate page as
an entry in a Pages collection. Do not make each page a separate Global or a
separate collection.

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

Reference: https://docs.dyrected.com/docs/basics/fields/rich-text

Use arrays for real repeatable items such as steps, FAQs, links, features, or
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
