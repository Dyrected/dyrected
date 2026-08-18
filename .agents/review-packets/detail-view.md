# Detail Views Review Packet

## Review summary

- Document: `apps/docs/content/docs/editor-experience/detail-view.mdx`
- Goal: Explain how developers configure the read-first admin Detail View for collection records and globals.
- Audience: Developers configuring Dyrected schemas for editors who need readable record summaries.
- Scope: Detail View configuration, layout helpers, display variants, computed values, and custom components.
- Status: `approved-by-sme`

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/types/detail.ts` | Type definitions | High | Defines `DetailSchema`, detail item types, helper options, spans, display variants, and `visible?: string &#124; boolean` support. |
| `packages/core/src/detail.ts` | Helper implementation | High | Defines helper signatures, string normalization, default detail schema generation, computed evaluation, and `isDetailItemVisible`. |
| `packages/core/src/utils/jexl-helpers.ts` | JEXL evaluation | High | Implements `evaluateJexl`, `evaluateJexlSync`, and binary operators (`and`, `or`). |
| `packages/core/src/router.ts` | API serialization | High | Shows serialized detail shape and that computed handlers are not sent to the admin API. |
| `packages/core/src/controllers/collection.controller.ts` | Collection read behavior | High | Shows collection detail computed values are evaluated during document fetch when `detail` is present. |
| `packages/core/src/controllers/global.controller.ts` | Global read behavior | High | Shows global detail computed values are evaluated during global fetch when `detail` is present. |
| `packages/admin/src/components/detail/*` | Admin renderer | High | Shows actual rendering for sections, tabs, grids, fields, repeats, computed cards, text, dividers, visibility (top-level and nested), and custom components. |
| `packages/admin/src/components/detail/__tests__/detail.test.tsx` | Tests | High | Confirms supported examples for fields, variants (code, star-rating, etc.), sections, repeats, computed cards, globals, text, dividers, and recursive visibility. |
| `apps/example-creator-next/dyrected.config.ts` | Example app config | Medium-high | Provides real examples for global detail dashboards and repeated card layouts. |
| `apps/docs/DOCS_PHILOSOPHY.md` | Editorial standard | High | Governs task-first structure, prose before code, copy-paste confidence, and review-ready status. |

## Resolved Decisions & Implementation

| Topic | Resolution |
| --- | --- |
| Naming | Public name confirmed as **Detail Views** (matching the schema configuration key `detail`). |
| Display variants | All variants (`code`, `code-badge`, `star`, `star-rating`, `icon`, `table`, etc.) implemented, verified in `DetailFieldRenderer`, and tested in unit tests. |
| Collections & Globals | Covered on the same page with distinct, clear examples for both `defineCollection` and `defineGlobal`. |
| Nested visibility | Implemented `isDetailItemVisible` supporting `boolean` and JEXL string expressions (`includes()`, `and`, `or`, `&&`, `&#124;&#124;`) across top-level and nested detail items (sections, tabs, grids, repeats). |
| `detail: false` guidance | Confirmed recommendation for documents editors usually edit immediately (e.g. block-heavy pages). |
| Inline `render` | Documented with explicit note that it applies only to self-hosted React environments and is not supported in serialized Cloud schemas. |

## Placeholder sweep

No `NEEDS-HUMAN-VERIFY`, `NEEDS-SCREENSHOT`, `NEEDS-DIAGRAM`, or `NEEDS-CODE` markers remain in the docs page.

## Dry-run check

Recommended before publication: have a developer add a custom `detail` layout to a small collection and a global using only this page. Record any missing imports, unclear helper choices, or examples that do not copy cleanly.

## Canonical links

- Canonical guide: `/docs/editor-experience/detail-view`
- Discovery mentions should stay brief in:
  - `/docs/model-content/concepts`
  - `/docs/model-content/configuration/collections`
  - `/docs/model-content/configuration/globals`
  - `/docs/editor-experience/overview`

## Holistic review

Check whether the page:

- explains the read-first mental model before the helper reference
- keeps the recommended path visible
- makes `detail: false` easy to find
- avoids presenting unverified nested visibility as supported behavior
- gives enough copy-paste context for the first example
