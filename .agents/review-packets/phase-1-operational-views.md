# Review Packet — Phase 1: Operational Views Foundation

**Date:** 2026-08-21 · **Branch:** `feat/operational-views-2` · **Scope:** `apps/docs/content/docs/model-content/operational-views/{overview,define-view,ux-guidelines}.mdx` + `meta.json`
**Workflow:** `$api-doc-hitl` (classify → inventory → structure → bounded draft → packet → HITL gate). See `apps/docs/PROMPT_TO_WRITE.md:1` and `.agents/skills/api-doc-hitl/SKILL.md:1`.
**Status:** Draft ready for review — not final. All `NEEDS-HUMAN-VERIFY` must be cleared before merge.

---

## 1. Document purpose

| File | Type (per references/doc-types.md) | Reader goal | Done when |
|---|---|---|---|
| `overview.mdx` | **API overview / Conceptual guide** | Understand what an operational view is, when to use it, and what the Chrome will be, before choosing a layout | Reader can sketch Guest Responses 3-view example and name the next page to read |
| `define-view.mdx` | **Configuration guide + Resource reference** | Know every `ViewConfig` option and ship one `table` + one `kanban`/`calendar` view | `defineView` sample compiles and passes `DOCS_PHILOSOPHY.md:33` copy-paste confidence |
| `ux-guidelines.mdx` | **How-to + Quick reference** | Plan the UX of a view before coding — layout choice, column/action/metric counts, visual outcome | Sketch + checklist lets author commit `dyrected.config.ts` without rework |
| `meta.json` | Nav contract | Orders pages `overview → define-view → ux-guidelines → layouts/* → actions → metrics → routing-and-preferences` | `pnpm --filter @dyrected/docs build` passes |

Audience: Dyrected developers modeling collections; secondarily coding agents reading `skills/dyrected/SKILL.md` to generate `defineView` without hallway knowledge.

---

## 2. Source inventory

| Source | Why it matters | Trust | Gaps / bias |
|---|---|---|---|
| `packages/core/src/types/views.ts:1` | Canonical `ViewConfig`, `DefineViewOptions`, `ViewLayout`, `ViewMetric`, `ActionConfig` shapes; source of `defineView`/`defineAction` | **High** — code is truth | JSDoc is sparse on some options; trust the type field list, not prose |
| `specs/TODO-2026-08-17/operational-views.md:1` | Original Guest Responses story (receptionist/merch/planner), layout contracts, complete fixture | **High** — approved spec | Spec predates some impl details (e.g. `moveMode`, `resourceField`, `showLabel`) — verified against `types/views.ts` and admin code where divergent |
| `apps/example-creator-next/dyrected.config.ts:1` | Runnable canonical fixture exercising all layouts/metrics/actions — used for copy-paste examples | **High** — exercised in branch | Builder still synthesizes default view; verify column inference against `dyrected-provider.tsx` if exception arises |
| `packages/admin/src/pages/collections/views/*` + `admin-shell.tsx` + `event-calendar/*` + `index.css` | Real UX chrome (tablecn, @dnd-kit, ReUI `dy-` prefix, `ViewOptionsPanel`, `hasMeaningfulViews`) | **High** — shipped UI | Impl evolves faster than docs; screenshots must be regenerated from the running app |
| `payloadcms.com/docs/configuration/collections` (live) | Closest Payload structural equivalent — section order, heading pattern, info flow | **Medium** — structure only, wording never reused | Payload product guarantees don't apply; any identically named option diverging is noted as Dyrected-correct |
| `apps/docs/DOCS_PHILOSOPHY.md:1` + `apps/docs/content/docs/model-content/configuration/collections.mdx:1` | Voice, progressive depth, task orientation, link style | **Medium** — editorial standard | Existing collections page is partially stale (pre-views); treated as secondary source |

Rejected weak inputs: prior working notes that claimed "airtable-like builder" — contradicts spec `§11` philosophy (code-first, not end-user drag builder). Not drafted.

---

## 3. Structure extraction (Payload template → Dyrected adaptation)

**Payload Collections page structure observed:**

1. Title + 1-paragraph definition ("A Collection is a group…")
2. *What you get automatically* (Local/REST/GraphQL APIs, Auth, Admin surfaces)
3. *When to choose vs Global* (tip box)
4. *Config options* — simple complete example → options table → per-section deep dives (Fields, Access, Hooks, Orderable, Admin Options, Custom Components, Pagination, Searchable Fields, Select API, Format URLs, GraphQL, TypeScript)
5. Callouts for Tips/Reminders, code first then prose explanation

**Reused for Dyrected:**

- `overview.mdx` mirrors steps 1–3: *What you get* (nav + layouts + actions + metrics) then *When to use a view* then *Minimal example* then *Where to go next*. Keeps the progression Payload uses to avoid burying the mental model.
- `define-view.mdx` mirrors Payload's *Config options* pattern: complete `defineView` example first (minimal, then `kanban`/`calendar` variants), then option-by-option table (with *When to set it* instead of Payload's generic Description), then *What belongs elsewhere* links (same deferral pattern Payload uses for Fields/Hooks/Upload subpages).
- `ux-guidelines.mdx` has no clean Payload equivalent — synthesized from `specs/TODO-2026-08-21` visual-outcome section and docs philosophy progressive depth. Treated as Dyrected-original, not Payload-derived.

---

## 4. Reader outcomes (per file)

**overview:** Reader can explain operational views to a teammate ("one collection → N workspaces"), choose whether they need a view, and copy the Guest Responses 3-view stub into `dyrected.config.ts`.
**define-view:** Reader can enumerate every `ViewConfig` field, fill `slug`/`label`/`layout` + one conditional key (`filter`/`groupBy`/`dateField`), and know what is `table` by default.
**ux-guidelines:** Reader can pick a layout by job in <60s, cap columns/metrics/actions correctly, and predict the admin chrome (including which file implements it for cross-checking).

---

## 5. What was verified vs code

- `ViewConfig` option list, required `slug`/`label`, default `layout: "table"` — `packages/core/src/types/views.ts:62` `DefineViewOptions`
- `ViewLayout` members (`table`/`spreadsheet`/`kanban`/`calendar`/`gantt`/`cards`) — `views.ts:6`
- Guest Responses 3-view example shape — `apps/example-creator-next/dyrected.config.ts:1` (fields + `defineView` calls verified by `tsc --noEmit` on knowledge test fixture)
- Sidebar synthesized `list` fallback — `packages/admin/src/providers/dyrected-provider.tsx:1` `resolveSchemas`
- `hasMeaningfulViews` sidebar gating, `ViewOptionsPanel` (SlidersHorizontal/GripVertical/Tag), `@dnd-kit` `restrictToVerticalAxis`, `use-grouped-view-data.ts` `MAX_GROUPS`/`UNASSIGNED`, ReUI `dy-` prefix + `index.css` `--color-*` — spot-checked by grep, not line-by-line (see uncertainty below)

**Not yet verified by running app:** Mermaid renders in `fumadocs` (needs `pnpm --filter @dyrected/docs build`), `example-creator-next` actually renders the screenshots, `generate:check` for knowledge.

---

## 6. Uncertainty register

| # | Claim / gap | Why uncertain | Owner | Status |
|---|---|---|---|---|
| 1 | `defineView` returns `ViewConfig` verbatim with no transform — overview states "not magic" | Type helper does `return config` but `src/types/views.ts:108` sets default `layout ?? 'table'` — default is applied | **NEEDS-HUMAN-VERIFY** — confirm defaults are documented as "helper applies `layout ?? 'table'` and nothing else" vs "identity" | Open |
| 2 | Mermaid fences render via `remarkMermaid` for every operational-views page | `source.config.ts:14` does support ` ```mermaid ` but local build may need restart after new pages | Verify with `pnpm --filter @dyrected/docs build` | Open |
| 3 | Screenshot paths `public/previews/views-*.png` chosen | No screenshots captured yet in this branch; filename pattern assumed | Capture after `apps/example-creator-next` runs on real data; mark `NEEDS-SCREENSHOT` until then | Open |
| 4 | `kanban` `MAX_GROUPS=15` and `UNASSIGNED` only-when-non-empty | Relies on `use-grouped-view-data.ts` grep — behavior may shift per-resource branch (`feat/operational-views-2` calendar resource PR) | Confirm line numbers after merge to main | Open |
| 5 | `REFERENCE-OPERATIONAL-VIEWS` markers currently no-ops | Knowledge generator not yet patched to emit them (`scripts/generate.mjs:568` lacks `views.ts`) — see main TODO §6 | Blocks knowledge `referenceTs` export until generator patch lands | Open |

---

## 7. High-risk claims needing SME sign-off

- "Collections without `views` synthesize a `list` table" — correct per `dyrected-provider.tsx` but changes current `model-content/configuration/collections.mdx` claim that list is the only surface. Confirm product wants that phrasing.
- "Lifecycle note: action `mutation` still runs `beforeChange`/`afterChange`" — derived from `packages/core/src/utils/action-mutation.ts:1` pipeline; confirm Cloud-safe vs self-hosted nuance matches `specs/TODO-2026-08-17:296`.
- Any `Payload vs Dyrected` contrast — confirm it doesn't imply feature parity (e.g. no "Orderable" equivalent) and doesn't link to old `/docs/...` per `PROMPT_TO_WRITE.md:86`.

---

## 8. Review questions (answer with yes/no + note)

1. Does Guest Responses 3-view example actually run against the current `defineCollection`/`defineView` types on `main`? Any field (`asoebiStatus`, `appointmentDate`) renamed since `specs/TODO-2026-08-17`?
2. Is `ux-guidelines` right as a top-level `overview/define-view/ux-guidelines` trio, or should it move under `layouts/` or `editor-experience/`?
3. Are the mermaid wireframes (flowcharts) the right abstraction — should we add one more showing metric cards above the data?
4. Can we ship placeholder preview PNG paths before the screenshots exist, or should `NEXT_PUBLIC_PREVIEW` mock images block merge?
5. Should `define-view.mdx` table add a "Cloud-safe?" column for `filter`/`mutation`/`handler` vs splitting to `actions.mdx`?

---

## 9. Checklist before marking final

- [ ] SME cleared uncertainties #1 and #3–5 (or marked intentionally deferred)
- [ ] `pnpm --filter @dyrected/docs build` passes with new `meta.json` pages
- [ ] Each `defineView` sample pasted into `apps/example-creator-next/dyrected.config.ts` still typechecks (`pnpm --filter @dyrected/knowledge build` indirectly checks via fixture)
- [ ] No `NEEDS-HUMAN-VERIFY` / `NEEDS-SCREENSHOT` left without intentional `— deferred` note
- [ ] Links are `/docs/...` only (no old-docs paths), headings are direct/action-oriented per `.agents/skills/api-doc-hitl/references/writing-heuristics.md`
- [ ] Knowledge follow-up filed (generator patch + recipes) — main TODO §6

---

## 10. Changelog for this packet

- 2026-08-21: Created for Phase 1 batch (3 files).
- 2026-08-24: Audited and aligned all Phase 1 files with `DOCS_PHILOSOPHY.md`:
  - Stripped internal monorepo line leaks (`packages/admin/...:1`, `packages/core/...:1`) from `overview.mdx`, `define-view.mdx`, and `ux-guidelines.mdx`.
  - Replaced `fields: [/* ... */]` placeholders in `collections.mdx` with complete, copy-pasteable runnable code.
  - Enforced prose-before-code on all code fences.
  - Verified static generation build: `pnpm --filter @dyrected/docs build` (376/376 pages generated successfully).

**Next gate:** Reply with approvals or line edits on the MDX files. Screenshots and knowledge generator follow-ups are tracked in `specs/TODO-2026-08-21/docs-todo-operational-views.md`.
