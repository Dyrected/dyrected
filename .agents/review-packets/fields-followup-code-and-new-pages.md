# Fields Follow-up — Code Change + New Pages Review Packet

Scope: three directives issued after sub-batch 1 review.

Status: `ready-for-sme-review` — all builds/tests green; open design/product questions below.

---

## Item 1 — Email auth caveat (docs only, code-traced)

**Change:** rewrote the `<Note>` in `apps/docs/content/new-docs/basics/fields/email.mdx`.

**Why:** the original "redefining them collides with the built-in auth fields" was inaccurate.

**Code trace (CONFIRMED):** `packages/core/src/utils/config.ts` `normalizeConfig()`:
- Auth injection is skip-if-present (L104, L108) — a developer-defined `email`/`password`/`roles` field is kept; Dyrected does not inject its own, error, warn, or duplicate.
- An enforcement pass (L158-189) unconditionally overrides `access.update` on any field named `email`/`password`/`roles`.
- The enforcement pass re-applies **only** `access.update`, not the injected `email`'s `unique`/`required` (L115-117). A developer-defined `email` without `unique: true` silently lacks the uniqueness constraint. The Note now warns to set `unique: true`.

**Verified by:** source read. **Status:** `verified-final` for this sentence.

---

## Item 2 — `min`/`max` on the number field (package code + docs)

**Design decision:** implemented `min`/`max` as **advisory** options, mirroring the existing `maxLength`/`maxWords` pattern exactly. Rationale: there is no server-side validation layer for any field option today (verified — `required`/`unique`/`maxLength` are not enforced on write in `packages/core`; enforcement is admin-form + DB constraint only). Adding hard server validation for just `min`/`max` would be an inconsistent one-off. Advisory min/max = typed config + admin number-input `min`/`max` attributes; hard limits go in a hook (documented).

**Files changed:**
| File | Change |
| --- | --- |
| `packages/core/src/types/schema-core.ts` | Added `NumberLimitFieldConfig { min?, max? }` (interface, carries JSDoc), `NumberLimitFieldAdmin` (admin compat alias), `NumberFieldAdmin = NumberLimitFieldAdmin`; changed `NumberField` to `TypedField<"number", number, NumberFieldAdmin> & NumberLimitFieldConfig`. Mirrors the `CharacterLimitFieldConfig`/`WordLimitFieldConfig` family. |
| `packages/admin/src/components/forms/fields/text-field.tsx` | Added `getMin`/`getMax` (top-level-then-`admin` fallback, mirroring `getMaxLength`); passed `min`/`max` to the number `<Input>`. No counter (not meaningful for a range). |
| `packages/knowledge/scripts/generate.mjs` | Added `NumberLimitFieldConfig`/`NumberLimitFieldAdmin`/`NumberFieldAdmin` to `fieldNames`; set `number.mdx` contract to `["NumberField", "NumberFieldAdmin"]`. |
| `apps/docs/content/new-docs/basics/fields/number.mdx` | Rewrote the authored prose: replaced "there are no built-in `min`/`max`/`step`" with a "Guiding entry with a range" section documenting advisory `min`/`max` + hook escape hatch. Generated block auto-updated. |
| `packages/core/src/__tests__/define-field.test.ts` | Added a runtime + compile-time assertion for `defineNumberField({ min: 1, max: 5 })`. |
| `packages/knowledge/src/generated/references.ts` / `.json` | Regenerated (do not hand-edit). |

`defineNumberField` needed no change (generic identity helper derives its shape from `NumberField`).

**Consistency note:** like text's `maxLength`, the shared `NumberLimitFieldConfig`/`NumberLimitFieldAdmin` render on the fields **overview** page (auto-routed), while `NumberField`/`NumberFieldAdmin` render on the number page. `min`/`max` are explained directly in the number page's authored prose.

**Verification:**
- `pnpm --filter @dyrected/core build` → DTS success (types compile).
- `pnpm --filter @dyrected/admin build` → success (renderer compiles).
- `pnpm --filter @dyrected/knowledge generate:check` → clean (no staleness).
- `pnpm --filter @dyrected/core exec vitest run define-field.test.ts` → 4/4 pass.
- `pnpm --filter @dyrected/knowledge test` → 35/35 pass.

**Review questions:**
1. Confirm advisory (not hard-validated) `min`/`max` is the intended behavior, consistent with `maxLength`. If hard enforcement is wanted, it should be added uniformly across field options (new validation layer), not just for number.
2. `step` was intentionally **not** added (the original prose mentioned "min, max, or step"). Add it later if desired — trivial as another advisory input attribute.

---

## Item 3 — Five new field pages (`datetime`, `time`, `url`, `icon`, `multi-select`)

**Why:** these are real `@dyrected/core` field types (`defineDateTimeField`, `defineTimeField`, `defineUrlField`, `defineIconField`, `defineMultiSelectField`) that previously had no dedicated page and were bundled into the overview / date pages.

**Files changed:**
| File | Change |
| --- | --- |
| `apps/docs/content/new-docs/basics/fields/{datetime,time,url,icon,multi-select}.mdx` | Created — authored intro + `define*` example + generated marker pair. |
| `apps/docs/content/new-docs/basics/fields/meta.json` | Added the 5 slugs in nav next to their relatives. |
| `packages/knowledge/scripts/generate.mjs` | Split `date.mdx` to `["DateField"]`; added `datetime`/`time`/`url`/`icon`/`multi-select` contract entries. |
| `packages/knowledge/src/contracts.test.ts` | Added the 5 slugs to `fieldPageSlugs` (validates markers + authored prose). |
| `apps/docs/content/new-docs/basics/fields/date.mdx` | Intro now links out to Date and Time / Time; generated block auto-trimmed to `DateField`. |
| `apps/docs/content/new-docs/basics/fields/overview.mdx` | "Choosing a field type" list now includes the 5 pages; removed the "don't have their own page yet" paragraph; overview generated block auto-dropped `Url`/`Icon`/`MultiSelect` types (now on their own pages). |

**Slug convention:** kebab-case (`multi-select`, matching `radio-group`/`rich-text`).

**Source inventory (prose grounding):**
| Source | Fact used | Trust |
| --- | --- | --- |
| `apps/docs/content/docs/reference/fields.mdx` | `datetime` = instant (ISO, timezone care); `time` = local time-of-day; `url` returns a structured object; `icon` = Lucide component name string; `multiSelect` = array of values | High |
| `packages/admin/src/components/forms/fields/url-field.tsx:30` | `url` value shape `{ type: "custom"\|"internal", url, relationTo?, value?, label? }` | High |
| `packages/core/src/types/schema-core.ts` | The 5 exported types + helpers | High |

**Verification:** `generate` populated all 5 blocks; `contracts.test.ts` (13 tests) passes, validating each new page has exactly one marker pair and authored prose outside it.

**Review questions / flags:**
1. **`url` type vs behavior conflict:** the generated contract shows `UrlField = TypedField<"url", string>` (value typed `string`), but the field actually stores/returns the structured object (`url-field.tsx:30`, `reference/fields.mdx`). The `url.mdx` prose documents the structured object (correct behavior). Consider tightening the `UrlField` **type** so the generated contract reflects the real return shape. Flagged for `packages/core` owners.
2. **Page titles:** `datetime` → "Date and Time", `multiSelect` → "Multi-select". Confirm these nav labels.
3. `datetime`/`time` field aliases carry no JSDoc, so their generated blocks show only the signature (same as the old date page). Fine, but a one-line JSDoc on each would enrich the generated block if desired.

---

## Placeholder sweep
No `NEEDS-*` markers in any drafted/created MDX.

## Net new open questions for the batch summary
- **O-3:** advisory vs hard `min`/`max` (Item 2, Q1).
- **O-4:** `UrlField` type under-describes the structured return shape (Item 3, Q1) — candidate core type improvement.
