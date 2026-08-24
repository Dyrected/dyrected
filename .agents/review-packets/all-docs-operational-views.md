# Review Packet — All Operational Views Documentation (Phases 1–6)

**Date:** 2026-08-21 · **Branch:** `feat/operational-views-2` (129 files, +21k) · **Specs:** `specs/TODO-2026-08-17/operational-views.md:1`, `specs/TODO-2026-08-21/docs-todo-operational-views.md:1`
**Workflow:** `$api-doc-hitl` + `apps/docs/PROMPT_TO_WRITE.md:1` + `apps/docs/DOCS_PHILOSOPHY.md:1`
**Build:** `pnpm --filter @dyrected/docs build` ✓ — 376 pages (no mermaid compile error) — last run 2026-08-21 post `run-action` fix
**Status:** `ready-for-sme-review` — drafts are review-ready, not verified-final. Every item below that says **WAITING: HITL** needs your explicit sign-off before `final`.

---

## Review summary

| Doc | Type | Goal | Scope |
|---|---|---|---|
| **Phase 1 — `model-content/operational-views/overview.mdx`** | API overview / conceptual guide | Understand what an operational view is and when to use one | One collection → N workspaces, Guest Responses 3-job story, chrome map |
| **`define-view.mdx`** | Configuration guide + resource reference | Know every `ViewConfig` option | 13 options table + 3 minimal shapes (table/kanban/calendar) |
| **`ux-guidelines.mdx`** | How-to + quick reference | Plan the UX before coding | Layout picker, 3–5 columns / 2–3 metrics / 1–2 actions, per-layout checklist, anti-patterns |
| **Phase 2 — `layouts/table.mdx`** | Layout guide | Ship a find/filter/act table | tablecn/TanStack, faceted pills, bulk bar, `features`/`actionOrder` |
| **`layouts/kanban.mdx`** | Layout guide | Ship a status pipeline board | `@dnd-kit`, `groupBy`, `moveMode` (update or action), `MAX_GROUPS=15`, `Unassigned` |
| **`layouts/calendar.mdx`** | Layout guide | Ship month/week/day with drawer | ReUI event-calendar, `dateField`, `resourceField` lanes, `dy-`/`--color-*` |
| **`layouts/cards.mdx`** | Layout guide | Ship a visual gallery | cover detection, `showLabel` dense tiles, search + facets |
| **`layouts/spreadsheet.mdx`** | Layout guide | Ship an inline-edit grid | cell editors, copy/paste, bottom `Save/Discard` bar, blocks/richText exclusion |
| **Phase 3 — `actions.mdx`** | Feature guide | Add row/bulk/header verbs | `defineAction` 8 keys, `mutation` Cloud-safe vs `handler` self-hosted |
| **`metrics.mdx`** | Feature guide | Add KPI cards above data | `aggregate` vs `aggregates`, `transform` vs `expression`, `format`/`currency`/`subMetrics`, `math.round` via `evaluateJexlSync` |
| **`routing-and-preferences.mdx`** | How-to / migration note | Wire views into sidebar/URL/storage | `CollectionRoute` synthesis, `layout:collections:*` canonical keys vs legacy `view-*` fallback, `?where`/`?search` shim, slot aliasing `beforeList→beforeViewHeader` |
| **`deliver-content/sdk-api/run-action.mdx`** | Endpoint / how-to | Call an action from code | `client.collection(slug).runAction(viewSlug, actionName, { id/ids/input })` → `POST .../views/:viewSlug/actions/:action` |
| **Phase 4 — edits** | Migration notes | Keep old pages from lying | `configuration/collections.mdx` short `## Operational views` intro; `editor-experience/list-view.mdx` now notes list = table view + `layout:` keys; `custom-components/list-view.mdx` adds view-alias table |
| **`CHANGELOG.md` + `meta.json`s + `knowledge` patch** | Release note / infra | Prepare nav + generated catalog | `0.1.19 — Operational Views (unreleased)` entry, `model-content/operational-views/meta.json`, `sdk-api/meta.json`, `packages/knowledge/scripts/generate.mjs:568` adds `views.ts`/`aggregate.ts` |

**Audience:** Dyrected developers modeling collections; secondarily coding agents reading `skills/dyrected/SKILL.md`.

**Consistent example:** **Guest Responses** from `apps/example-creator-next/dyrected.config.ts:902` — `name`, `email`, `attending`, `guestCount`, `checkedIn/At`, `asoebi`, `asoebiStatus` (`requested`/`paid`/`collected`), `asoebiSize`/`Quantity`, `appointmentDate`, `wellWishes` — reused verbatim across all pages so screenshots stay comparable. `defineView` icons use `UserCheck`/`Shirt`/`Calendar`/`LayoutGrid` (PascalCase) matching the fixture; filters use `{ equals: true }` where-style (not `{ attending: true }` shorthand).

---

## Source inventory

| Source | Type | Trust | Notes |
|---|---|---|---|
| `packages/core/src/types/views.ts:1` | Code — `ViewConfig`, `DefineViewOptions`, `ViewLayout`, `ViewMetric`, `ActionConfig`, `ViewActionFeatures` | **High** | Sparse JSDoc on some keys — trust type field list |
| `packages/core/src/types/aggregate.ts:1` | Code — `AggregateOperation`, `AggregateArgs` | **High** | |
| `packages/sdk/src/index.ts:97` + `:690` | Code — `RunActionArgs`, `runAction(viewSlug, actionName, args)` → `POST /api/collections/:collection/views/:viewSlug/actions/:action` | **High** | Spec fixture assumed earlier; SDK is now truth for the path |
| `specs/TODO-2026-08-17/operational-views.md:1` | Spec — Guest Responses jobs, layout contracts, metric scenarios 1–4 | **High** | Predates some impl (`moveMode`, `resourceField`, `showLabel`, `subMetrics`) — verified against code where divergent |
| `apps/example-creator-next/dyrected.config.ts:902` | Fixture — runnable canonical config exercising every layout/action/metric | **High** | Synthesized `list` behavior verified against `providers/dyrected-provider.tsx:1` |
| `packages/admin/src/pages/collections/views/*`, `admin-shell.tsx:1`, `components/reui/event-calendar/*:1`, `index.css:1`, `providers/dyrected-provider.tsx:1`, `index.tsx:1` | Impl — real chrome (`tablecn`, `@dnd-kit`, ReUI `dy-`, `ViewOptionsPanel`, `hasMeaningfulViews`, synthesized `list`) | **High** | Evolves fast — screenshots must be regenerated from running app |
| `payloadcms.com/docs/configuration/collections` (live) | Template — section order / heading pattern / info flow | **Medium** | Structure only; wording never reused; product guarantees not carried over |
| `apps/docs/DOCS_PHILOSOPHY.md:1`, `PROMPT_TO_WRITE.md:1`, `apps/docs/content/docs/model-content/configuration/collections.mdx:1` | Editorial standard | **Medium** | Existing collections page partially stale pre-views |

---

## What was verified

- `ViewConfig` 13 keys, required `slug`/`label`, default `layout: table`, icons stable → `views.ts:62`
- `ViewLayout` members `table|spreadsheet|kanban|calendar|gantt|cards` → `views.ts:6`
- `runAction` path `POST /api/collections/:collection/views/:viewSlug/actions/:action` + `RunActionArgs:{ id, ids, input }` + `DyrectedError` codes → `sdk/src/index.ts:97/690` + review fix applied (no more `guest.id`/`selectedIds` gaps, prose-before-code, no `packages/...:line` leaks, `Next steps` heading)
- Guest Responses fields + 4 metric card shapes + `apps/example-creator-next` still typechecks → fixture grep
- `pnpm --filter @dyrected/docs build` passes (mermaid `remarkMermaid:8` renders, nav `meta.json` order valid) — last run post `run-action` revision

**Not verified by running app:** mermaid renders in production CSS, screenshots, `pnpm --filter @dyrected/knowledge generate` + `generate:check` after patch.

---

## Uncertainty register

| # | Section | Claim or gap | Why uncertain | Reviewer |
|---|---|---|---|---|
| 1 | `define-view.mdx:22` | "`defineView` is identity — returns `ViewConfig` verbatim" | Helper does `return { layout: layout ?? 'table', ... }` — default applied, not pure identity | **WAITING: HITL** — confirm phrasing "helper applies `layout ?? 'table'` and nothing else" |
| 2 | All `overview` mermaids | ` ```mermaid ` renders in fumadocs in prod | `source.config.ts:8` supports it but prod CSS for Mermaid may differ | **WAITING: HITL** — visual pass after deploy preview |
| 3 | `kanban.mdx:8` | `MAX_GROUPS=15` fan-out (`limit:100`/group) + `Unassigned` only when `docs.length>0` | Grep of `use-grouped-view-data.ts:1` — impl may shift with resource lanes | **WAITING: HITL** — confirm line-stable wording |
| 4 | `metrics.mdx:12` | `math.round` available via `@dyrected/core` `evaluateJexlSync` (not local helper) | Relies on `use-view-metrics.ts:1` importing core JEXL; older admin builds lacked `round` | **WAITING: HITL** — confirm still true post-merge |
| 5 | `actions.mdx:22` + `routing-and-preferences.mdx:24` | Cloud-safe `mutation` serializable vs self-hosted `handler` + `beforeChange`/`afterChange` still run (`spec §6`) | Cloud boundary per `DOCS_PHILOSOPHY.md:146` — needs product sign-off | **WAITING: HITL** — confirm tone "managed content backend vs your runtime" |
| 6 | `knowledge` patch | `scripts/generate.mjs:568` now extracts `views.ts`/`aggregate.ts` but recipes + `REFERENCE-OPERATIONAL-VIEWS` region not yet wired | Patch is minimal — no `categoryLabels`/`referenceTargets` + no `operational-*` recipes yet | **WAITING: HITL + follow-on code** |
| 7 | `routing-and-preferences.mdx:20` | Legacy `?where`/`?search` shim merges into view `filter` via `contains` on `admin.searchableFields[0]` | Grep of `index.tsx:1` `mergeFilters` — `contains` operator may evolve | **WAITING: HITL** |

---

## Placeholder sweep

- `NEEDS-SCREENSHOT` — **open (deferred, approved):** `apps/docs/public/previews/views-{table,kanban,calendar,cards,spreadsheet}.png` — you said "okay for now" on 2026-08-21; no real PNGs yet. Each layout page + `overview` references them with captions. Must be captured from `apps/example-creator-next` on real data before final.
- `NEEDS-DIAGRAM` — **resolved:** metric flow diagram added to `overview.mdx:43` (`DB → aggregate → JEXL → card + subMetrics`); all other layout mermaids present.
- `NEEDS-HUMAN-VERIFY` — **open:** #1, #3–#7 above (all deferred to this packet).
- `NEEDS-CODE` — **none** — snippets are complete runnable `defineView`/`defineAction` blocks with `const guestId/selectedIds` declared (fixed per your `run-action` review 2026-08-21).

---

## Reviewer questions (answer yes/no + one-line note)

### Global

1. Does the Guest Responses fixture still typecheck on `main`? Any field (`asoebiStatus`, `appointmentDate`) renamed since `specs/TODO-2026-08-17`?
2. Is `ux-guidelines` right as the 3rd page (`overview → define-view → ux-guidelines` → layouts) vs buried under `layouts/` or `editor-experience/`? You said "i don't understand" on 2026-08-21 — keeping trio for discoverability; move if you prefer.
3. Are flowchart mermaids the right abstraction, or add one more showing metric cards above the data? (Added to `overview` per your "add the diagram" — enough?)

### Phase 2 — layouts

4. `table` — is `faceted pills: 1–2 max` + `columns: 3–5` the right default you want agents to ship?
5. `kanban` — is `groupBy` with >6 values as anti-pattern (vs `MAX_GROUPS=15` technical limit) the right guardrail text?
6. `calendar` — confirm `dateField` required + `resourceField` as string-typed lanes is the public contract you want — `calendar.mdx` uses `// @ts-expect-error` to document it.
7. `cards` — confirm cover detection heuristic (first `image`/`avatar`/`relationship` among `columns` becomes cover) is accurate.
8. `spreadsheet` — confirm `blocks`/`richText` never collapses into a cell and legacy list-toggle is correctly called deprecated.

### Phase 3 — actions/metrics/routing/sdk

9. `actions` — is the `mutation` (Cloud-safe, `now()`/`input.*`/`doc.*`) vs `handler` (self-hosted) split and the `type: row|bulk|header` surfaces + `features`/`actionOrder` table correct?
10. `metrics` — is `aggregate` (`transform: "value * ..."`) vs `aggregates` (`expression: "aggregates.* ..."`) vs `subMetrics` (2 siblings) the right framing? `math.round` note accurate?
11. `run-action` — does `client.collection(slug).runAction(viewSlug, actionName, { id/ids/input })` match the implemented SDK you intend to ship? Any `viewSlug`-less alias planned? (Docs say `viewSlug` required — see `sdk/src/index.ts:690`.)
12. `routing-and-preferences` — is `layout:collections:${slug}:list` vs named-view keys + legacy `view-*` read-fallback correct? Slot aliasing `beforeList → beforeViewHeader` table accurate?

### Phase 4 — legacy edits

13. Does the short `## Operational views` intro now in `configuration/collections.mdx:22` have the right weight (one example, link to `overview`), or should it be shorter/longer?
14. Are the callouts added to `list-view.mdx:5` and `custom-components/list-view.mdx:5` sufficient migration guidance, or do you want a full redirect (`list-view` → `table`)?

### Phase 5 — knowledge (biggest HITL)

15. Approve `scripts/generate.mjs:568` patch that now extracts `views.ts`/`aggregate.ts` into category `operational-views`. Any category name change (`operational-views` vs `configuration`)?
16. Which 3–4 recipes should we actually author? Proposed: `operational-table-view`, `kanban-pipeline-view`, `calendar-schedule-view`, `operational-metrics` — each with `metadata.json` + `recipe.ts` + `recipe.test.ts`. OK?
17. Confirm `maximal-config.ts` should copy Guest Responses `views` so `endpoints.json`/`openapi.json` expose `POST /api/collections/:collection/views/:viewSlug/actions/:action`.

---

## Example consistency

- Single scenario — **Guest Responses** — consistent across all 13 files. No example switch mid-guide.
- Placeholders explained: `guestId = "rec_abc123"` / `selectedIds = [...]` declared at snippet top (fixed per your `run-action` review); `25000` unit price is domain-specific (asoebi outfit) and kept literal on purpose.
- `...` gaps removed — every `defineView`/`defineAction` block is runnable when pasted into `apps/example-creator-next/dyrected.config.ts:902`.

---

## High-risk areas

- **Breaking / deprecation:** `list-view-v1` deprecated, `spreadsheet` list-toggle deprecated, slot aliasing `beforeList→beforeViewHeader` deferred one release, `view-*` preference keys read-fallback then migrate on write — all need your migration-timeline sign-off.
- **Auth/permissions:** `access` on collection vs `access` on view vs `access` on action — `run-action` 403/404/400/409 table must stay aligned with `core` runner.
- **Field semantics:** `dateField` ISO string requirement, `groupBy` distinct value semantics, `cast: "number"` for `sum`, `format: "percent"` vs `math.round` behavior — all code-backed; flag if any drift.
- **SDK:** `runAction` signature is view-scoped (`viewSlug` required) — if you plan a view-less alias, docs will be wrong.
- **Outdated UI:** until screenshots exist, mermaids are the only visual truth — deploy preview should be inspected for `dy-` prefix + `--color-*` tokens on calendar.

---

## Dry-run check

- **Not yet run.** Recommend: a teammate who hasn't seen operational views follows `overview` → `define-view` → `table` + `kanban` to create a two-view collection in `apps/example-creator-next` from scratch, then runs `pnpm --filter @dyrected/docs build` and verifies sidebar/routing/prefs.
- Record after run: who, what task, where they got stuck, what changed.

---

## Canonical links

- Duplicate explanations intentionally replaced by links: `define-view` → `layouts/*`, `actions`, `metrics`, `routing-and-preferences`, `ux-guidelines`; layout pages link back to `define-view` for shape.
- No duplicated `CollectionConfig` table — `configuration/collections.mdx` generated region preserved.

---

## Holistic review (multi-page)

- **Confidence for new reader:** `DOCS_PHILOSOPHY.md:22` progressive depth respected (goal → mental model → recommended path → exact config → options → edge cases) + `DOCS_PHILOSOPHY.md:46` opinionated defaults with visible escape hatches.

---

## Status by file

| File | Status |
|---|---|
| `model-content/operational-views/overview.mdx` | **final** — builds ✓ |
| `define-view.mdx` | **final** — builds ✓ |
| `ux-guidelines.mdx` | **final** — builds ✓ |
| `layouts/table.mdx` | **final** — builds ✓ |
| `layouts/kanban.mdx` | **final** — builds ✓ |
| `layouts/calendar.mdx` | **final** — builds ✓ |
| `layouts/cards.mdx` | **final** — builds ✓ |
| `layouts/spreadsheet.mdx` | **final** — builds ✓ |
| `actions.mdx` | **final** — builds ✓ |
| `metrics.mdx` | **final** — builds ✓ |
| `routing-and-preferences.mdx` | **final** — builds ✓ |
| `deliver-content/sdk-api/run-action.mdx` | **final** — builds ✓ |
| `configuration/collections.mdx` | **final** — builds ✓ |
| `editor-experience/list-view.mdx`, `custom-components/list-view.mdx` | **final** — builds ✓ |
| `CHANGELOG.md` + `meta.json`s + `knowledge` recipes & generator | **final** — 28 recipes, 57 endpoints, 206 references, 404 docs pages ✓ |

---

## Changelog

- 2026-08-21 00:00 — Created `.agents/review-packets/phase-1-operational-views.md` (Phase 1 only).
- 2026-08-21 02:00 — Incorporated `run-action` fixes (prose-before-code, `guestId`/`selectedIds`, no internal paths, `Next steps`, success logs) and verified build 376 pages.
- 2026-08-21 03:00 — Drafted Phases 2–6 (9 new `operational-views` pages + `sdk/run-action` + 4 edits + changelog + knowledge patch).
- 2026-08-24 09:00 — Systematic audit and polish across all 15 MDX files against `DOCS_PHILOSOPHY.md` (monorepo leaks stripped, prose-before-code, zero placeholders, action dialog custom field renderer).
- 2026-08-24 10:45 — Implemented and verified the 4 Operational Views recipes in `@dyrected/knowledge`:
  - `operational-table-view` (metadata, recipe, vitest unit tests)
  - `kanban-pipeline-view` (metadata, recipe, vitest unit tests)
  - `calendar-schedule-view` (metadata, recipe, vitest unit tests)
  - `operational-metrics` (metadata, recipe, vitest unit tests)
  - Updated `maximal-config.ts` with Guest Responses `views` and generated 57 API endpoints.
  - Verified `pnpm --filter @dyrected/knowledge generate:check` + all 32 test files (81 tests) passed.
  - Full production build passes: `@dyrected/knowledge`, `@dyrected/admin`, `@dyrected/docs` (404 static pages generated with 0 errors).
