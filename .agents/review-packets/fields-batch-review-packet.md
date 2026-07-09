# Fields Docs — Batch Summary

Scope: `apps/docs/content/new-docs/basics/fields/*.mdx`

Status: `ready-for-sme-review`

Per-page detail lives in the sub-batch packets:
- `fields-batch-1-review-packet.md` — overview, text, textarea, email, number, checkbox
- `fields-followup-code-and-new-pages.md` — email code-trace, number `min`/`max`, the 5 new pages
- `fields-batch-2-review-packet.md` — select, radio-group, date, json, rich-text
- `fields-batch-3-review-packet.md` — group, array, blocks, row
- `fields-batch-4-review-packet.md` — relationship, upload, join
- `fields-batch-5-stubs-and-tabs.md` — stub removal + `defineTab`

## Method
- **Structure** from the closest live `payloadcms.com/docs/fields/*` page (extracted, never reused as wording). Payload-only options were deliberately excluded where Dyrected lacks them (`min`/`max` on Payload's number, `minRows`/`maxRows`, `filterOptions`, `jsonSchema`, `date.displayFormat`/`pickerAppearance`, `timezone`, polymorphic `relationTo`, `localized`, `saveToJWT`, `interfaceName`, `dbName`).
- **Behavior** grounded in `packages/core/src/types/schema-core.ts` (verified field types + admin sub-types) and the source-of-truth prose in `apps/docs/content/docs/` (`concepts/fields.mdx`, `reference/fields.mdx`, `concepts/relationships.mdx`, `concepts/depth.mdx`, `concepts/dynamic-options.mdx`, `concepts/schema.mdx`, `adapters/storage.mdx`, `guides/building-a-page-builder.mdx`).
- **Links** restricted to verified-real `/new-docs` pages. Empty stub targets (`sdk-api/depth`, `features/rich-text/*`, `features/upload/overview`) were avoided; the one pre-existing bad link (relationship → `sdk-api/depth`) was fixed.
- Generated `{/* GENERATED:REFERENCE-FIELD-* */}` blocks were treated as generated output; where they needed to change, the generator registry / types were updated and `pnpm generate` was re-run, not hand-edited.

## Files completed (24 pages)
- **Rewritten/enhanced (18):** overview, text, textarea, email, number, checkbox, select, radio-group, date, json, rich-text, group, array, blocks, row, relationship, upload, join.
- **New pages created (5):** datetime, time, url, icon, multi-select.
- **Reframed (1):** tabs (now a `defineTab` helper page).
- **Deleted (4):** code, collapsible, point, ui (no Dyrected field type; removed from nav).

## Files with no clean Payload-to-Dyrected mapping
- `code`, `collapsible`, `point`, `ui` — Payload field types with no Dyrected equivalent. Per product decision: deleted and removed from nav (idiomatic alternatives noted in the batch-5 packet for possible future recipe pages).
- `tabs` — Payload field type; Dyrected models it via `admin.tab`. Reframed around the new `defineTab` helper instead of a field-reference page.

## Code changes shipped (beyond docs)
1. **`number` field `min`/`max`** (advisory, mirroring `maxLength`): `schema-core.ts`, admin `text-field.tsx`, generator registry, `number.mdx`, test. All builds/tests green.
2. **`defineTab` helper**: `packages/core/src/index.ts` + test. Wraps existing `admin.tab` rendering.
3. **Email doc fix** from an auth-injection code trace (`config.ts`).

## Files that need JSDoc or generator changes (flagged, not done)
- **O-6 (structural fields' thin generated blocks):** `array`, `group`, `row`, `join` generate only `TypedField<…, unknown>` because their real options live in the shared `FieldBase`. Authored prose now carries the teaching. If we want richer generated blocks, the fix is in the generator/JSDoc (surface relevant `FieldBase` members per page), not per-MDX.
- **O-4 (`UrlField` type):** typed `TypedField<"url", string>` but the field returns a structured link object (`url-field.tsx:30`). Tightening the core type would make the generated `url.mdx` contract reflect the real shape.
- **datetime/time aliases** carry no JSDoc, so their generated blocks show only a signature. A one-line JSDoc on each would enrich them.

## Resolved in code (follow-up fixes)
- **O-2 (depth default) — FIXED.** REST controllers defaulted inconsistently (list `2`, findOne `10`, global `10`) while the SDK defaulted to `1`. Set all three REST defaults to `1` (`collection.controller.ts:122,267`, `global.controller.ts:23`), matching the SDK. `depth.test.ts` passes; `relationship.mdx` now states the default is `1`.
- **O-4 (UrlField type) — FIXED.** Added `UrlLinkValue` interface and widened `UrlField` value to `string | UrlLinkValue` (`schema-core.ts`); registered `UrlLinkValue` in the generator so `url.mdx` now documents the structured shape. core/sdk/admin all build.
- **Email footgun — FIXED.** `config.ts` enforcement pass now re-asserts `required`/`unique`/`promoted` on a redefined `email` and `required` on `password`, so a custom `email` can never silently drop uniqueness. Regression test added (`config.test.ts`).

## Open questions for human review

- **O-3 — DECIDED (advisory).** Product owner confirmed `min`/`max`/`maxLength` stay advisory (Admin + client hint), not server-validated. Docs say "advisory" consistently. No further action.
- **Release notes/changesets — DONE.** One patch changeset (`.changeset/dynamic-select-and-field-rendering.md`) covers the whole session: dynamic-select server search, `cacheTTL`, `DyrectedRichText`, Next `DyrectedIcon` re-export, Nuxt `NuxtImg`/`@nuxt/image`, `RichTextField`→`string`, `UrlField` widening, number `min`/`max`, `defineTab`, email/password enforcement, depth defaults, and the field-page renames. Bumps `@dyrected/{core,admin,react,vue,next,nuxt,knowledge}` and `dyrected`.

## Resolved since (no longer open)

- **O-1** — dedicated pages created for `datetime`, `time`, `multiSelect`, `url`, `icon`.
- **O-2** — depth default settled at `1` in code and docs.
- **O-5 (dynamic options) — DONE.** `select.mdx` now documents server resolvers, searchable lists, dependent (country → state) dropdowns, `cacheTTL`, creatable "grow over time" values, and displaying the stored value. The rich-text half was already covered by `displaying-content/overview`.
- **O-5b (dynamic-select code was not optimal) — FIXED.** The Admin previously loaded the entire dynamic list into the browser and filtered client-side, never sending the search term. `select-field.tsx` and `multi-select.tsx` now forward a debounced `search` param to the resolver, use `keepPreviousData`, and set `shouldFilter={!isDynamic}` so the server is authoritative for dynamic lists. New shared `useDebouncedValue` hook. `cacheTTL` is now honored server-side (`router.ts`) with a regression test.
- **O-6 — DONE.** All bare field-type aliases (`DateField`, `DateTimeField`, `TimeField`, `SelectField`, `RadioField`, `NumberField`, `BooleanField`, `MultiSelectField`, `RelationshipField`, `ImageField`, `RichTextField`, `JsonField`, `ObjectField`, `ArrayField`, `BlocksField`, `JoinField`, `RowField`) carry a JSDoc one-liner; the generated reference blocks on every field page now show a real description instead of the "Exported type…" fallback.
- **Naming — DONE.** Pages renamed to match helpers: `checkbox`→`boolean`, `group`→`object`, `upload`→`image`, `radio-group`→`radio`; titles now "Boolean"/"Object"/"Image"/"Radio"/"Datetime"/"Multi Select". Slugs, inbound links, `meta.json`, generated region markers, generator map, and the mirror test all updated together.
- **Email footgun** — fixed in `config.ts`; `email.mdx` note updated to describe the re-asserted constraints.
- **`defineTab` signature** — specified by the product owner.
- **Variant condition footgun — NOT a bug.** Confirmed the Admin backfills the first variant into any block row missing one when the edit form loads (`buildDefaultValues`, `utils.ts:195`), so `admin.condition` on `variant` sees a real value even for API-written rows. `blocks.mdx` documents this with an accurate `<Note>`.
- **Displaying-content placement** — owner reorganized to `managing-data/displaying-content/overview.mdx`.

## Verification run

- `@dyrected/core` build (DTS) ✅ · `@dyrected/admin` build ✅
- `@dyrected/knowledge generate:check` clean ✅ · `knowledge test` 35/35 ✅
- `core dynamic-options.test` 4/4 ✅ (incl. new `cacheTTL` test) · `core define-field.test` ✅ (min/max + defineTab)
- No links to stub pages in the fields tree ✅
