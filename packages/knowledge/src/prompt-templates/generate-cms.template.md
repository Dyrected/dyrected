You are setting up Dyrected on this project.

You will manage this entire process yourself.

Work in strict stages. Do not move to the next stage until you have explicit approval from me.

Only ask plain-language questions. Never ask me to make a technical decision.

Never invent content, pages, sections, collections, fields, features, routes, images, blog posts, interactive flows, or behaviour that do not already exist in this project.

Preserve the current design, layout, styling, components, routes, content order, visual hierarchy, animations, responsive behaviour, and application behaviour exactly as they are throughout every stage.

Do not redesign the website.

Do not rewrite unrelated code.

Do not improve copy unless I explicitly ask.

Do not add new features.

Do not remove existing features.

Do not extract something merely because it is a string.

Your goal is to make the existing website content manageable in Dyrected without changing how the website looks or works.

---

<!-- GENERATED:MODELING_RULES:START -->
<!-- GENERATED:MODELING_RULES:END -->


# Staged Workflow

---

## STAGE 1 — INSPECT

Before changing any files:

1. Identify the framework and project structure.
2. Inspect the existing pages, routes, components, and local data.
3. Find content that is currently written directly inside the UI.
4. Find content that already lives in local constants, arrays, objects, JSON, markdown, HTML, CMS-like files, or data files.
5. Identify meaningful page sections based on the visible website, not only the current component structure.
6. If a page is built as one large component, break the visible page into meaningful sections based on what the user sees.
7. Identify repeated visual and content patterns across pages.
8. Identify section variants that already exist in the project.
9. Identify repeatable business concepts.
10. Identify editable images and media.
11. Identify long-form rich content such as blog posts, articles, case studies, resource pages, policy pages, or long about content.
12. Identify routable content that should support preview, such as pages, blog articles, projects, products, case studies, or resources.
13. Identify content-driven interactive features such as quizzes, assessments, calculators, booking flows, form wizards, configurators, onboarding flows, recommendation tools, product finders, diagnostics, surveys, eligibility checkers, pricing estimators, course placement tests, or application forms.
14. For content-driven interactive features, separate editable definition/content from runtime application logic and user data.
15. Decide which content a website owner may reasonably need to update without changing the design.
16. Separate editable content from interface text that belongs to the product itself.
17. Classify every editable area as Global, Collection, or Page Section.
18. Classify the reuse type as One-off, Repeatable Collection, or Reusable Section.
19. Classify the editor control as Edit, Add/Remove, or Arrange.

Do not change any files in Stage 1.

Do not discuss filenames, schemas, databases, field types, or technical implementation details.

Do not suggest content that does not already exist.

Do not invent missing pages, sections, images, blog posts, features, questions, options, result categories, or interactive flows.

Present your findings as a short checklist.

For each item, write one line in this format:

- [Where on the website] — [what the owner can change] — [Global / Collection / Page Section] — [One-off / Repeatable Collection / Reusable Section] — [Edit / Add-Remove / Arrange]

Examples:

- Homepage Hero — headline, supporting text, image, image alt text, CTA text and CTA link — Page Section — Reusable Section — Arrange
- About Hero — headline and intro text — Page Section — Reusable Section with Centered Hero variant — Arrange
- Testimonials — testimonial quote, name, role, image, image alt text — Collection — Repeatable Collection — Add/Remove
- Footer — contact details, social links, copyright text — Global — One-off — Edit
- Services Grid — service title, description, icon name — Collection — Repeatable Collection — Add/Remove
- Blog Articles — title, slug, excerpt, cover image, body content, author, publish date — Collection — Repeatable Collection — Add/Remove
- Assessment Questions — question text, help text, answer options, scores/weights if already present — Collection — Repeatable Collection — Add/Remove
- Result Categories — score ranges, summary, recommendations, CTA copy — Collection or Global based on existing structure — Repeatable Collection or One-off — Edit or Add/Remove
- Final CTA — heading, supporting text, CTA text and CTA link — Page Section — Reusable Section — Arrange

Do not use “Fixed” in the checklist.

Do not write paragraphs.

Do not explain why something is editable.

Do not include technical details.

After the checklist, add one short section:

CONTENT STRUCTURE OBSERVATION

Write no more than eight bullets:

- Which reusable section types were found
- Which section variants were found
- Whether Hero appears across multiple pages and should become a reusable block
- Which collections are needed
- Which globals are needed
- Which editable images/media were found
- Which rich content areas were found
- Which content-driven interactive definitions were found

End Stage 1 with this exact line:

WAITING — Does this list look right? Tell me anything to add, remove, or change. Say "approved" to continue.

Do not proceed until I say "approved."

---

## STAGE 2 — SEPARATE

After I approve the content list:

Move only the approved content into structured local data files.

Do not connect Dyrected yet.

Do not install Dyrected yet.

Do not create Dyrected schemas yet.

This stage is only for separating content from UI code safely.

Use the approved content architecture from Stage 1.

Keep genuinely shared content in a shared data file.

Keep repeatable business entities in clearly named structured arrays or objects.

Keep reusable page sections structured in a way that can later map directly to Dyrected blocks.

Represent pages as ordered lists of approved section instances where appropriate.

Each page section instance should reference a reusable section type.

Hero should be represented as a reusable section instance inside the page section list, not as a standalone page-level field.

If the section has approved visual variants, store the variant as a safe value.

If a page is currently built as one large component or one large content object, separate the approved visible sections into meaningful local data structures.

Do not preserve one large page data object merely because the current page code was written as one large component.

For content-driven interactive features, separate editable definitions from runtime logic.

Editable definitions may include questions, prompts, options, labels, result categories, ranges, recommendations, step copy, and user-facing messages.

Runtime logic such as state management, score calculation functions, localStorage behaviour, submissions, and dashboard history should stay in code unless explicitly approved for product data management.

Do not force a major component refactor in this stage unless it is necessary to safely connect the separated content.

If component extraction is useful, extract only the smallest reusable section components needed to preserve clarity and prepare for Dyrected integration.

Use clear names based on the language already used by the project.

Keep the data serializable:

- strings
- numbers
- booleans
- arrays
- plain objects
- null only where the current UI already supports missing values

For long-form editorial content, use semantic HTML strings during local separation instead of arrays of paragraph strings.

Good:
```typescript
bodyHtml: "<h2>...</h2><p>...</p><ul><li>...</li></ul>"
```

Bad:
```typescript
body: [
"Paragraph one",
"Paragraph two",
"Paragraph three"
]
```

Only use arrays when the content is truly a repeatable list of items, such as FAQs, services, testimonials, steps, features, links, cards, questions, options, or navigation items.

For images during local separation:

- Preserve existing image references in a structured way.
- Include alt text where appropriate.
- Keep image paths or imports working exactly as they currently work.
- Do not replace working images with fake URLs.
- Do not remove image styling, dimensions, aspect ratio, or responsive behaviour.
- Prepare editable images to later map to Dyrected media/image fields.

Do not store:

- components
- JSX
- functions
- class instances
- framework-specific objects
- imported icons
- imported images as components inside CMS content
- event handlers
- styles
- animation config
- responsive layout logic
- state management logic
- score calculation functions
- submission handlers
- analytics logic

If the UI needs an icon or visual variant, store a stable name in the content and map that name to the visual component inside the UI.

Example:

- Store "check"
- Map "check" to the CheckIcon component inside the UI

Do not redesign, rewrite, add, remove, or reorder any visible content.

Do not change layout or behaviour.

Do not create new content.

Do not rename visible labels unless necessary to preserve existing behaviour.

Update the existing UI to read from the new data files.

Preserve sensible fallback content only where needed for local testing.

Run the available lint, type-check, test, and build commands.

If the project does not have one of these commands, say so plainly and continue with the commands that do exist.

Fix any errors before continuing.

End Stage 2 with a plain-language summary of what was moved, including:

- Reusable sections separated
- Hero separated as a reusable section if present
- Collections separated
- Globals separated
- Content-driven feature definitions separated, if present
- Runtime logic left in code
- Images prepared for Dyrected media
- Rich content preserved as HTML or the safest local rich format

Then end with this exact line:

WAITING — Does the website still look and behave exactly as before? Say "approved" to continue, or describe anything that looks wrong.

Do not proceed until I say "approved."

---

## STAGE 3 — PLAN

After I approve Stage 2:

Review the separated content.

Present the editing plan as a short checklist grouped by page or area.

Do not write paragraphs or detailed explanations.

For each item, write one line:

- [What the client can change] — [Global / Collection / Page Section] — [One-off / Repeatable Collection / Reusable Section] — [Edit / Add-Remove / Arrange]

Do not use “Fixed.”

For Page Sections, use Reusable Section unless the item is not actually a page section.

For Collections, use Repeatable Collection.

For Globals, use One-off.

Add a short note only if:

- Something must be filled in before saving
- A limit protects the design
- A piece of content should be hidden rather than deleted
- A field should be selected from existing options rather than typed freely
- A section has approved variants
- A collection powers a reusable section
- An image needs alt text
- A media upload step is required
- Long-form content should use richText
- A routable collection should support preview
- A content-driven feature needs validation, versioning, or admin-only controls to protect behaviour

Otherwise write nothing extra.

---

### Reusable Section Types

After the checklist, add a labelled section:

REUSABLE SECTION TYPES

List the approved reusable section types.

For each section type, include:

- The section name
- The approved variants, if any
- The pages where it currently appears
- The fields the editor can change
- Any image fields
- Any collection relationships

Example:

Hero Section

- Variants: Centered Hero, Hero with Image, Blog Hero
- Currently appears on: Home, About, Blog
- Editable fields: eyebrow, heading, supporting text, image, image alt text, CTA text, CTA link

CTA Section

- Variants: Simple CTA, Warning CTA, Final CTA
- Currently appears on: Home, Services, Blog
- Editable fields: heading, supporting text, CTA text, CTA link

---

### Content-Driven Feature Plan

Add a labelled section:

CONTENT-DRIVEN FEATURE PLAN

List interactive features whose editable definitions should be CMS-managed.

For each feature, include:

- Feature name
- Editable content definitions
- Runtime logic that remains in code
- Whether the content should be a collection or global
- Validation or permission rules needed to protect behaviour
- Whether user submissions/history are out of scope

Do not exclude questions, options, recommendations, or result categories just because they are used by application logic.

Do not include user submissions, private results, dashboard history, analytics, or personal records unless explicitly approved.

---

### Page Collection Plan

Add a labelled section:

PAGE COLLECTION PLAN

Explain that the Pages collection will use:

- title as the human-readable admin title
- slug for routing
- layout or sections as the ordered blocks field
- reusable section blocks for all visible page content
- Hero as a reusable block inside the layout/sections field
- SEO fields if existing SEO content is present

State clearly:

The page title should be used as admin.useAsTitle.

The page slug should not be used as the primary admin title.

Visible sections should not be top-level page fields.

---

### Preview Plan

Add a labelled section:

PREVIEW PLAN

List which collections should support Live Preview.

Include:

- Pages collection
- Blog Articles collection, if blog articles exist
- Projects, products, case studies, resources, or other routable collections if they exist

For each previewable collection, include:

- The frontend route pattern
- The human-readable field to use as admin.useAsTitle
- The slug field used for routing
- The environment variable that should provide the public site URL

Do not invent routes that do not exist in the project.

---

### Media Plan

Add a labelled section:

MEDIA PLAN

List editable media that should be managed through Dyrected.

For each item, include:

- Where it appears
- What image/media the editor can change
- Whether alt text is needed
- Whether it belongs to a global, collection, reusable section, or content-driven feature

Do not include decorative images unless they should genuinely be editable by the website owner.

---

### Rich Content Plan

Add a labelled section:

RICH CONTENT PLAN

List long-form content areas.

For each item, include:

- Where it appears
- Whether it should use richText
- What formatting must be preserved
- Whether the current local version should be treated as semantic HTML before migration

Do not plan blog/article body content as arrays of paragraph strings.

---

### Initial Data Plan

Add a labelled section:

INITIAL DATA PLAN

List what existing content should be seeded into Dyrected using initialData.

Include:

- Globals to seed
- Collections to seed
- Pages to seed
- Reusable section content to seed inside pages
- Hero blocks to seed inside page layout/sections
- Rich content to seed
- Media/image content that can be safely seeded
- Content-driven feature definitions to seed

Do not include invented demo content.

Do not overwrite existing Dyrected content.

---

### Frontend Source-of-Truth Plan

Add a labelled section:

FRONTEND SOURCE-OF-TRUTH PLAN

List the routes/components that must stop reading local content and start reading from Dyrected.

For each route, include:

- What Dyrected global, collection, or page document it should fetch
- What local file/module it currently reads from, if found
- Whether a fallback is needed
- Whether caching or dynamic rendering needs attention
- How you will verify a CMS edit appears on the frontend

Do not skip this plan.

Schema and initialData are not enough.

---

### Page Arrangement

Explain in one sentence that pages will be built from approved reusable sections, and editors can arrange those approved sections without changing the underlying design system.

Do not ask whether the page should be fixed or flexible.

End Stage 3 with this exact line:

WAITING — Does this plan match what your client should be able to manage? Correct anything missing or unnecessary, then say "approved" to continue.

Do not proceed until I say "approved."

---

## STAGE 4 — INSTALL

After I approve Stage 3:

Ask me for the following in one message:

- Site ID
- Site API key
- Base URL

Wait for my reply.

Then proceed.

Before writing integration code, read the relevant Dyrected documentation:

Full documentation index (fetch this first to navigate all available pages):
https://docs.dyrected.com/llms.txt

Main documentation:
https://docs.dyrected.com

Schema and initialData:
https://docs.dyrected.com/docs/concepts/schema

Fields:
https://docs.dyrected.com/new-docs/basics/fields/overview

Configuration, admin options, useAsTitle, previewUrl, previewMode, and urlPattern:
https://docs.dyrected.com/new-docs/basics/configuration/overview

Admin and Live Preview:
https://docs.dyrected.com/docs/admin/overview

Storage and media:
https://docs.dyrected.com/new-docs/features/upload/storage-adapters

Inspect:

- The project's package manager
- Framework
- Routing system
- Existing dependencies
- Current environment variable pattern
- Existing server/client boundary
- Existing build process
- Existing TypeScript setup, if any
- Existing image handling
- Existing rich content rendering
- Existing blog/article structure, if any
- Existing route patterns for pages and routable collections
- Existing preview or draft mode support, if any
- Existing data fetching strategy
- Existing caching strategy
- Existing local data files and imports
- Existing content-driven interactive features and data definitions

Check:

- The installed Dyrected package version
- Package exports
- TypeScript types
- Supported APIs
- Supported field types
- Supported image/media fields
- Supported upload/media collection setup
- Supported richText behaviour
- Supported initialData behaviour
- Supported admin.useAsTitle behaviour
- Supported admin.previewUrl behaviour
- Supported admin.previewMode behaviour
- Supported admin.urlPattern behaviour
- Supported frontend client/fetching utilities
- Current documentation

Use only APIs supported by the installed version and current documentation.

If the documentation and installed package differ, explain the mismatch in plain language and use the installed package as the source of truth.

Do not invent Dyrected functions, configuration options, hooks, field types, access rules, storage options, richText converters, media handlers, preview handlers, fetching utilities, or package APIs.

Do not guess.

If something is not supported, say so plainly and choose the safest supported approach.

---

<!-- GENERATED:CMS_GENERATION_RULES:START -->
<!-- GENERATED:CMS_GENERATION_RULES:END -->

---


<!-- GENERATED:FRONTEND_RULES:START -->
<!-- GENERATED:FRONTEND_RULES:END -->

---

## Hooks Rule

Only add hooks when they are needed for approved behaviour.

Use documented hooks only.

Do not invent hook names or lifecycle behaviour.

Every hook must have a client-visible reason.

Examples of acceptable hook reasons:

- Generate a slug from a title
- Prevent deleting content that is required by the design
- Keep item ordering safe
- Validate a published entry
- Hide unpublished content from the website
- Sync a derived field that the client should not edit directly
- Prevent publishing a page with no sections
- Prevent unsupported section variants
- Ensure required media alt text
- Validate rich content before publishing
- Validate previewable documents have title and slug
- Validate question options exist
- Validate result ranges do not overlap

Do not add hooks for speculative future needs.

At the end, explain every hook in plain language.

---

## Error Handling Rules

Add loading, empty, and error handling where needed.

The website should not crash if:

- Dyrected content is missing
- A collection is empty
- An image is missing
- A media URL is unavailable
- Alt text is missing
- A link is missing
- Rich content is empty
- A page has no sections
- A page has no Hero block
- An unknown block type appears
- An unsupported variant appears
- Preview data is unavailable
- Questions are missing
- Options are missing
- Result categories are missing
- The CMS request fails

Use safe fallbacks that preserve the existing experience where possible.

Do not show raw technical errors to website visitors.

---

## Final Verification

Before ending Stage 4:

Confirm:

- Every approved content area is connected once
- Pages are represented using approved reusable sections
- Hero is represented as a reusable block inside page layout/sections
- Hero is not a top-level field on the Pages collection
- Page sections are not collapsed into one large global or page object
- Section variants are limited to approved variants
- Pages collection uses title as admin.useAsTitle
- Blog Articles and other routable collections use title/name as admin.useAsTitle where appropriate
- Slug is used for routing, not as the primary admin display title
- Pages collection has Live Preview configured where supported
- Blog Articles collection has Live Preview configured where supported
- Preview URLs map to existing frontend routes
- Home page preview maps the "home" slug to "/"
- Preview does not expose private credentials
- Editable content images are connected to Dyrected
- Image fields reference upload-enabled media documents where supported
- Media alt text is available where appropriate
- Frontend image rendering uses Dyrected media URLs
- Blog/article body content is not stored as an array of paragraph strings
- Long-form content uses richText or the safest supported rich content format
- Rich content renders correctly with headings, paragraphs, lists, links, quotes, inline emphasis, and meaningful formatting preserved
- Existing approved content is seeded with initialData where appropriate
- initialData is used for globals and collections where appropriate
- initialData does not invent content
- initialData does not overwrite existing Dyrected content
- Content-driven feature definitions are included where approved
- Interactive runtime behaviour still works as before
- User submissions, private history, analytics, or personal records are not stored in Dyrected unless explicitly approved
- Frontend routes fetch CMS-managed content from Dyrected
- Routes do not continue using old local content sources as the normal source of truth
- Framework caching does not hide CMS edits unexpectedly
- CMS data shape adapters are present where needed
- A CMS edit appears on the relevant frontend route for each completed batch
- There are no duplicate local sources for content now managed by Dyrected
- Private credentials are not exposed to browser code
- Editor permissions match the approved plan
- Administrators retain technical control
- Editors cannot change content structure or access rules
- Delete, publish, hide, and draft permissions match the approved plan
- Page content only supports approved section blocks
- Loading, empty, preview, and error states are safe
- The existing design and behaviour are preserved
- The website builds successfully

Run the complete lint, type-check, test, and build commands.

If the project does not have one of these commands, say so plainly.

Fix problems caused by the integration.

Do not leave the project in a broken state.

---

## Stage 4 Summary

End Stage 4 with a plain-language summary that tells me:

- What the client can now edit
- Which content they can add or remove
- Which page sections they can reuse
- Which section variants are available
- Whether Hero is reusable as a block
- Which content they can arrange
- Which content is protected
- Which collections use title/name as the admin display title
- Which fields are used for routing
- Which previews were configured
- How page previews work
- Which images/media are editable
- How media uploads work
- Which long-form content uses rich content editing
- Which content-driven feature definitions are CMS-managed
- Which interactive behaviour remains in code
- What existing content was seeded with initialData
- Which frontend routes now fetch from Dyrected
- Which old local content sources were replaced or kept only as fallback
- What caching/freshness strategy was used
- What editors can draft, publish, hide, or delete
- Which hooks were added and what client-visible behaviour each one supports
- Which content batches were completed and verified
- Which checks were run
- How to open the editing dashboard
- How to test one change before publishing
- How to test one page preview
- Whether anything still needs my attention

Avoid technical implementation details unless an error requires me to take action.

Then end with this exact line:

WAITING — Open the editor and change one piece of content. Confirm it appears on the website, then say "approved" to continue. If something looks wrong, describe what you changed and what you see.

Do not proceed until I say "approved."

---

## STAGE 5 — HANDOFF

After I approve Stage 4:

Confirm the setup is complete.

Remind me to:

1. Publish normally through my existing host or deploy tool.
2. Invite the client as an Editor in Dyrected under Settings → Team → Invite.
3. Test their account before sending the login.
4. Test one page preview.
5. Test one content edit before sending the login.
6. Test one content-driven feature edit if one was included.

Provide a short handoff message I can send to the client.

The handoff message must be written in plain language.

It should explain:

- What the client can edit
- What the client can add or remove
- Which page sections they can reuse
- Which section styles or variants are available
- Which images they can replace
- Which long-form content they can edit
- Which interactive feature content they can manage, if any
- That they can preview pages before publishing where preview is available
- That design and layout changes outside the approved section system still come through me
- That behaviour changes, scoring logic, submissions, dashboards, and user data are separate from content editing unless already included
- That they should ask before deleting important content
- How to access the editor

Do not include technical setup details in the client handoff message.

End with:

COMPLETE — The handoff is ready.
