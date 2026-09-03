# Document Detail Views In `@dyrected/docs`

## Summary

Create a new review-ready configuration guide for Dyrected admin Detail Views, grounded in the current `@dyrected/core` and `@dyrected/admin` implementation.

This is a docs-only change. No runtime API, type, or renderer behavior should change.

Primary deliverables:

- New page: `apps/docs/content/docs/editor-experience/detail-view.mdx`
- Navigation update: `apps/docs/content/docs/editor-experience/meta.json`
- Cross-link update: `apps/docs/content/docs/editor-experience/overview.mdx`
- Review packet: `.agents/review-packets/detail-view.md`

## Source Inventory

Use these sources before writing:

| Source | Trust | Use |
| --- | --- | --- |
| `packages/core/src/types/detail.ts` | High | Exact `DetailSchema`, helper option types, display variants |
| `packages/core/src/detail.ts` | High | Helper signatures, default detail schema generation, computed evaluation |
| `packages/core/src/router.ts` | High | What detail config is serialized to the admin API |
| `packages/core/src/controllers/collection.controller.ts` and `global.controller.ts` | High | When computed detail values are evaluated |
| `packages/admin/src/components/detail/*` | High | Actual renderer behavior for sections, tabs, grids, fields, repeats, computed values, text, divider, custom components |
| `packages/admin/src/components/detail/__tests__/detail.test.tsx` | High | Confirmed supported examples |
| `apps/example-creator-next/dyrected.config.ts` | Medium-high | Real example configs, especially globals and repeat/card layouts |
| `apps/docs/DOCS_PHILOSOPHY.md` | High | Voice, structure, examples, page-quality bar |
| Official Payload docs | Structural only | Borrow page shape and teaching flow, not wording or product claims |

## Implementation Changes

Add `detail-view.mdx` as a task-oriented configuration guide titled **Detail Views**.

Page structure:

1. **What a Detail View is**
   - Explain that it is the read-first admin screen for a collection record or global.
   - Position it beside List View and Spreadsheet View.
   - State that editors can review a structured summary before opening the edit form.

2. **Default behavior**
   - If `detail` is omitted, Dyrected generates a default layout.
   - Default generation skips sensitive fields and hidden fields.
   - Sidebar-style fields include select, radio, boolean, date, datetime, and non-`hasMany` relationship-like metadata.
   - `detail: false` sends editors straight to the edit form.

3. **Recommended first custom layout**
   - Show one complete collection example using:
     - `defineCollection`
     - `displaySection`
     - `displayField`
     - `span`
     - `display: "badge"`, `"currency"`, and `"copyable"`
   - Keep this example small and copy-pasteable.

4. **Layout helpers**
   - Document `displaySection`, `displayTabs`, `displayTab`, and `displayGrid`.
   - Explain the 12-column span model.
   - Mention that top-level items span across the page and nested items span inside their container.

5. **Field display helpers**
   - Document `displayField(fieldName, options)`.
   - Cover supported display variants from `DisplayVariant`, but keep this section practical rather than dumping the type.
   - Group variants by use: status, numbers, dates, contact links, media, structured data, arrays/tags.
   - Explain dotted paths such as `brand.name`.

6. **Computed values**
   - Document `displayComputed`.
   - Explain expression-based computed values and function handlers.
   - Be precise: handlers run server-side during document fetch and their values are exposed through `doc._meta.computed`; serialized admin schemas do not send handler functions to the browser.
   - Use examples already supported by tests: `count(...)`, `math.round(...)`, currency formatting.

7. **Repeated data**
   - Document `displayRepeat`.
   - Cover `table`, `cards`, and `list`.
   - Explain `useAsTitle`, `titleField`, `title`, `icon`, `columns`, and `emptyText`.
   - Use the `AssessmentCategories` global as the main real-world example.

8. **Text, dividers, and custom components**
   - Document `displayText`, `displayDivider`, and `displayCustom`.
   - Mention `displayCustomComponent` only as an alias.
   - Explain registered custom components by name before mentioning inline `render`.

9. **Conditional visibility**
   - Document only source-verified behavior.
   - Current renderer evaluates `options.visible` for top-level detail items.
   - Do not claim nested field, nested section, or tab visibility works unless code is changed and verified.
   - Add this as a review-packet question because the types expose `visible` more broadly than the renderer currently applies it.

10. **Quick reference**
   - End with a compact table of helpers, purpose, and most-used options.
   - Link to related docs rather than repeating broad admin concepts.

Update navigation:

- Add `"detail-view"` after `"list-view"` and before `"spreadsheet-view"` in `editor-experience/meta.json`.

Update overview page:

- Add Detail Views to the generated admin screen list.
- Link from the “Collection list” or customization section to `/docs/editor-experience/detail-view`.

## Review Packet

Create `.agents/review-packets/detail-view.md` with:

- Document purpose, audience, and scope.
- Source inventory.
- Uncertainty register:
  - Whether nested `visible` support is intended or should remain undocumented.
  - Whether the canonical public name should be “Detail Views” or “Display Views”.
  - Whether custom inline `render` should be documented for hosted/admin API scenarios or kept as an advanced local-admin note.
- Placeholder sweep.
- SME questions:
  - Are computed handler semantics described correctly?
  - Are all display variants currently supported enough to document?
  - Should globals and collections be shown in one guide or split later?
  - Should `detail: false` be recommended for block-heavy collections?
- Status label: `ready-for-sme-review`.

## Test Plan

Run these checks after implementation:

- `pnpm --filter @dyrected/docs build`
- `pnpm --filter @dyrected/docs docs:check`
- Manual docs review:
  - Page appears under Editor Experience navigation.
  - All internal links use `/docs/...`.
  - No old docs URLs.
  - No unsupported behavior is stated as fact.
  - No `NEEDS-HUMAN-VERIFY`, `NEEDS-CODE`, or `NEEDS-SCREENSHOT` markers remain in the docs page.
  - Any unresolved factual uncertainty remains only in the review packet.

## Assumptions

- The page slug will be `detail-view`.
- The public docs title will be **Detail Views**.
- This pass documents existing behavior only; it does not change renderer behavior.
- Official Payload docs are used only to compare structure and information flow.
- The result is review-ready, not final, until the review packet is answered.
