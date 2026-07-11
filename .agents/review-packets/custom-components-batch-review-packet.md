# Review Packet — `features/custom-components` docs batch

**Scope:** All eight `*.mdx` files in `apps/docs/content/new-docs/features/custom-components/` were empty stubs. This batch followed the `$api-doc-hitl` workflow: structure informed by the closest live Payload pages, grounded in Dyrected's real behavior verified against `packages/admin` + `packages/core`. **Review-ready, not final.**

**Method:** Two grounding passes — a Dyrected component-system probe and a Payload structure extraction — plus direct reads of `field-renderer.tsx`, `admin-component-slot.tsx`, `list-page.tsx`, `dashboard.tsx`, and the `AdminComponents` / core slot types.

---

## Headline: Dyrected's component surface is far narrower than Payload's

Payload's custom-components section spans root components, custom providers, custom views, document views, edit view, and list view. **Dyrected supports exactly three things**, verified in code:

1. **Custom field components** — `admin.component: '<key>'` on a field → `components.fields['<key>']`. Per-field override with an arbitrary key (NOT per field type). Props: `value, onChange, field (schema), path, disabled, collection (slug string), context ({ user, schemas, siblingData })`. Error-boundary wrapped. (`field-renderer.tsx:88-104`, `:40-57`)
2. **Dashboard slots** — `beforeDashboard` / `afterDashboard` declared in top-level `admin.components`; components registered under `components.dashboard`. Props: `DashboardSlotProps { client, user, schemas }`. (`dashboard.tsx:242-269`, `admin-components.ts:14-21`)
3. **Collection-list slots** — `beforeList` / `beforeListTable` / `afterListTable` / `afterList` declared per collection in `admin.components`; registered under `components.collectionList`. Props: `CollectionListSlotProps` (client, user, collection, collectionSlug, response, documents, isLoading, pagination, permissions, urls). Also present on upload/media collection lists. (`list-page.tsx:783-847`, `media-page.tsx:281-438`, `admin-components.ts:24-58`)

Slots render via `AdminComponentSlot` (`admin-component-slot.tsx`): keys → registry lookup, each wrapped in its own error boundary, dev-warn (deduped) on missing keys, arrays allow multiple components per slot.

### Confirmed to NOT exist (exhaustive grep of `packages/core/src` + `packages/admin/src`)
- Root components (nav, header, login, logo-as-component, actions, settingsMenu) — logo is **branding config**, not a component.
- Custom React context providers around the admin (`AdminUIProps` has no `children`/provider slot; the provider tree is hard-coded, `index.tsx:194-211`).
- Custom/replaced views, custom routes (route table is a fixed `<Routes>` block, `index.tsx:96-103`).
- Document views / document tabs / edit-view replacement or slots (no edit-page slots exist).
- Full list-view replacement (only the 4 injection slots).
- Any global-level slots (globals have no `admin.components`).

---

## Pages: 3 published, 5 unpublished

| Page | Verdict | Action |
|---|---|---|
| `overview` | REAL | Written — canonical home for field components + the slot model + honest boundaries |
| `dashboard` | REAL | Written — `beforeDashboard`/`afterDashboard` + `DashboardSlotProps` |
| `list-view` | REAL | Written — the 4 list slots + `CollectionListSlotProps` |
| `root-components` | GAP (feature absent) | Unpublished → `__root-components.mdx` |
| `custom-providers` | GAP (feature absent) | Unpublished → `__custom-providers.mdx` |
| `customizing-views` | GAP (feature absent) | Unpublished → `__document-views.mdx`… → `__customizing-views.mdx` |
| `document-views` | GAP (feature absent) | Unpublished → `__document-views.mdx` |
| `edit-view` | GAP (feature absent) | Unpublished → `__edit-view.mdx` |

`meta.json` updated: `overview`, `dashboard`, `list-view` published; the five gaps listed with the `__` prefix (matching the repo convention).

**Decision for the human:** the five gap pages document Payload capabilities Dyrected doesn't have. I unpublished them (consistent with the `__` convention used for `document-locking`/`metadata` in the admin batch). Alternatives if you prefer: keep them as honest "not supported" stubs, or re-publish once/if those features are built. The overview already states the boundary explicitly so readers aren't left hunting.

---

## Doc-vs-code conflict fixed (JSDoc)

The `AdminComponents` JSDoc (`packages/admin/src/types/admin-components.ts`) was **wrong** on two of three keys and would mislead anyone reading the type or a generated reference:

1. `fields` said "keyed by field **type** name … replaces the built-in renderer for every field whose `type` matches." Actual: keyed by the arbitrary `admin.component` string; per-field, not per-type (`field-renderer.tsx:88`).
2. `collectionList` said "keyed by collection **slug** … replaces the **entire list view**." Actual: keyed by slot-key names, injects around the list (`list-page.tsx:791` uses it as the slot registry). There is **no** full-list-view replacement code path.

**Fixed** the JSDoc for `fields`, `dashboard`, and `collectionList` plus the `@example` to describe the real declare-then-provide model. `AdminComponents` is not currently in the `@dyrected/knowledge` generated refs, so no regeneration was needed. Admin package typechecks clean.

> Note: the sonnet component-probe subagent initially reported `collectionList` as a "PARTIAL / EXISTS" whole-list-view replacement — it took the wrong JSDoc at face value. Direct reading of the consumption code (`list-page.tsx`) disproved it; the docs reflect the code, not the JSDoc.

---

## Payload equivalents used (structure only)

- overview → `payloadcms.com/docs/custom-components/overview`
- root-components → `/custom-components/root-components`
- custom-providers → `/custom-components/custom-providers`
- customizing-views → `/custom-components/custom-views`
- dashboard → `/custom-components/dashboard` (Payload's is a widget system; Dyrected's is slots)
- document-views → `/custom-components/document-views`
- edit-view → `/custom-components/edit-view`
- list-view → `/custom-components/list-view`

Structure borrowed (concept → config shape → props table → example); wording original; Payload's import-map/component-path machinery deliberately omitted because Dyrected passes real component references (no import map).

---

## Open questions for human review

1. Ship the five gaps as unpublished (current state), keep as "not supported" stubs, or are any of these features planned? (Affects whether the section stays at 3 pages.)
2. Vue custom components mount a full Vue app instance per rendered field/slot (`react-in-vue.ts` `wrapVueComponent`). The docs mention Vue support but don't flag this cost. Confirm whether to add a performance note.
3. Spot-check the three published pages against the running admin (slot positions, that media-collection lists really expose all four slots).

## Verified by evidence vs. needs human
- **Verified against source:** the entire real surface (field components, both slot groups, props, registration, error handling, Vue wrapping) and every "does not exist" claim.
- **Needs human:** the unpublish decision (Q1), the Vue perf note (Q2), and a UI spot-check (Q3).
