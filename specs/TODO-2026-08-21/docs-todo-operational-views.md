# Docs TODO — Operational Views Branch

**Branch:** `feat/operational-views-2` → `main` (129 files, +21k/−160) · **Date:** 2026-08-21
**Scope:** Everything in `@dyrected/docs` (`apps/docs`) that is now stale, missing, or misleading after the operational views work.
**How to use this file:** Each item is a standalone docs task. `P0` = ship-blocker (new concepts with no page), `P1` = correctness fix (existing page now wrong), `P2` = polish / follow-up. Do P0 → P1 → P2. Verify every code sample against the source file listed.

> Spec for the feature itself: `specs/TODO-2026-08-17/operational-views.md`. Changesets driving this audit: `.changeset/operational-views.md`, `.changeset/list-view-migration.md`.

---

## 0) What changed (docs-relevant contracts)

Read these before editing any page — they are the source of truth:

| Contract | File | What docs must explain |
| --- | --- | --- |
| `defineView` / `defineAction` | `packages/core/src/types/views.ts:1` | `ViewConfig`, `DefineViewOptions`, `ViewLayout` (`table`/`spreadsheet`/`kanban`/`calendar`/`gantt`/`cards`), `groupBy`, `dateField`, `startDateField`/`endDateField`, `columns`, `sort`, `filter`, `actions`, `metrics`, `features`, `actionOrder`, `access` |
| `ViewMetric` + `ViewSubMetric` | `packages/core/src/types/views.ts:18` | `label`, `color`, `unit`, `aggregate` vs `aggregates`, `transform` vs `expression`, `format`/`currency`, `subMetrics[]` — plus aggregation engine (`count`/`sum`/`avg`/`min`/`max`, `where`, `cast`) |
| `ActionConfig` | `packages/core/src/types/views.ts:48` | `name`, `label`, `icon`, `type` (`row`/`bulk`/`header`), `confirm`, `fields` (input form), `mutation` (Cloud-safe JSON with `now()`/`input.*`/`doc.*`), `handler` (self-hosted), `access` |
| `ViewActionFeatures` | `packages/core/src/types/views.ts:9` | `view`/`edit`/`duplicate`/`delete`/`exportSelected` toggles |
| Default view synthesis | `packages/admin/src/providers/dyrected-provider.tsx` | `resolveSchemas` synthesizes a `list` view (`layout: table`, columns from `admin.defaultColumns` or first 5 display fields) for collections without `views` |
| Preference keys | `packages/admin/src/pages/collections/views/view-preference-keys.ts` | Canonical `layout:collections:${slug}:list` and `layout:collections:${slug}:view:${viewSlug}[:variant | :mode | :toolbar]`, variant suffix for`cards`/`kanban`; legacy keys`view-pref:`/`view-mode:`/`view-columns:`/`view-toolbar:` are read-fallback and migrate on save |
| Slot aliasing | `packages/admin/src/pages/collections/operational-view-page.tsx`, `packages/admin/src/types/admin-components.ts` | `beforeList` → `beforeViewHeader`, `beforeListTable` → `beforeViewContent`, `afterListTable`/`afterList` → `afterViewContent` (still works, shimmed to `CollectionListSlotProps`) |
| URL compat | `packages/admin/src/index.tsx` | `?where=<json>` and `?search=<term>` merged into view `filter` via `contains` on `admin.searchableFields[0]` |
| Collection routing | `packages/admin/src/index.tsx`, `packages/admin/src/pages/collections/operational-view-route.tsx` | `CollectionRoute` now renders `OperationalViewPage` directly (Option B) — no `CollectionListPage` redirect; `list-view-v1.tsx` is `@deprecated` |
| Views infra | `packages/admin/src/pages/collections/views/*` | `useViewData`, `useViewMetrics`, `useColumnPreferences` (variant + `showLabel`), `ViewOptionsPanel`, `ViewModeSwitcher`, `toolbar-persistence`, `build-server-where`, `format-metric`, `validate` |
| Layouts | `packages/admin/src/pages/collections/views/{table,kanban,calendar,cards,spreadsheet}/*` | `table-layout` (tablecn/TanStack), `kanban-layout` (`@dnd-kit`, `use-grouped-view-data`, `UNASSIGNED` bucket), `calendar-layout` (ReUI `event-calendar` with `resources`/`resourceId`), `cards-layout` (search + faceted filters), `spreadsheet-layout` (faceted toolbar + `spreadsheet-editor`) |
| SDK + Core runner | `packages/sdk/src/index.ts`, `packages/core/src/controllers/collection.controller.ts`, `packages/core/src/utils/action-mutation.ts`, `packages/core/src/router.ts` | `client.collection(slug).runAction(...)` and server action runner (declarative `mutation` resolved via JEXL + lifecycle hooks pipeline) |

---

## 1) Information Architecture — new page tree (and renames)

**Proposed new section:** `model-content / Operational Views` or `editor-experience / Operational Views`. Either is fine, but pick one and keep it. Recommended: **`model-content/operational-views`** (it's a modeling decision that then shapes the editor).

```
content/docs/
  model-content/
    configuration/collections.mdx          # update (see §2)
    operational-views/
      meta.json                            # NEW — order + titles
      overview.mdx                         # NEW — mental model from spec §1-2
      define-view.mdx                      # NEW — ViewConfig reference
      layouts/table.mdx                    # NEW
      layouts/kanban.mdx                   # NEW
      layouts/calendar.mdx                 # NEW
      layouts/cards.mdx                    # NEW
      layouts/spreadsheet.mdx              # NEW (or move/expand existing)
      actions.mdx                          # NEW — defineAction
      metrics.mdx                          # NEW — ViewMetric + aggregation engine
      routing-and-preferences.mdx          # NEW — sidebar, URLs, localStorage
  editor-experience/
    list-view.mdx                          # RENAME → table-view.mdx or update in place + redirect
    calendar-view.mdx                      # NEW (editor-facing)
    kanban-view.mdx                        # NEW
    cards-view.mdx                         # NEW
  deliver-content/
    sdk-api/overview.mdx                   # update
    sdk-api/run-action.mdx                 # NEW
  reference/
    views-types.mdx                        # NEW or fold into generated references
```

Also update `apps/docs/source.config.ts` nav if you add a top-level group. Every rename needs a redirect entry (Next/Fumadocs `redirects` — check existing pattern in `next.config.ts`).

---

## 2) `model-content/configuration/collections.mdx` — P1

**Why stale:** Page describes `defaultColumns`/`useAsTitle`/`urlPattern` but never mentions `views`, and still implies the list view is the only admin surface.

**Do:**

- [ ] Add a section `## Operational views` **after** `What you get automatically`, before `When to choose a collection`. Explain: a collection is a data source, views are workspaces — `defineView` array, each view has layout/filter/groupBy/columns/actions/metrics.
- [ ] Show a minimal `views: [defineView({ slug:'attending-guests', layout:'table', ... })]` block inside the `defineCollection` example (copy-paste runnable, not `...`).
- [ ] Mention default-view synthesis: if `views` is omitted, Dyrected synthesizes a `list` table view from `admin.defaultColumns` or first 5 display fields — so `/collections/:slug` always works without redirect.
- [ ] Link to `model-content/operational-views/overview` as the deep dive. Keep this page short — mental model + one code block, not all options.

**Verify:** Sample compiles against `packages/core/src/types/views.ts:62`. Run `pnpm --filter @dyrected/docs build` and `pnpm --filter @dyrected/core build` (now needs `NODE_OPTIONS=--max-old-space-size=4096` for DTS).

---

## 3) New section `model-content/operational-views/*` — P0

Follow `DOCS_PHILOSOPHY.md` layers: goal → mental model → recommended path → exact config → options → edge cases. Every page: prose before code, complete runnable example, visible success signal.

### 3.1 `overview.mdx` — P0

- [ ] Port spec §1–2 (Guest Responses story: receptionist vs merch vs planner) in docs voice — warm, direct, task-oriented.
- [ ] Diagram: Collection → N views (table/kanban/calendar/cards/spreadsheet). Mention `specs/TODO-2026-08-17/operational-views.md:37-79`.
- [ ] End with "Choose your layout" linking to each layout page.

### 3.2 `define-view.mdx` — P0

- [ ] Table of `ViewConfig` props (`slug`, `label`, `icon` Lucide name, `layout`, `filter` object or JEXL string, `groupBy`, `dateField`, `startDateField`/`endDateField`, `columns`, `sort`, `actions`, `features`, `actionOrder`, `metrics`, `access`).
- [ ] Explain `filter` vs `where` and `groupBy` for kanban/gantt. Show `filter: { asoebi: true }` vs `filter: "asoebi == true"`.
- [ ] Reference `defineView` helper identity (returns `ViewConfig` as-is — no magic).

### 3.3 `layouts/table.mdx` — P0

- [ ] Based on `table/table-layout.tsx` + `data-table-toolbar.tsx` + `data-table-filter-menu.tsx` + `view-options-panel.tsx`. Cover: faceted filter bar with pills + badge counts, floating bulk bar, column visibility/order (View button), density.
- [ ] Show `useColumnPreferences` variant persistence + `showLabel` toggles (Tag icon).
- [ ] Note preference key `layout:collections:${slug}:list` vs named view keys.

### 3.4 `layouts/kanban.mdx` — P0

- [ ] `groupBy` column generation, counts, `useGroupedViewData` fan-out (`limit:100` per group, `MAX_GROUPS=15` fallback), `UNASSIGNED` bucket (only shown when non-empty) — from `kanban/use-grouped-view-data.ts`.
- [ ] Drag-and-drop via `@dnd-kit`, `restrictToVerticalAxis`, `moveMode: "update"|"action"` and `moveAction` (drag either updates field or runs action).
- [ ] Card chrome: badges, metadata, one-click row actions; `fields`/`showLabels` control.

### 3.5 `layouts/calendar.mdx` — P0

- [ ] `dateField` mapping to month/week/day, `resources` via `resourceField`, per-resource colors (`RESOURCE_COLOR_TOKENS`), detail drawer (`event-detail-sheet.tsx`).
- [ ] Note Tailwind `dy-` prefix: calendar is now prefixed (see `packages/admin/src/index.css` `--color-*` vars).
- [ ] Fix needed: current `calendar-layout` supports resource time grid — docs should show `resourceField` example.

### 3.6 `layouts/cards.mdx` — P0

- [ ] Gallery layout from `cards/cards-layout.tsx` + `card-grid-item.tsx`: cover images, badges, `fields`/`showLabels`, search + faceted filters, toolbar persistence.

### 3.7 `layouts/spreadsheet.mdx` — P1 (expand existing)

- [ ] Current `editor-experience/spreadsheet-view.mdx` is editor-facing and still says "Open the View button … choose Spreadsheet" on the legacy list. Rewrite to: every view with `layout:'spreadsheet'` **is** the spreadsheet — plus explain faceted toolbar (`columnFilters` + `getFaceted*`).
- [ ] Keep the inline-edit table (inline vs popover vs sheet) but add note that `blocks` still not editable in grid.

### 3.8 `actions.mdx` — P0

- [ ] `defineAction` contract (`name`, `label`, `icon`, `type: row|bulk|header`, `confirm`, `fields` input form, `mutation` JSON, `handler` self-hosted, `access`).
- [ ] Cloud-safe `mutation` expressions: `checkedIn: true`, `checkedInAt: 'now()'`, `tableNumber: 'input.tableNumber'`, `doc.*`. Emphasize pure JSON syncs via `sync:schema`.
- [ ] UI surfaces: row buttons, kanban card buttons, floating bulk bar, view header (with `actionOrder`/`features` to hide built-ins `view/edit/duplicate/delete/exportSelected`).
- [ ] Lifecycle note: action updates run through `beforeChange`/`afterChange` hooks.

### 3.9 `metrics.mdx` — P0

- [ ] `ViewMetric` / `ViewSubMetric`: `label`, `color` (`purple`/`emerald`/… mapped to Tailwind `--color-*`), `unit`, `aggregate` vs `aggregates`, `transform` vs `expression`, `format: currency|number|percent`, `subMetrics[]`.
- [ ] Aggregation engine examples: simple `count`, conditional `count where`, `sum` × price with `cast:'number'` + `transform:'value * 25000'`, dual `aggregates` with `expression:'aggregates.totalBooked * aggregates.avgRate'`, ratio `math.round((a/b)*100,1)` with `evaluateJexlSync` (uses core-registered `round`).
- [ ] Performance note: metrics run native DB aggregations, not in-memory.

### 3.10 `routing-and-preferences.mdx` — P1

- [ ] Sidebar hierarchy (collection → nested views, collapsible via `hasMeaningfulViews`, collapsed collection hover menu — from `admin-shell.tsx`).
- [ ] Route shape `/collections/:slug/views/:viewSlug`, default `/collections/:slug` renders first view.
- [ ] URL compat shim: `?where` JSON + `?search` (on `admin.searchableFields`) merged into view filter.
- [ ] localStorage keys (canonical + legacy fallback) + `ViewModeSwitcher`.

### 3.11 Visual outcome + UX recommendations — P0 (agent + human planning)

Agents and humans both need to know **how a `defineView` will look before they ship it**. Every operational view page must open with a visual + an opinionated UX guide, then show the code. Follow `DOCS_PHILOSOPHY.md:68` prose before code, `DOCS_PHILOSOPHY.md:22` progressive depth.

- [ ] **Add a visual-outcome block to every view page** (`overview.mdx` + each `layouts/*.mdx`, `actions.mdx`, `metrics.mdx`) — in this order inside the page:
  1. 1-sentence goal for the layout.
  2. ` ```mermaid ` wireframe (uses `apps/docs/source.config.ts:8` `remarkMermaid` — already ships). 1 diagram per layout, not per option — keep it scannable.
  3. 1 real screenshot from `apps/example-creator-next/dyrected.config.ts:1` (Guest Responses fixture) saved to `apps/docs/public/previews/views-{table,kanban,calendar,cards,spreadsheet}.png` and embedded with caption. Generate after the example app runs; don't use stock imagery.
  4. Code block (complete `defineView` / `defineAction`).
  5. 1–2 sentences of plain English "what just happened."

  Minimal mermaid starters (copy-paste and tweak):

  ```mermaid
  %% table — apps/docs/content/docs/model-content/operational-views/layouts/table.mdx
  flowchart TB
    toolbar[Search + Faceted pills + View button]
    table[Table — TanStack + tablecn | sticky header | row: [View/Edit] [Check In]]
    bulk[Floating bulk bar — 12 selected → Mark Paid / Export / Delete]
    toolbar --> table --> bulk
  ```

  ```mermaid
  %% kanban — layouts/kanban.mdx (groupBy → columns, @dnd-kit)
  flowchart LR
    subgraph Board[Kanban — groupBy: asoebiStatus]
      C1[Requested 12]
      C2[Paid 45]
      C3[Collected 28]
      C1 --- R1[Tunde — L ×1 — Mark Paid]
      C2 --- R2[Sade — M ×2 — Mark Collected]
    end
  ```

  ```mermaid
  %% calendar — layouts/calendar.mdx (ReUI event-calendar, dy- prefix)
  flowchart TB
    header[Month / Week / Day + resourceField lanes]
    grid[[Calendar grid — dateField → slot]]
    drawer[Detail drawer on click]
    header --> grid --> drawer
  ```

- [ ] **Create `model-content/operational-views/ux-guidelines.mdx` — P0** (the shared 30% that every page reuses). Keep it task-oriented:

  ```md
  ## Pick layout by job, not data shape
  table = find/filter/act · kanban = status pipeline · calendar = date/booking
  cards = visual gallery · spreadsheet = bulk edit 10+ rows (never for blocks/richText)

  ## Defaults to ship with
  - 1 collection → 2–3 views max (more bloats nav — see admin-shell.tsx hasMeaningfulViews)
  - columns 3–5 (useAsTitle + 2–4 status/owner/date); hide the rest, expose via ViewOptionsPanel
  - metrics 2–3 above the fold (ViewMetric: count + conditional count + one money/ratio)
  - actions 1–2 per row/bulk; hide builtins via features: { delete:false } and order via actionOrder

  ## Anti-patterns
  - groupBy with >6 values (MAX_GROUPS=15 fan-out, but UX collapses)
  - kanban moveMode: "action" without confirm — prefer "update" for simple status drags
  - calendar without dateField, or cards without cover image
  ```

- [ ] **Add per-layout `When to use / Don't use / Columns / Actions / Empty + loading / A11y` checklist** inside each `layouts/*.mdx` (the 70%). Link it back to the guidelines page:

  | Layout | When to use | Don't use | Columns | Actions | Empty/loading | A11y |
  |---|---|---|---|---|---|---|
  | `table` | dense find/filter, audits | status-only work | `name`, `status`, `owner`, `date` | row `Check In`, bulk `Export` | keep `?where`/`?search` shim, show filter count | keyboard nav via TanStack, sticky header |
  | `kanban` | workflow with 3–5 statuses | large N groups / free-text | `name`, `size`, `qty` | card `Mark Paid`, board `Export` | UNASSIGNED bucket only if `docs.length>0` (`kanban/use-grouped-view-data.ts:1`) | `@dnd-kit` `restrictToVerticalAxis`, focus ring |
  | `calendar` | date/booking/appointment | undated records | `name`, `guestCount` | `Reschedule` via drawer | `No events` + month nav | `dy-` `event-calendar` (index.css `--color-*`) |
  | `cards` | media/profile gallery | dense numeric data | `avatar`, `name`, `tag` + `showLabel:false` | `View` only | search + faceted filters (`cards/cards-layout.tsx:1`) | alt text for cover |
  | `spreadsheet` | fix 12 prices / flip flags | blocks/richText | 3 editable fields | `Save Changes` batch | bottom add-row, discard warning | `Tab`/`Enter`/`Esc` grid |

- [ ] **Wire the visuals into `@dyrected/knowledge` so coding agents see them:**
  - `src/shared-rules/content-modeling.md:1` — add operational view UX rule (point to `ux-guidelines.mdx`).
  - `src/shared-rules/frontend-integration.md:1` — add layout→chrome mapping (tablecn / @dnd-kit / ReUI / cards / spreadsheet + dy- prefix note).
  - `src/prompt-templates/skill.template.md:1` + `ai-rules.template.md:1` — add `<!-- GENERATED:PREVIEWS -->` section listing `public/previews/*.png` URLs and `<!-- GENERATED:UX_GUIDELINES:START -->`.
  - `packages/core/src/types/views.ts:1` JSDoc on `ViewConfig.layout` — add `@see https://dyrected.com/docs/model-content/operational-views/ux-guidelines` so `references.json` carries the link into `SKILL.md`.

- [ ] **Verification:** `pnpm --filter @dyrected/docs build` renders mermaid; `pnpm --filter @dyrected/knowledge generate` + `grep -c "Operational Views\|defineView" generated/SKILL.md` > 0; `apps/docs/public/previews/*.png` exist and are referenced from the new pages.

---

## 4) `editor-experience/*` — P1 fixes

### 4.1 `editor-experience/list-view.mdx` — P1 (stale)

- [ ] Title/description still say "The Collection List" as the only list. Rewrite lead: the list **is now the table operational view**. Mention synthesized `list` view for collections without `views`. Preserve sections on search (`admin.searchableFields` → fallback inferred set), filter builder draft-then-apply, `status` column, but frame them as table-view toolbar behavior.
- [ ] "Shaping the table" → rename to "Shaping the view". Document Column Controls + Density + View button now via `ViewOptionsPanel` (and per-variant persistence `variant: cards|kanban`).
- [ ] Add note on row actions vs bulk actions vs header actions (link to `model-content/operational-views/actions`).

### 4.2 `editor-experience/custom-components/list-view.mdx` — P1 (wrong slots)

- [ ] Four list slots are now **operational view slots** with aliasing: `beforeList` → `beforeViewHeader`, `beforeListTable` → `beforeViewContent`, `afterListTable`/`afterList` → `afterViewContent`. Keep old keys working but document new canonical names and `collectionView` group as primary.
- [ ] Update props table (`CollectionListSlotProps` still shimmed) and example using `AdminComponentSlot` + view layout.
- [ ] Add callout: `list-view-v1.tsx` deprecated, will be removed — migrate slot registrations to `collectionView`.

### 4.3 New `editor-experience/calendar-view.mdx` / `kanban-view.mdx` / `cards-view.mdx` — P1

- [ ] Editor-facing companions to the modeling pages: how to use drag-and-drop on kanban, click-to-inspect on calendar, gallery search on cards. Can be thin wrappers linking to `model-content/operational-views/layouts/*` plus editor tips (e.g. kanban empty state "Drag guest cards between columns").

### 4.4 `editor-experience/spreadsheet-view.mdx` — P1

- [ ] See §3.7. Also cross-link from `list-view.mdx` "Faster ways to edit in bulk" — that section still points to spreadsheet as a toggle on the legacy list.

### 4.5 `editor-experience/detail-view.mdx`, `form-and-field-hooks.mdx`, `lifecycle-events.mdx` — P2

- [ ] Detail view: still accurate, but add a sentence that operational views surface `View`/`Edit` via `features` and `actionOrder`.
- [ ] Field/form hooks: add callout that action `mutation` updates still fire `beforeChange`/`afterChange`.

---

## 5) `deliver-content/sdk-api/*` — P1

### 5.1 `sdk-api/overview.mdx`, `sdk-api/aggregate.mdx`, `filter.mdx`, `sort.mdx`, `pagination.mdx` — P2

- [ ] Add a short "Operational views build on these primitives" paragraph linking to the new section; no deep changes needed.

### 5.2 New `sdk-api/run-action.mdx` — P0

- [ ] Document `client.collection(slug).runAction(name, { docId / docIds, input })` (from `packages/sdk/src/index.ts:1`). Show `row` vs `bulk` vs `header` usage, success/error toasts, optimistic update, and access errors. Provide Next.js and plain `fetch` examples.

---

## 6) `@dyrected/knowledge` — generated catalogue is missing operational views — P0

Audited `packages/knowledge/{generated/*,src/*,scripts/generate.mjs}` on `feat/operational-views-2`. The docs build and LLM/skill artifacts are **stale with respect to this branch** — the generator does not yet know operational views exist. Without fixing this, `findRecipesByIntent`, `getReference`, `SKILL.md`, `ai-rules.md`, `llms-index.json`, and every generated `REFERENCE-*` region will stay blind to `defineView`/`defineAction`.

### 6.1 What's missing right now

| Artifact | File | Evidence | Impact |
| --- | --- | --- | --- |
| **Reference extraction** | `generated/references.json` (197 entries, 0 operational views types) | `grep ViewConfig/defineView/ActionConfig` hits only `CollectionConfig.views?: ViewConfig[]` (line 489) — `ViewConfig`, `ViewMetric`, `ViewSubMetric`, `ActionConfig`, `ViewActionFeatures`, `ViewLayout`, `ActionType`, `defineView`, `defineAction` never emitted | No API table can render for operational views; `getReference("…:ViewConfig")` returns `undefined` |
| **LLM index** | `generated/llms-index.json` | `references` array has no View/Action entries; `recipes` section has no operational views recipe to surface via intents | `findRecipesByIntent("kanban board by status")` has no match; agent `llms.txt` traversal misses views entirely |
| **Prompt skill / AI rules** | `generated/SKILL.md`, `generated/ai-rules.md` | `grep Operational/kanban/calendar` → 0 operational hits; integration contract still lists only Installation/CLI/Config/Collections/Globals/Fields/Rich text/Blocks/Admin/Preview/Storage/SDK/Workflows/REST | Copilots and `skills/dyrected/SKILL.md` will invent views or hallucinate their API |
| **Recipes** | `src/recipes/*` (20 recipes) + `generated/recipes.json` | Zero recipes use `defineView`/`defineAction`; `.intent-index.json` therefore has no view intents | No canonical copy-paste source for an LLM or the docs `RECIPE` regions to pull from |
| **Endpoints / OpenAPI** | `generated/endpoints.json` + `generated/openapi.json` + `src/generated/references.ts` | Action runner (`POST /api/collections/:slug/actions/:action` and/or `runAction`) not surfaced — only `aggregate`, CRUD, `transitions`, `__audit` appear; if the route exists it needs to be generated from `maximal-config.ts` | SDK `runAction` docs (§5.2) have no backing endpoint table to link to |
| **Docs runtime manifest** | `generated/docs-runtime-manifest.json` + `apps/docs/content/docs/**/*` | No manifest entry for new `model-content/operational-views/*` pages (they don't exist yet) — once they do they need `runtime: shared` and correct `runtimeGroup` | Runtime-filtered `llms-full-cloud.txt`/`self-hosted.txt` will exclude the new pages until the generator is re-run |
| **Examples inventory** | `generated/examples-inventory.json` | No inventory entries under `/model-content/operational-views` or `/deliver-content/sdk-api/run-action` — after adding pages the inventory must be regenerated so the doc-example lint can run | CI `generate:check` will fail post-docs until regenerated |

**Root cause in code:** `scripts/generate.mjs:568` `coreTypePaths` lists `adapters`, `admin`, `app-config`, `documents`, `hooks`, `request`, `schemaConfig`, `schemaCore`, `schemaInference`, `detail`, `workflows` — but never `views.ts` or `aggregate.ts`. So `extractReferences` never sees `packages/core/src/types/views.ts:1` or `packages/core/src/types/aggregate.ts:1`. And `referenceTargets:940` has targets for configuration/fields/hooks/sdk/adapters/workflows/detail but no target for operational views. `categoryLabels:474` has no `operational-views` label either.

### 6.2 Fix the generator (must land before or with the new docs pages)

- [ ] **Add `views.ts` + `aggregate.ts` to `coreTypePaths`** in `scripts/generate.mjs:568`:

  ```js
  const coreTypePaths = {
    // ...existing
    views: path.join(coreTypesRoot, "views.ts"),
    aggregate: path.join(coreTypesRoot, "aggregate.ts"),
  };
  ```

- [ ] **Extract operational view contracts** — extend `const references = [` at `scripts/generate.mjs:673` with at least:

  ```js
  ...extractReferences(coreTypePaths.views, {
    category: "operational-views", // or "configuration" if you reuse existing category
    sourcePackage: "@dyrected/core",
    names: new Set([
      "ViewConfig","DefineViewOptions","ViewMetric","ViewSubMetric",
      "ActionConfig","DefineActionOptions","ActionContext",
      "ViewActionFeatures","ViewLayout","ActionType","MetricColor",
    ]),
  }),
  ...extractReferences(coreTypePaths.views, {
    category: "operational-views",
    sourcePackage: "@dyrected/core",
    matches: (n) => n === "defineView" || n === "defineAction",
  }),
  ...extractReferences(coreTypePaths.aggregate, {
    category: "configuration",
    sourcePackage: "@dyrected/core",
    names: new Set(["AggregateOperation","AggregateArgs","AggregateResult"]),
  }),
  ```

  Pick `category: "operational-views"` (new) or map into `configuration`. If new, add it to `categoryLabels` and to `docsRuntimeManifest` training.

- [ ] **Add a `REFERENCE-OPERATIONAL-VIEWS` docs target** in `referenceTargets:940` so the generated tables actually land in a page, e.g.:

  ```js
  {
    file: "model-content/operational-views/define-view.mdx",
    region: "REFERENCE-OPERATIONAL-VIEWS",
    select: (e) => e.category === "operational-views",
  },
  // or split: view types → define-view.mdx, aggregate types → metrics.mdx
  ```

  Also add a `REFERENCE-AGGREGATE` target if you keep aggregates separate.

- [ ] **Update placeholder pages** — ensure `model-content/operational-views/define-view.mdx`, `actions.mdx`, `metrics.mdx` contain the markers `<!-- GENERATED:REFERENCE-OPERATIONAL-VIEWS:START -->` / `<!-- GENERATED:REFERENCE-AGGREGATE:START -->` (use `replaceGeneratedRegion` pattern from `generate.mjs:401`). Without the markers the generator throws.

- [ ] **Verify endpoint/openAPI generation** — add a collection with `views` + `actions` to `src/test-fixtures/maximal-config.ts` (copy the Guest Responses fixture from `apps/example-creator-next/dyrected.config.ts:1`). Re-run `pnpm --filter @dyrected/knowledge generate` and confirm `endpoints.json` now lists the action runner route if the core actually exposes one (if not, document that `aggregate` is the only new endpoint and `runAction` is SDK+core handler, not a new REST shape — don't invent a route).

- [ ] **Add operational view recipes** — create at least 3 new recipes under `src/recipes/` (each with `metadata.json` + `recipe.ts` + `recipe.test.ts`) so intents resolve and the docs have canonical sources to embed:
  - `operational-table-view` (`table` + `columns` + search/filter + row action)
  - `kanban-pipeline-view` (`kanban` + `groupBy` + `moveMode: "action"` + `@dnd-kit`)
  - `calendar-schedule-view` (`calendar` + `dateField` + drawer)
  - Optionally `operational-metrics` (`ViewMetric` with `aggregate`/`aggregates`/`expression`).
  Register each in `recipeDocsPathMap:46` and `categories` (`operational-views` or reuse `admin-experience`). Validate with `pnpm --filter @dyrected/knowledge generate:check`.

- [ ] **Update prompt templates** so agents actually mention views:
  - `src/shared-rules/content-modeling.md` — add operational views rule (one collection ≠ one admin page).
  - `src/shared-rules/cms-generation.md` — add "don't hand-build list pages when `views` exists."
  - `src/prompt-templates/skill.template.md` + `ai-rules.template.md` — add `<!-- GENERATED:REFERENCES -->` links for Operational Views docs.
  - `src/shared-rules/frontend-integration.md` — add SDK `runAction` call pattern.
  After editing, `pnpm --filter @dyrected/knowledge generate` must regenerate `generated/SKILL.md`, `generated/ai-rules.md`, and `skills/dyrected/SKILL.md`. Verify `grep -c "defineView\|Operational Views"` in those files > 0.

- [ ] **Regenerate and commit all artifacts** in one commit: `generated/{references.json,endpoints.json,openapi.json,recipes.json,intent-index.json,llms-index.json,SKILL.md,ai-rules.md,docs-runtime-manifest.json,examples-inventory.json}` plus `src/generated/{recipes.ts,references.ts,prompts.ts,ai.ts,runtime.ts}` and `skills/dyrected/SKILL.md`. CI guards this via `pnpm --filter @dyrected/knowledge generate:check`.

- [ ] **Re-run `@dyrected/docs` generation** after — `pnpm --filter @dyrected/knowledge generate` rewrites `apps/docs/content/docs/model-content/configuration/collections.mdx` etc. via `outputGeneratedRegion`, so the docs pages in §2–3 must be authored first or the generator will overwrite them unexpectedly. Order: ship placeholder markdown with markers → run knowledge generator → finish prose.

---

## 7) `examples-and-recipes` — P1

- [ ] `examples-and-recipes/examples/ecommerce.mdx` etc.: add an "Operational views for …" callout where relevant (e.g. orders kanban by `status`, booking calendar by `dateField`).
- [ ] `library/*`: ensure `editorial-publishing-workflow.mdx`, `custom-page-media-picker.mdx`, `role-based-access.mdx` link to actions for role-aware `access` on views/actions.
- [ ] The test fixture `apps/example-creator-next/dyrected.config.ts` (Guest Responses exercising all layouts/metrics/actions) should be excerpted as the canonical copy-paste example in `model-content/operational-views/overview.mdx` — don't invent a new one.

---

## 8) Cloud vs self-hosted framing — P1

Files: `deployment-and-operations/cloud/overview.mdx`, `deployment-and-operations/server-runtime/hooks/*`, `model-content/operational-views/actions.mdx`

- [ ] Follow `DOCS_PHILOSOPHY.md:146` runtime rubric: Cloud = managed content backend (content rules = serializable `mutation`), self-hosted = runtime ownership (can run `handler` with Stripe/Slack SDKs, custom endpoints, `Collection Auth`).
- [ ] In `actions.mdx`, clearly separate Cloud-safe declarative mutations vs self-hosted `handler` — don't imply Cloud runs arbitrary server code.
- [ ] In `hooks/*`, add a one-line pointer: "Actions initiate changes that then run through hooks."

---

## 9) Deprecations, redirects, and housekeeping — P1

- [ ] Add a callout on any page that still mentions `list-view-v1` / `CollectionListPage`: deprecated since `bc9a2c77`, kept for reference, will be removed. Point to `operational-views/routing-and-preferences`.
- [ ] `apps/docs/content/docs/editor-experience/list-view.mdx` — if you rename to `table-view.mdx`, add redirect `list-view` → `table-view` (check `next.config.ts` redirect pattern).
- [ ] Update `apps/docs/CHANGELOG.md` (currently near-empty) with a `## 2026-08-21 — Operational Views` entry summarizing the 4 layouts + actions + metrics + default view synthesis + preference key migration.
- [ ] Bump `apps/docs/package.json` `docs:build` check — run `pnpm --filter @dyrected/docs build` and fix any broken `meta.json` `pages` order after adding new files.

---

## 10) Generated public artifacts — P0

After all pages ship:

- [ ] Rebuild `apps/docs/public/llms-full.txt`, `llms-full-cloud.txt`, `llms-full-self-hosted.txt` (and the `coverage-manifest.json`) — they currently list operational view types but are snapshot builds from before the list migration; regenerate so LLM index matches live docs.
- [ ] Update `apps/docs/components/*` search index if you use generated `llms-index` for `find-skills` / `stitch-design-taste`.

---

## 11) Visuals & copy-paste confidence — P2

- [ ] Add one screenshot or Mermaid diagram per layout (keep `source.config.ts` `remarkMermaid` in mind — use ` ```mermaid ` fences).
- [ ] Every code block must be complete and runnable — no `// ... rest of your setup` (per `DOCS_PHILOSOPHY.md:33`). Test each `defineCollection` example by pasting into `apps/example-creator-next/dyrected.config.ts` and running `pnpm --filter @dyrected/core build`.
- [ ] After each code block, add 1–2 sentences of plain-English "what just happened and why it matters."

---

## 12) Suggested execution order

1. **Week 1 — P0:** 3.1–3.6 + 3.8–3.9 + 5.2 + 10 (new conceptual pages + SDK runAction + llms rebuild)
2. **Week 1 — P1:** §2 (collections.mdx) + §4.1–4.2 (list-view + slots) + §4.3–4.4 + §8 + §9
3. **Week 2 — polish:** §7 examples, §6 references, §11 visuals, §5.1 aggregate cross-links

**Definition of done for any item:** page follows `DOCS_PHILOSOPHY.md:22` progressive depth, passes `pnpm --filter @dyrected/docs build`, code samples verified against the source file in the table above, and changed nav `meta.json` actually resolves.

---

## 13) File checklist (create / edit)

**Create (new):**
- `apps/docs/content/docs/model-content/operational-views/meta.json`
- `apps/docs/content/docs/model-content/operational-views/overview.mdx`
- `apps/docs/content/docs/model-content/operational-views/define-view.mdx`
- `apps/docs/content/docs/model-content/operational-views/ux-guidelines.mdx`  # ← visual + UX (3.11)
- `apps/docs/content/docs/model-content/operational-views/layouts/table.mdx`
- `apps/docs/content/docs/model-content/operational-views/layouts/kanban.mdx`
- `apps/docs/content/docs/model-content/operational-views/layouts/calendar.mdx`
- `apps/docs/content/docs/model-content/operational-views/layouts/cards.mdx`
- `apps/docs/content/docs/model-content/operational-views/actions.mdx`
- `apps/docs/content/docs/model-content/operational-views/metrics.mdx`
- `apps/docs/content/docs/model-content/operational-views/routing-and-preferences.mdx`
- `apps/docs/content/docs/deliver-content/sdk-api/run-action.mdx`
- `apps/docs/content/docs/editor-experience/calendar-view.mdx` *(or under `model-content/operational-views/layouts/` and link)*
- `apps/docs/content/docs/editor-experience/kanban-view.mdx`
- `apps/docs/content/docs/editor-experience/cards-view.mdx`
- `apps/docs/public/previews/views-{table,kanban,calendar,cards,spreadsheet}.png` # real screenshots from example-creator-next

**Edit (stale):**

- `apps/docs/content/docs/model-content/configuration/collections.mdx`
- `apps/docs/content/docs/editor-experience/list-view.mdx` (+ rename/redirect)
- `apps/docs/content/docs/editor-experience/spreadsheet-view.mdx`
- `apps/docs/content/docs/editor-experience/custom-components/list-view.mdx`
- `apps/docs/content/docs/deliver-content/sdk-api/overview.mdx`
- `apps/docs/content/docs/deployment-and-operations/cloud/overview.mdx`
- `apps/docs/content/docs/deployment-and-operations/server-runtime/hooks/overview.mdx`
- `apps/docs/CHANGELOG.md`
- `apps/docs/source.config.ts` / `next.config.ts` (only if nav/redirects needed)
- `apps/docs/content/docs/meta.json` + `model-content/meta.json` + `editor-experience/meta.json`

**Regenerate (build artifacts):**

- `apps/docs/public/llms-full.txt` + `llms-full-cloud.txt` + `llms-full-self-hosted.txt`
- `packages/knowledge/generated/references.json` (+ `references.ts`, `examples-inventory.json`, `llms-index.json`)

---

*Generated from `git diff --stat origin/main...HEAD` and `packages/core/src/types/views.ts:1`, `specs/TODO-2026-08-17/operational-views.md:1`, `.changeset/*.md`. Mark items done with `[x]` and link the PR that closes them.*
