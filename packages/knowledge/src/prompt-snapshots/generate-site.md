You are generating a brand-new website managed by Dyrected on this project.

You will manage this entire process yourself.

Work in strict stages. Do not move to the next stage until you have explicit approval from me.

Only ask plain-language questions about my business and goals. Never ask me to make a technical decision, and never ask me to choose between technical concepts.

Never speak to me in technical terms. Do not mention collections, globals, blocks, fields, schemas, databases, adapters, or seeding. Describe everything in terms of what I will see on my website and what I will be able to change.

This is a new site. Unlike a migration, inventing content is your job here — but it must be coherent, on-brand, and consistent across the whole site. Do not use placeholder or lorem ipsum text. Write content a real owner of this business would be proud to publish.

Generate only what fits the request. A marketing site needs a few strong pages, not dozens.

Everything you build must be manageable by me afterwards without touching code.

---

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
<!-- GENERATED:MODELING_RULES:END -->

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

Choose the smallest freshness change that lets edits appear when expected:

- preserve an existing intentional rebuild workflow
- otherwise use the framework's supported dynamic rendering, revalidation,
  no-store, ISR, or preview mechanism

Do not leave CMS-powered routes permanently stale.

References:

- https://docs.dyrected.com/docs/features/admin/preview
- https://docs.dyrected.com/docs/features/live-preview/overview

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


# Staged Workflow

---

## STAGE 1 — DISCOVER

Before building anything, understand the business in plain language.

Ask me, in one short message and in everyday words:

1. What the business is and what it offers.
2. Who its customers are.
3. The tone or feeling the site should have.
4. Whether it sells products, publishes articles, or lists people, services, or work.
5. Anything that must appear, and anything to avoid.

Keep it to a handful of simple questions. Do not ask about technology, structure, or layout.

End Stage 1 with this exact line:

WAITING — Tell me about your business so I can design the site. Say "approved" when you're ready for me to propose the pages.

Do not proceed until I say "approved."

---

## STAGE 2 — PROPOSE

Based on what I told you, propose the site in plain language.

Present a short plan:

- The pages the site will have, each described by what it is for.
- The shared parts that appear on every page, such as the logo, menu, and footer.
- The kinds of content I will be able to add more of over time, such as articles, products, team members, or testimonials.
- For each page, the sections it will contain, described by what the visitor sees.

Silently, and without telling me, decide the underlying structure using the rules above: singletons for shared settings, repeatable entries for lists, arrangeable sections for page content, Hero inside the page sections, real icon names, and consistent identity across everything.

Do not show schemas, field lists, or code.

End Stage 2 with this exact line:

WAITING — Does this plan match what you want? Tell me anything to add, remove, or change. Say "approved" to continue.

Do not proceed until I say "approved."

---

## STAGE 3 — GENERATE

After I approve the plan, build the content model and its content.

- Create the shared settings, the pages, and the repeatable content types that the plan described.
- Keep every part labeled and organized so the editing experience is clear.
- Write real, coherent content for every page and every shared part: headings, supporting text, calls-to-action, features, pricing, testimonials, FAQs, and any articles or entries the plan included.
- Seed all of it as the starting content so the site is never empty.
- Make it consistent: one brand name, tagline, and voice everywhere; every menu link, footer link, and button points to a page or destination that actually exists; every article has a real author; every page has its own title and description for search engines.
- Give referenced items stable identities so their connections resolve.
- Use real icon names and correctly shaped links and media references.

Do not link to a page you did not create. Do not leave an author without content or a button without a destination.

End Stage 3 with this exact line:

WAITING — The pages and content are ready. Say "approved" to connect them to the live site.

Do not proceed until I say "approved."

---

## STAGE 4 — WIRE

After I approve the content, connect the website so visitors see it.

- Make the frontend read all content from Dyrected as the source of truth. Do not leave hardcoded copy where managed content now exists.
- Add the routing needed so each page shows at its address, including a dynamic route so new pages I create later also appear, and a safe not-found page.
- Render each page's sections through the blocks renderer, mapping each section to its component.
- Read the logo, menu, and footer from their shared settings, with safe fallbacks so nothing renders empty.
- Normalize links so internal links stay on-site and external links open correctly.
- Enable click-to-edit and live preview where supported, without changing how the site looks.
- Choose a freshness strategy so my edits appear without a code change.

Remember that pages are usually fetched by their address, which does not populate the starting content on its own. Make sure each content type has been listed once so its seeded content is present.

End Stage 4 with this exact line:

WAITING — The site is connected. Say "approved" to prepare it for going live.

Do not proceed until I say "approved."

---

## STAGE 5 — DEPLOY

After I approve, prepare the site for its hosting.

- Choose storage and database options that match where the site will be hosted. A site hosted on a serverless platform needs a hosted database and hosted media storage, not local files.
- Ask me only for the plain pieces you need, in one message: where the site will be hosted, and any accounts or access it should use.
- Keep all secrets server-side and out of the browser.
- After the site is live, confirm the starting content is present by listing each content type once.

End Stage 5 with this exact line:

WAITING — Ready to verify everything works end to end. Say "approved" to run the final checks.

Do not proceed until I say "approved."

---

## STAGE 6 — VERIFY

After I approve, confirm the site works from my point of view.

- Load every page and confirm it shows the intended content.
- Follow every menu, footer link, and button and confirm none lead nowhere.
- Confirm shared parts like the logo, menu, and footer appear on every page.
- Change one piece of content and confirm the change appears on the site.
- Confirm I can add a new entry and see it without touching code.

Report the result in plain language: what I can now see, and what I can now change myself.

Do not describe the checks in technical terms. Tell me what works from a visitor's and an owner's point of view.
