# Detail Views Review Packet

## Review summary

- Document: `apps/docs/content/docs/editor-experience/detail-view.mdx`
- Goal: Explain how developers configure the read-first admin Detail View for collection records and globals.
- Audience: Developers configuring Dyrected schemas for editors who need readable record summaries.
- Scope: Existing `detail` behavior only. This packet does not request runtime API, renderer, or type changes.
- Status: `ready-for-sme-review`

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/types/detail.ts` | Type definitions | High | Defines `DetailSchema`, detail item types, helper options, spans, display variants, and `visible` option availability. |
| `packages/core/src/detail.ts` | Helper implementation | High | Defines helper signatures, string normalization, default detail schema generation, and computed evaluation. |
| `packages/core/src/router.ts` | API serialization | High | Shows serialized detail shape and that computed handlers are not sent to the admin API. |
| `packages/core/src/controllers/collection.controller.ts` | Collection read behavior | High | Shows collection detail computed values are evaluated during document fetch when `detail` is present. |
| `packages/core/src/controllers/global.controller.ts` | Global read behavior | High | Shows global detail computed values are evaluated during global fetch when `detail` is present. |
| `packages/admin/src/components/detail/*` | Admin renderer | High | Shows actual rendering for sections, tabs, grids, fields, repeats, computed cards, text, dividers, visibility, and custom components. |
| `packages/admin/src/components/detail/__tests__/detail.test.tsx` | Tests | High | Confirms supported examples for fields, sections, repeats, computed cards, globals, text, dividers, and custom components. |
| `apps/example-creator-next/dyrected.config.ts` | Example app config | Medium-high | Provides real examples for global detail dashboards and repeated card layouts. |
| `apps/docs/DOCS_PHILOSOPHY.md` | Editorial standard | High | Governs task-first structure, prose before code, copy-paste confidence, and review-ready status. |
| Payload custom/admin view docs | External structural reference | Low for Dyrected facts | Used only to compare page flow around admin views. No Payload behavior is copied into Dyrected claims. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Conditional visibility | Current docs say source verifies top-level `options.visible`, and advise keeping conditional items top-level. | The type exposes `visible` on many nested item options, but `DetailRenderer` currently evaluates the visibility map only for top-level `items`. `DetailTabsComponent` evaluates badges but not tab visibility. | Confirm whether nested visibility is planned, intentionally unsupported, or a renderer gap. |
| Naming | The public page uses "Detail Views" instead of "Display Views". | Helper names use `display*`, but schema option and admin route behavior use `detail`. | Confirm public terminology. |
| Custom components | The page favors registered custom components and treats inline `render` as local/advanced. | `render` functions can exist in local config, but API serialization does not preserve functions for remote admin schemas. | Confirm whether inline `render` should be documented at all for hosted/admin API scenarios. |
| Display variants | The quick reference groups all variants from `DisplayVariant`. | Some variants are typed but may share fallback rendering or may not have equally polished dedicated rendering. | Confirm which variants should be promoted as stable public docs examples. |
| `detail: false` recommendations | The page suggests block-heavy pages may be better routed straight to edit. | This is an editorial recommendation inferred from the page-builder use case, not a hard product rule. | Confirm whether this is the right recommendation. |

## Placeholder sweep

No `NEEDS-HUMAN-VERIFY`, `NEEDS-SCREENSHOT`, `NEEDS-DIAGRAM`, or `NEEDS-CODE` markers remain in the docs page.

## Reviewer questions

1. Is "Detail Views" the correct public name, or should the page be titled "Display Views" while keeping the `detail` config name?
2. Are computed values described correctly, especially server-side handlers writing to `doc._meta.computed`?
3. Should inline `render` be documented, or should public docs only teach named registered components?
4. Are `link`, `table`, `star-rating`, `code`, and `code-badge` stable enough to keep in the public display-variant table?
5. Should collections and globals stay in one Detail Views guide, or should globals eventually get a focused subsection or separate page?
6. Is `detail: false` an appropriate recommendation for documents editors usually edit immediately, such as page-builder records?
7. Should nested `visible` support be implemented before documenting visibility more broadly?

## Example consistency

- Primary scenario: product records for the simplest collection example.
- Secondary scenario: categories/settings-style repeated data for `displayRepeat`.
- The examples are intentionally different because the page teaches both collection summaries and repeated singleton/dashboard data.

## High-risk areas

- Visibility behavior, because type availability is broader than verified top-level renderer behavior.
- Custom component behavior, because function serialization differs from local embedded admin usage.
- Display variant stability, because the type lists more variants than the examples exercise individually.
- Computed handlers, because server/client behavior needs SME confirmation for hosted and embedded admin setups.

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
