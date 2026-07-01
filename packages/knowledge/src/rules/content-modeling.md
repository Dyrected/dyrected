## Core Philosophy

Dyrected should make websites editable as structured content, not as one large page object.

The website should be modelled using:

1. Globals
2. Collections
3. Reusable Page Sections

Globals are for shared site-wide settings.

Collections are for repeatable business content.

Page Sections are reusable building blocks that editors can use to build and update pages.

If something is a meaningful page section, it should be treated as a reusable section type by default.

Do not lock a section to only one page unless it is truly technical interface logic and not website content.

Do not ask whether the page should be fixed or flexible.

If the website contains meaningful visible sections, use reusable Page Sections by default.

The editor should be able to choose where approved section types are used.

The editor should be able to arrange approved Page Sections where Dyrected supports page blocks.

Preserve the existing design by limiting editors to approved section types, approved variants, and safe editable fields.

Do not let editors create arbitrary layouts the frontend cannot render.

Do not let editors create arbitrary styles, variants, components, or unsupported blocks.

---

## Dyrected Documentation Rule

Before using any Dyrected feature, read the relevant Dyrected documentation.

Full documentation index (fetch this first to navigate all available pages):
https://docs.dyrected.com/llms.txt

Main documentation:
https://docs.dyrected.com

Schema and initialData:
https://docs.dyrected.com/docs/concepts/schema

Fields:
https://docs.dyrected.com/docs/reference/fields

Configuration, admin options, useAsTitle, previewUrl, previewMode, and urlPattern:
https://docs.dyrected.com/docs/reference/configuration

Admin and Live Preview:
https://docs.dyrected.com/docs/admin/overview

Storage and media:
https://docs.dyrected.com/docs/adapters/storage

Use only APIs, configuration options, field types, hooks, preview options, media options, and behaviour supported by the installed Dyrected package and the current documentation.

If the documentation and installed package differ, explain the mismatch in plain language and use the installed package as the source of truth.

Do not invent Dyrected functions, configuration options, hooks, field types, access rules, storage options, preview options, or package APIs.

Do not guess.

If something is not supported, say so plainly and choose the safest supported approach.

---

## Content Architecture Rules

Every editable item must belong to exactly one of these content categories:

1. Global
2. Collection
3. Page Section

Do not store every page as a global.

Do not treat a whole page as one editable object unless the page truly contains only one meaningful content section.

Do not preserve a page as one large CMS object just because the current code is written as one large component.

The CMS model should follow the visible content structure of the website, not just the current code structure.

---

## Global

Use a Global only for content that has exactly one shared version across the website.

Good examples:

- Site name
- Logo
- Navigation
- Footer
- Company contact details
- Social links
- Default SEO content
- Shared announcement banner
- Shared business information

Do not use a Global as a dumping ground for an entire page.

Do not put homepage sections, landing page sections, services, testimonials, FAQs, projects, products, team members, blog content, or page sections into globals unless they are truly single shared site-wide settings.

Globals are usually edited in one place and reused across the whole website.

---

## Collection

Use a Collection when the website has, or is likely to have, multiple entries of the same business concept.

Strong signals:

- Cards
- Lists
- Grids
- Repeatable items
- Multiple similar entries
- Content that can grow over time
- Content that represents a real-world business entity
- Content definitions that power interactive experiences

Good examples:

- Services
- Team members
- Testimonials
- FAQs
- Projects
- Case studies
- Products
- Blog posts
- Events
- Pricing plans
- Partners
- Portfolio items
- Resources
- Locations
- Questions
- Options
- Result categories
- Recommendations
- Assessment questions
- Quiz questions
- Product finder options
- Calculator ranges
- Booking services

Collections should represent business content, not UI layout.

Good names:

- Services
- Testimonials
- Team Members
- Projects
- FAQs
- Blog Articles
- Questions
- Result Categories

Bad names:

- Blue Cards
- Section Two Items
- Homepage Boxes
- Three Column Grid

Use clear names based on the language already used by the project.

If a section displays a list of real-world items, model the list as a Collection unless the items are clearly decorative or purely layout-specific.

---

## Page Section

Use a Page Section when the content exists because of where it appears on a page.

A Page Section is a meaningful block of content inside a page.

Page Sections should be reusable by default.

Good examples:

- Hero
- Feature Grid
- Statistics
- Call to Action
- Testimonials Section
- FAQ Section
- Gallery
- Logo Cloud
- Pricing Section
- Comparison Table
- Timeline
- Contact Section
- Newsletter Section
- Benefits Section
- Process Section
- Assessment CTA
- Booking CTA
- Warning CTA
- Profile Section
- Blog CTA
- Featured Posts Section
- Services Preview Section
- Interactive Tool Intro Section
- Result Summary Section

Page Sections belong inside pages, but the section type itself should be reusable.

For example, do not create:

- Home Hero
- About Hero
- Blog Hero
- Services Hero

if they are all versions of the same idea.

Instead create:

- Hero Section

with variants such as:

- Hero with Image
- Centered Hero
- Minimal Hero
- Blog Hero
- Split Hero

A variant controls the approved visual style of a reusable section.

The editor should be able to use the approved Hero Section where it makes sense, then choose an approved variant.

Do not convert page sections into globals simply because only one currently exists.

Do not create separate section types merely because the wording differs.

If multiple pages contain similar section types, create one reusable section type with variants instead of separate page-specific sections.

---

## Hero Section Rule

Hero must be treated as a reusable Page Section when it appears on more than one page.

Do not add Hero as a top-level field on the Pages collection.

Do not create separate hero fields per page.

Do not create:

- homeHero
- aboutHero
- blogHero
- servicesHero

Do create:

- Hero Section block

with approved variants such as:

- Centered Hero
- Hero with Image
- Split Hero
- Minimal Hero
- Blog Hero

Every page that has a hero should include a Hero block inside the page layout/sections blocks field.

Good page shape:

Page:

- title
- slug
- layout:
  - Hero block
  - Feature Grid block
  - CTA block

Bad page shape:

Page:

- title
- slug
- hero
- layout:
  - Feature Grid block
  - CTA block

The Hero belongs in the same reusable block system as other Page Sections.

---

## Section Reuse Rule

Every meaningful page section should be treated as a reusable section type by default.

If the visible page contains multiple content areas such as:

- Hero
- Features
- Services
- Testimonials
- FAQ
- CTA
- Gallery
- Stats
- Process
- Contact
- Timeline
- Profile
- Pricing
- Blog CTA
- Assessment CTA
- Result Summary
- Interactive Tool Intro

model them as separate reusable Page Sections.

Do this even if the current code does not have separate section components.

Do this even if the page is currently built as one large component.

Do this even if the current content is stored as one large object.

The current code structure should not force the CMS structure.

The visible website structure should drive the CMS structure.

---

## Content-First Modelling

Model the meaning of the content before modelling the UI.

The content model should still make sense if the website is redesigned later.

Good:

- Services
- Testimonials
- Case Studies
- Team Members
- Hero Section
- CTA Section
- FAQ Section
- Process Section
- Blog Articles
- Questions
- Result Categories
- Recommendations

Poor:

- Left Cards
- Green Boxes
- Homepage Row
- Section Two
- Component Content

Do not name content based only on visual layout, color, spacing, or component position.

Use names the website owner will understand.

---

## Content-Driven Feature Rule

Some website content powers interactive features.

Do not exclude content merely because it appears inside a quiz, assessment, calculator, booking flow, form wizard, configurator, onboarding flow, recommendation tool, product finder, diagnostic, survey, eligibility checker, pricing estimator, course placement test, application form, or other interactive experience.

Separate the editable content model from the application logic.

CMS-managed content may include:

- Questions
- Prompts
- Labels
- Options
- Option descriptions
- Option scores or weights, if they already exist as data
- Result categories
- Score ranges
- Recommendations
- Descriptions
- Help text
- Step content
- Display rules that already exist as data
- Messages shown to users
- CTA copy
- Images used inside the flow
- Result page copy
- Explanation text shown after interaction

Application logic should usually stay in code:

- State management
- Form navigation
- Score calculation functions
- Validation behaviour
- Conditional rendering logic
- Authentication behaviour
- localStorage/session behaviour
- API calls
- Submission handling
- Dashboard history
- User-specific saved results
- Analytics

Do not treat content as application logic just because application logic uses it.

If the website owner would reasonably want to edit the questions, options, labels, recommendations, ranges, messages, or user-facing result content, include that content in the CMS plan.

If changing a value could break the feature, protect it with validation, required fields, allowed options, limits, versioning, or admin-only access instead of excluding it automatically.

Do not store user submissions, user answers, private user history, analytics, or personal records in Dyrected unless the approved plan explicitly includes product data management.

Dyrected should manage the content definition.

The app code should manage the behaviour.

Product data should be separate unless explicitly approved.

---

## Pattern Detection

Before deciding the structure, compare every page, route, and major component.

Look for repeated visual and content patterns.

If similar sections appear across multiple pages, treat them as the same reusable section type.

Examples of reusable section types:

- Hero
- Feature Grid
- FAQ
- Testimonials
- CTA
- Pricing
- Gallery
- Stats
- Process
- Contact
- Logo Cloud
- Timeline
- Profile
- Blog CTA
- Assessment CTA
- Result Summary

If the sections look different but serve the same purpose, use one section type with variants.

Example:

Hero Section

- Centered Hero
- Hero with Image
- Split Hero
- Minimal Hero

CTA Section

- Simple CTA
- CTA with Image
- Warning CTA
- Final CTA

Feature Section

- Feature Grid
- Feature List
- Feature Cards

Do not duplicate similar structures across different globals.

Do not create one-off page-only sections when a reusable section type with variants would work.

---

## Page Decomposition

When analysing a page:

1. Identify the page.
2. Inspect the visible UI.
3. Split the page into meaningful content sections based on what the visitor sees.
4. Identify repeatable content inside each section.
5. Decide whether repeatable content should be a Collection or local section items.
6. Decide whether similar sections should share one reusable section type with variants.
7. Prepare the page to be represented as an ordered list of approved reusable sections.

Never treat an entire page as a single editable object unless the page contains only one logical content section.

If a page is currently built as one large component or one large content object, still inspect the visible UI and break it into meaningful sections based on what the user sees.

Do not preserve a page as one CMS object just because the code is not already separated into section components.

If the visible page contains multiple content areas such as hero, features, services, testimonials, FAQ, CTA, gallery, stats, or contact, model them as separate Page Sections even if the current code does not have separate section components.

Good:

Home Page

- Hero Section
- Services Preview Section
- Testimonials Section
- CTA Section

Bad:

Home Page

- One global object containing all homepage content

---

## Future Growth Rule

Choose structures that continue working as the business grows.

Assume the website owner may later need to:

- Add another service
- Add another team member
- Add another testimonial
- Add another FAQ
- Add another project
- Add another product
- Add another case study
- Add another blog article
- Add another question
- Add another result category
- Create another landing page
- Reuse a section on another page
- Change the order of sections
- Use a hero section on a new page
- Use a CTA section in more than one place

Prefer reusable Page Sections for page content.

Prefer Collections for repeatable business content.

Prefer Globals only for shared site-wide content.

Do not over-engineer.

Do not allow arbitrary design freedom that the existing frontend cannot safely render.

---

## Page Builder Rule

Dyrected page content should use approved reusable sections as building blocks.

If the website has meaningful visible page sections, implement page content as reusable section blocks.

Do not ask whether the page should be fixed or flexible.

Use page builder-style structure by default, but keep it controlled.

Editors may arrange approved section types.

Editors may choose approved section variants.

Editors may edit safe content fields.

Editors must not create arbitrary layouts, arbitrary components, arbitrary styles, or unsupported section types.

The page builder should be safe, structured, and limited to the existing design system.

---

## Page Collection Rule

The Pages collection should use the page title as the admin display title.

Always set:

admin.useAsTitle = "title"

Do not use slug as the primary title in the editor unless no human-readable title exists.

The page slug is for routing.

The page title is for humans.

The Pages collection should contain page metadata fields such as:

- title
- slug
- SEO fields, if present
- layout / sections blocks

The Pages collection should represent each page as an ordered list of approved reusable Page Section blocks.

Do not place visible page sections such as Hero, CTA, FAQ, Testimonials, Contact, Pricing, Feature Grid, Gallery, Stats, Process, Profile, Services Preview, Result Summary, or Blog CTA as top-level fields on the Pages collection.

All meaningful visible page content should be represented as reusable blocks inside the page layout/sections field.

If Hero appears across multiple pages, Hero must be a reusable block with variants, not a top-level page field.

Use variants for different approved hero styles, such as:

- Centered Hero
- Hero with Image
- Split Hero
- Minimal Hero
- Blog Hero

Use the title field for admin display.

Use the slug field only for routing and URL generation.

---

## Page Preview Rule

When creating a Pages collection, configure Live Preview.

Use Dyrected collection admin preview configuration when supported by the installed package.

Set:

- admin.useAsTitle to "title"
- admin.previewUrl to derive the frontend URL from the page slug
- admin.previewMode to the safest supported preview mode
- admin.urlPattern where useful for internal URL fields

For the home page, map the slug "home" to "/".

For other pages, map the slug to "/{slug}".

Do not hardcode production-only preview URLs.

Use the project’s existing public site URL environment variable if available.

If no public site URL exists, add a clear public environment variable such as:

- NEXT_PUBLIC_SITE_URL for Next.js
- NUXT_PUBLIC_SITE_URL for Nuxt
- VITE_SITE_URL for Vite
- the framework-appropriate equivalent for the project

If previewMode is "token", ensure the frontend preview route knows how to read the preview token according to the installed Dyrected package documentation.

If previewMode is "postMessage", ensure the frontend can receive the current document data safely according to the installed Dyrected package documentation.

Do not invent preview behaviour.

Read the installed package types and Dyrected documentation before implementing preview.

If preview is not supported by the installed package, explain that plainly and continue with the rest of the setup.

---

## Blog and Routable Collection Preview Rule

When creating a Blog Articles collection or any routable article/content collection, configure Live Preview when supported.

Set:

admin.useAsTitle = "title"

Do not use slug as the primary display title for blog articles.

The article title is for humans.

The article slug is for routing.

For blog articles, map the slug to:

/blog/{slug}

For other routable collections, derive the preview URL from the existing project route pattern.

Examples:

- /projects/{slug}
- /case-studies/{slug}
- /resources/{slug}
- /products/{slug}

Use the project’s existing route structure.

Do not invent a new route structure.

Do not hardcode production-only preview URLs.

Use the project’s existing public site URL environment variable if available.

---

## Variant Rule

Use variants when one reusable section type can appear in different approved styles.

Examples:

Hero Section variants:

- Centered Hero
- Hero with Image
- Split Hero
- Minimal Hero
- Blog Hero

CTA Section variants:

- Simple CTA
- Final CTA
- Warning CTA
- CTA with Image

Feature Section variants:

- Feature Grid
- Feature List
- Feature Cards

Contact Section variants:

- Contact Channels
- Contact Form Intro
- Contact CTA

Do not create separate block types when one section type with a variant field would be clearer.

Do not allow editors to type arbitrary variant names.

Use select options based on variants that already exist in the project.

---

## Media and Image Rule

Images that communicate website content must be managed in Dyrected.

Do not leave content images hardcoded unless they are purely decorative or part of the application interface.

Editable images include:

- Hero images
- Blog cover images
- Blog inline images
- Author photos
- Team member photos
- Testimonial photos
- Service images
- Project images
- Product images
- Gallery images
- CTA images
- Profile images
- Logo or brand images managed by the site owner
- Open Graph images
- SEO images
- Images used inside content-driven interactive features

Decorative images, icons, backgrounds, and design-only assets may stay in the UI when changing them would be a design change rather than a content update.

When an editable image is found:

- Add it to the Stage 1 content checklist
- Include alt text where appropriate
- Use Dyrected image fields for image references
- Create or use an upload-enabled Media collection when needed
- Do not store image URLs as plain text unless the current Dyrected package or project setup does not support image fields
- Do not manually build image URLs in frontend code
- Use the media document URL returned by Dyrected
- Preserve existing image dimensions, cropping behaviour, aspect ratio, styling, and responsive behaviour

If the project uses Dyrected Cloud, do not configure a custom storage adapter unless the documentation or project setup requires it.

If the project is self-hosted and uses upload-enabled collections, configure a supported storage adapter according to the installed Dyrected version and documentation.

Do not fake media documents.

Do not seed image references unless the corresponding media documents exist or can be created safely.

---

## Rich Content Rule

Do not break long-form content into arrays of strings unless the existing UI truly needs separate repeatable plain-text items.

For blog posts, articles, policy pages, case studies, long about pages, resource pages, lesson content, and other long-form editorial content, preserve the content as rich structured content.

During local content separation:

- If the existing content is long-form prose, extract it as one semantic HTML string.
- Preserve paragraphs, headings, lists, links, quotes, inline emphasis, and meaningful formatting.
- Do not convert blog body content into arrays like ["paragraph one", "paragraph two"] unless the design explicitly treats them as separate items.
- Do not flatten rich content into plain text if formatting matters.
- Do not invent formatting that does not already exist.

During Dyrected integration:

- Prefer Dyrected richText for long-form editable content when supported by the installed package.
- Remember that Dyrected richText stores structured rich text content, not a plain array of paragraph strings.
- If local content was extracted as HTML, convert or migrate it into the supported richText format using documented or installed tools.
- If conversion is not supported by the installed package, explain the limitation plainly and use the safest supported field type.
- Do not render rich HTML unsafely in the browser.
- If HTML must be rendered, sanitize it or render it only through a trusted server-side boundary.
- Preserve headings, paragraphs, lists, links, quotes, inline emphasis, and meaningful formatting in the frontend.

Good local separation:

```typescript
bodyHtml: "<h2>...</h2><p>...</p><ul><li>...</li></ul>"
```

Bad local separation:

```typescript
body: [
"Paragraph one",
"Paragraph two",
"Paragraph three"
]
```

Only use arrays when the content is truly a repeatable list of items, such as FAQs, services, testimonials, steps, features, links, or cards.

---

## Initial Data Rule

When moving existing website content into Dyrected, do not leave the CMS empty.

Use Dyrected initialData to seed approved existing content into the relevant globals and collections.

Use initialData for:

- Existing globals such as site settings, navigation, footer, contact details, social links, default SEO content, and shared business information
- Existing collections such as services, testimonials, FAQs, blog articles, projects, team members, products, resources, locations, questions, result categories, assessment questions, and assessment result categories
- Existing page entries
- Existing reusable page section content inside page entries
- Existing navigation/footer content
- Existing booking copy
- Existing content-driven feature definitions
- Existing default site settings

Do not use initialData to invent demo content.

Only seed content that already exists in the project.

Remember that initialData runs only when the target global or collection is empty.

If content already exists in Dyrected, do not overwrite it with initialData.

For Pages initialData:

- Seed each existing page as a page document.
- Use title as the human-readable page title.
- Use slug only for routing.
- Seed layout as an ordered list of reusable section blocks.
- Put Hero inside the layout blocks, not as a top-level page field.
- Include blockType values or the installed Dyrected equivalent for every reusable section block.
- Include approved variant values where a section has variants.

For long-form content:

- Seed blog/article bodies using the approved rich content format.
- Do not seed blog content as arrays of paragraph strings.
- Prefer richText when supported.
- If using local HTML as an intermediate format, migrate it into the supported Dyrected richText format or safest supported field.

For images:

- Seed image references only when the corresponding media documents exist or can be created safely.
- Do not fake image URLs.
- Do not manually reconstruct storage paths.
- Use Dyrected media document URLs and image fields.
- If media seeding is not supported or not safe, seed text content first and clearly explain what image upload step remains.

---

## CMS Source of Truth Rule

Creating Dyrected collections, globals, blocks, fields, and initialData is not enough.

After content is added to Dyrected, every frontend route that displays that content must be wired to read from Dyrected as the source of truth.

Do not leave the frontend rendering local JSON, local constants, hardcoded arrays, static imports, markdown files, or old data modules for content that is now managed in Dyrected.

initialData is only a seed.

initialData must not be treated as the runtime content source.

After seeding content into Dyrected:

- fetch globals from Dyrected where globals are displayed
- fetch collections from Dyrected where collection content is displayed
- fetch page documents from Dyrected where page content is displayed
- fetch reusable page sections from the page layout/sections blocks field
- fetch content-driven feature definitions from Dyrected where interactive features display editable questions, options, result categories, labels, or recommendations
- keep local JSON only as a temporary fallback during development or failure handling
- remove or stop using duplicate local content sources after final verification

For each page or route, trace the render path and confirm the visible content comes from Dyrected, not from the original local files.

Do not mark a CMS integration as complete just because content appears in the Admin UI.

The integration is complete only when the frontend displays the Dyrected-managed content.

---

## Fresh Content and Cache Rule

CMS edits should appear on the website without requiring a code change or redeploy.

When connecting frontend routes to Dyrected, inspect the framework’s caching behaviour.

For Next.js:

- do not let CMS-powered pages stay permanently static if editors expect updates to appear after publishing
- use dynamic rendering, revalidation, no-store fetches, preview mode, or the project’s existing cache strategy as appropriate
- preserve performance, but do not hide CMS edits behind stale static builds

For Nuxt:

- inspect SSR, payload caching, route rules, Nitro caching, and static generation behaviour
- use the project-appropriate freshness strategy so CMS edits can appear according to the expected publishing workflow

For Vite/static apps:

- explain if runtime CMS updates require client-side fetching, SSR, rebuild hooks, or another supported approach

For other frameworks:

- use the framework-appropriate freshness strategy
- make sure CMS edits can appear according to the expected publishing workflow

Do not claim the CMS is connected until an edited CMS value can appear on the frontend route.

---

## CMS Data Shape Adapter Rule

Dyrected field shapes may not match the old local data shape exactly.

When connecting Dyrected data to existing components:

- add a small adapter or normalizer where needed
- keep existing component markup and behaviour unchanged
- normalize CMS arrays, relationships, media fields, rich text, and blocks into the shape the current UI expects
- do not change the schema just to match old component internals if a small adapter is safer
- do not change the UI design to match the CMS response shape

Example:

If the old UI expects:

sliderLabels: ["Low", "Medium", "High"]

but Dyrected stores:

sliderLabels: [{ label: "Low" }, { label: "Medium" }, { label: "High" }]

normalize it before passing data to the component.

Adapters should be small, explicit, and easy to remove or update later.

---

## Edit-to-Frontend Verification Rule

For every content area connected to Dyrected, verify the full edit loop:

1. Content exists in Dyrected.
2. The frontend fetches it from Dyrected.
3. The route no longer depends on the old local content source.
4. A changed CMS value appears on the website.
5. The page still builds successfully.
6. The page still preserves the existing layout and behaviour.
7. Fallback content is used only when Dyrected is unavailable, not as the normal source.

Do not mark a content batch complete just because the Admin UI shows editable fields.

A batch is complete only when the frontend displays the Dyrected-managed content.

---

## Common Mistakes to Avoid

Do not:

- Make every page a global
- Make every page one large CMS object
- Preserve a large page object just because the code is currently written that way
- Treat “reusable” and “reorderable” as separate from Page Sections
- Lock Page Sections to one page unnecessarily
- Ask whether to use fixed pages when the site has meaningful sections
- Put Hero as a top-level field on the Pages collection
- Put CTA, FAQ, Testimonials, Contact, Pricing, Feature Grid, Gallery, Stats, Process, Profile, Result Summary, or Services Preview as top-level fields on the Pages collection
- Use slug as the admin display title when a human-readable title exists
- Forget admin.useAsTitle = "title" for Pages and routable collections
- Forget page preview configuration for Pages and Blog Articles when supported
- Hardcode production-only preview URLs
- Make every heading a separate field without context
- Create collections for content that appears only once and is not expected to grow
- Create globals for reusable page sections
- Model UI components instead of business content
- Merge unrelated sections into one large object
- Duplicate content between globals, collections, and pages
- Extract technical UI text that belongs to application behaviour
- Exclude content merely because it appears inside an interactive feature
- Treat questions, options, recommendations, or result categories as application logic when they are editable content definitions
- Store user submissions or private user records in Dyrected unless explicitly approved
- Leave content images hardcoded when they should be editable
- Store editable images as plain text URLs when image fields/media are supported
- Manually reconstruct media storage paths
- Extract blog body content as arrays of paragraph strings
- Flatten long-form content into plain text when formatting matters
- Leave Dyrected empty when existing content can be seeded with initialData
- Stop after schema and initialData without wiring the frontend to Dyrected
- Leave frontend routes reading old local JSON or constants for CMS-managed content
- Hide CMS edits behind stale framework caching
- Destroy the current component structure unnecessarily
- Make the website harder to maintain just to make content editable
- Add fields for content that does not already exist
- Add example content that was not already in the project
- Add new pages, sections, features, images, blog posts, routes, or product behaviour
- Allow arbitrary blocks that the frontend cannot render
- Allow arbitrary variants that do not exist in the design
- Allow editors to break the layout by entering unsupported values

---

## What Counts as Editable Content

Treat something as editable when changing it would update what the website communicates, asks, shows, recommends, or presents without changing how the interface fundamentally works.

Strong signals include:

- The website owner may need to update it after launch
- It represents a complete piece of information
- It appears in a repeatable list
- It belongs to a business concept
- It appears in a meaningful content section
- It can change without requiring a layout or behaviour change
- It can reasonably be edited by a non-technical website owner
- It can be reused across pages or entries
- It is an image that communicates website content
- It is long-form editorial content that the website owner may update
- It powers an interactive feature as editable definition/content

Examples:

- Hero headline
- Hero subtitle
- Hero image
- CTA text
- CTA link destination, if already present
- Service names
- Service descriptions
- Service images
- Testimonials
- Testimonial photos
- Team member details
- Team member photos
- FAQs
- Pricing details
- Project details
- Product details
- Blog titles
- Blog excerpts
- Blog cover images
- Blog body content
- Author details
- Contact information
- About content
- Section headings
- Section supporting text
- Images that communicate business content
- Questions inside quizzes, assessments, surveys, or diagnostic tools
- Question help text or comments
- Answer options
- Option labels
- Option scores or weights, if they already exist as data
- Result categories
- Score ranges
- Result summaries
- Recommendations
- Booking copy, if it communicates service information
- Step copy inside a form wizard
- Messages shown to users inside an interactive flow

---

## What Should Stay in the UI or App Code

Keep content inside components or app code when it controls or explains how the interface works.

This includes:

- Technical status messages
- Error messages
- Empty state text that belongs to app behaviour
- Accessibility labels tied to controls
- Form behaviour text
- Validation messages
- Navigation or control labels that are part of application logic
- Button labels that trigger application behaviour rather than marketing/content meaning
- Loading states
- Authentication text
- Dashboard interface text
- Text tightly joined to conditional rendering
- Decorative elements
- Decorative images
- Decorative backgrounds
- Icons used only as design elements
- Layout text used only for animation or visual effects
- Layout, styling, animation, and responsive behaviour
- Event handlers
- Application state
- Score calculation functions
- Form navigation logic
- localStorage/session behaviour
- API calls
- Submission handling
- Dashboard history
- User-specific saved results
- Analytics
- Fragments whose extraction would make the component harder to understand without making the website easier to manage

Do not extract something merely because it is a string.

Do not extract an image merely because it is an image.

Only extract images that communicate website content or are reasonably managed by the website owner.

