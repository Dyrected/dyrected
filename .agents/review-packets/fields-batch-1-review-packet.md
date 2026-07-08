# Fields Docs — Sub-batch 1 Review Packet

Scope: `apps/docs/content/new-docs/basics/fields/` → `overview`, `text`, `textarea`, `email`, `number`, `checkbox`

Status: `ready-for-sme-review`

Grounding sources shared by every page in this batch:
- `packages/core/src/types/schema-core.ts` — the single source of truth for `FieldType`, `FieldBase`, and every field variant (verified). No `index`, `min`, `max`, `step`, `minLength`, `minRows`/`maxRows` field options exist.
- `packages/core/src/index.ts` — the `define*Field` helpers.
- `apps/docs/content/docs/concepts/fields.mdx` and `apps/docs/content/docs/reference/fields.mdx` — prose source of truth (mental models, `required`→400 / `unique`→409, `promoted`, advisory `maxLength`/`maxWords`, auth-field injection).
- `apps/docs/content/docs/concepts/schema.mdx` — JSON-blob storage + promoted indexed columns.
- Payload docs (structure only): `fields/overview`, `fields/text`.

---

## Overview

### 1. Payload equivalent
`https://payloadcms.com/docs/fields/overview`

### 2. Extracted template (structure only)
- Establish what a field is (schema + API shape + admin UI in one).
- Show the shared field config shape.
- Enumerate shared field options as a reference-style list.
- Categorize and link out to individual field-type pages.
- (Payload then dives into validation/hooks/custom components — Dyrected defers those to dedicated pages.)

### 3. Source inventory
| Source | Why it matters | Trust |
| --- | --- | --- |
| `packages/core/src/types/schema-core.ts` (FieldBase L95-135, FieldType L6-28) | Exact shared option set; confirms no `index` option | High |
| `apps/docs/content/docs/concepts/fields.mdx` | `required`→400, `unique`→409, `promoted` intent, base-property list | High |
| `apps/docs/content/docs/concepts/schema.mdx` | Promoted fields become indexed SQL columns | High |

### 4. Reader outcome
Reader understands a field defines storage, API shape, and admin UI at once; knows the shared options every type accepts; and can pick the right type page. Conceptual + reference-led hub page.

### 5. Outline
- What a field is → shared shape → shared options → choosing a type → note on unlisted types (`datetime`, `time`, `multiSelect`, `url`, `icon`) → generated reference.

### 6. Changes made
- **Fixed a factual error:** the shared-options list claimed "`unique` and `index` — storage constraints on relational adapters." There is **no `index` field option** in `FieldBase`. Rewrote the list to the real options: `name`, `label`, `required` (→400), `unique` (→409), `defaultValue` (server-evaluated), `promoted`, `access`, `admin`, with links to the real `database/indexes`, `database/migrations`, and `access-control/fields` pages.
- Added a short paragraph acknowledging real types that lack their own page (`datetime`, `time`, `multiSelect`, `url`, `icon`) so readers aren't misled that the listed set is exhaustive.
- Left the `{/* GENERATED:REFERENCE-FIELDS */}` block untouched.

### 7. Review packet
- Confirm we want to name HTTP codes (`400`/`409`) on this beginner page, or keep it behavioral-only.
- Confirm the unlisted-types paragraph is the desired way to handle `url`/`icon`/`multiSelect`/`datetime`/`time` having no dedicated page (see open question O-1).

### 8. Status
`ready-for-sme-review`

---

## Text

### 1. Payload equivalent
`https://payloadcms.com/docs/fields/text`

### 2. Extracted template
Intro/definition → basic config → Config Options → Admin Options → Example. Adapted: Dyrected folds options into prose because the type adds only `maxLength`/`maxWords` beyond the shared base.

### 3. Source inventory
| Source | Why it matters | Trust |
| --- | --- | --- |
| `schema-core.ts` (TextField L340; CharacterLimit/WordLimit configs) | `maxLength` + `maxWords` are the only type-specific options; **no `minLength`** | High |
| `apps/docs/content/docs/reference/fields.mdx` | `maxLength`/`maxWords` are first-class, show live counters, hard rejection needs a hook | High |

### 4. Reader outcome
Reader knows when to use text vs textarea/rich-text/select, that length limits are advisory with a hook escape hatch, and that `promoted` speeds up filtering/sorting.

### 5. Outline
Definition + when-to-use → example → length limits (advisory + hook) → filtering/sorting (`promoted`) → generated reference.

### 6. Changes made
Added when-to-use routing to textarea/rich-text/select; added the advisory `maxLength`/`maxWords` section with the "enforce with a hook" escape hatch; added the `promoted` filtering/sorting note. Generated block untouched.

### 7. Review packet
- Confirm `maxLength`/`maxWords` are genuinely advisory (no server rejection) in the current build — stated as such per `reference/fields.mdx`.

### 8. Status
`ready-for-sme-review`

---

## Textarea

### 1. Payload equivalent
`https://payloadcms.com/docs/fields/textarea`

### 2. Extracted template
Same single-field template as Text.

### 3. Source inventory
| Source | Why it matters | Trust |
| --- | --- | --- |
| `schema-core.ts` (TextareaField L341) | Same `maxLength`/`maxWords`, no other options | High |
| `apps/docs/content/docs/reference/fields.mdx` | Longer plain text; same limit semantics as text | High |

### 4. Reader outcome
Reader knows textarea is multi-line plain text, when to escalate to rich text or drop to text, and that the same advisory limits apply.

### 5. Outline
Definition + when-to-use → example → advisory limits + hook.

### 6. Changes made
Sharpened use cases (summaries, meta descriptions, notes), added bidirectional routing (rich-text up / text down), added the advisory `maxLength`/`maxWords` + hook note. Generated block untouched.

### 7. Review packet
- Same advisory-limit confirmation as Text.

### 8. Status
`ready-for-sme-review`

---

## Email

### 1. Payload equivalent
`https://payloadcms.com/docs/fields/email`

### 2. Extracted template
Intro (built-in validation) → config → options. Adapted to prose.

### 3. Source inventory
| Source | Why it matters | Trust |
| --- | --- | --- |
| `schema-core.ts` (EmailField L344) | `maxLength` only; value type string | High |
| `apps/docs/content/docs/reference/fields.mdx` | "for editor-supplied emails; do not redefine `email`/`password` on auth collections (they're injected)" | High |
| `overview.mdx` `AuthDocFields` type | Confirms `email`/`password`/`roles` are auth-injected fields | High |

### 4. Reader outcome
Reader knows the email field validates format automatically, and is warned not to redefine `email`/`password` on auth collections.

### 5. Outline
Definition + when-to-use → example → built-in validation + `maxLength` → `<Note>` auth caveat.

### 6. Changes made
Rewrote intro to emphasize built-in validation and editor-supplied use; added the `<Note>` warning against redefining `email`/`password` on auth collections.

### 7. Review packet
- **HIGH-RISK / behavior claim:** "redefining `email`/`password` collides with the built-in auth fields." Verified in `reference/fields.mdx` prose but **not** traced to the collision-handling code path. Confirm the exact behavior (hard error? silently ignored? overrides injected field?) so the wording is precise.

### 8. Status
`ready-for-sme-review`

---

## Number

### 1. Payload equivalent
`https://payloadcms.com/docs/fields/number`

### 2. Extracted template
Intro → config → options (Payload lists `min`/`max`/`hasMany`). Adapted: Dyrected explicitly states those options do **not** exist and routes to a hook.

### 3. Source inventory
| Source | Why it matters | Trust |
| --- | --- | --- |
| `schema-core.ts` (NumberField L352 = bare `TypedField<"number", number>`) | Confirms **no** `min`/`max`/`step` | High |
| `apps/docs/content/docs/reference/fields.mdx` | Use a collection hook for rounding/totals/ranges | High |

### 4. Reader outcome
Reader knows the number field has no built-in range/step options and that validation/rounding belongs in a hook; knows `promoted` speeds filtering/sorting.

### 5. Outline
Definition + when-to-use → example → "no min/max/step; use a hook" escape hatch → `promoted`.

### 6. Changes made
Added the explicit "no `min`/`max`/`step`" statement with the hook escape hatch, plus the `promoted` note. This is a deliberate divergence from Payload, which documents `min`/`max`.

### 7. Review packet
- Confirm the product intent is that number stays option-light (validation via hooks), not that range options are simply undocumented.

### 8. Status
`ready-for-sme-review`

---

## Checkbox

### 1. Payload equivalent
`https://payloadcms.com/docs/fields/checkbox`

### 2. Extracted template
Intro → config → admin layout. Adapted to prose.

### 3. Source inventory
| Source | Why it matters | Trust |
| --- | --- | --- |
| `schema-core.ts` (BooleanField L353; BooleanFieldAdmin L239-242) | Helper is `defineBooleanField`, type is `boolean`; `admin.layout: "checkbox" \| "switch"` | High |
| `apps/docs/content/docs/reference/fields.mdx` | `admin.layout` scoped to boolean; both store the same boolean | High |

### 4. Reader outcome
Reader understands the page's title ("Checkbox") vs the helper/type (`defineBooleanField` / `boolean`), sets a sensible `defaultValue`, and can switch the control to a toggle.

### 5. Outline
Definition + name reconciliation → example → `defaultValue` guidance → `admin.layout` switch variant.

### 6. Changes made
Clarified the checkbox/boolean naming mismatch; added `defaultValue` guidance; added the `admin.layout: 'switch'` example.

### 7. Review packet
- Confirm the page title should stay "Checkbox" while the helper is `defineBooleanField` (naming is intentional per `meta.json`), or whether the title should become "Checkbox / Boolean".

### 8. Status
`ready-for-sme-review`

---

## Placeholder sweep
No `NEEDS-HUMAN-VERIFY`, `NEEDS-SCREENSHOT`, `NEEDS-DIAGRAM`, or `NEEDS-CODE` markers remain in the drafted MDX. Open items are tracked here and in the open questions below, not as in-file placeholders.

## High-risk areas (batch 1)
- **Email auth caveat** (behavior claim, needs code trace) — see Email packet.
- **Number divergence from Payload** (deliberately omits `min`/`max`) — confirm intent.
- **Overview `400`/`409` codes** — confirm these are current and belong on a beginner page.

## Canonical links used (all verified REAL `/new-docs` targets)
`fields/overview`, `fields/text`, `fields/textarea`, `fields/rich-text`, `fields/select`, `fields/date`, `fields/json`, `basics/hooks/overview`, `basics/database/indexes`, `basics/database/migrations`, `basics/access-control/fields`. No links to stub pages.

## Open questions carried to batch summary
- **O-1:** `datetime`, `time`, `multiSelect`, `url`, `icon` are real field types with **no dedicated page**. Batch 1 handles this with a note on the overview. Decide whether these deserve their own pages (scope expansion) or stay folded into related pages.
- **O-2:** Depth default inconsistency (`concepts/depth.mdx` says default `1`; `concepts/relationships.mdx` implies `0`) — relevant to the relationship page in sub-batch 4. Needs a code check before asserting a default.
