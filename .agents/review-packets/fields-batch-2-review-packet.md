# Fields Docs — Sub-batch 2 Review Packet

Scope: `select`, `radio-group`, `date`, `json`, `rich-text`

Status: `ready-for-sme-review`

Shared grounding: `packages/core/src/types/schema-core.ts` (field types + admin sub-types), `apps/docs/content/docs/reference/fields.mdx`, `apps/docs/content/docs/concepts/dynamic-options.mdx`, `apps/docs/content/docs/guides/building-a-page-builder.mdx`. Payload pages used for structure only; Payload-only options (`jsonSchema`, `date.displayFormat`/`pickerAppearance`/`minDate`, `timezone`, `localized`) were deliberately **not** imported — Dyrected has none of them.

---

## Select

- **Payload equivalent:** `fields/select`
- **Template:** intro + when-to-use → config example → options formats → dynamic options → admin presentation.
- **Source inventory:** `SelectField`/`SelectFieldAdmin` (schema-core.ts L352, L246-255 — `layout: radio|select`, `direction`, `hooks.options`); `FieldBase.options` accepts static array / `DynamicOptionsResolver` / `DynamicOptionsConfig`; `concepts/dynamic-options.mdx` (static / server resolver / client hook, dependent dropdowns).
- **Reader outcome:** knows select stores one value, how to supply static and dynamic options, how to render inline as radios, and when to choose radio/multi-select instead.
- **Changes:** added Options section (string + `{label,value}` forms), a dynamic-options paragraph (server resolver / admin hook for dependent dropdowns), and a Presentation section (`admin.layout: 'radio'`, `admin.direction`). Added Multi-select routing.
- **Review qs:** (1) OK to describe dynamic options without linking, since no `new-docs` dynamic-options page exists yet? (2) Confirm `admin.layout: 'radio'` is the current way to render a select inline.

## Radio Group

- **Payload equivalent:** `fields/radio`
- **Template:** intro + when-to-use → config → options → admin direction.
- **Source inventory:** `RadioField`/`RadioFieldAdmin` (schema-core.ts L353, L257-264 — `direction`, `hooks.options`).
- **Reader outcome:** knows radio is a small-set select shown inline, shares select's option formats, and can control button direction.
- **Changes:** sharpened when-to-use (vs select for long lists, vs checkbox for on/off); added option-format note and `admin.direction` example. Did **not** assert a default direction (JSDoc doesn't specify one).
- **Review qs:** confirm there's no need to warn about option-value characters (Payload warns re: GraphQL enum names; Dyrected has no GraphQL enum constraint that I found — confirm).

## Date

- **Payload equivalent:** `fields/date`
- **Template:** intro → example → (Payload: display/picker/timezone — omitted, unsupported).
- **Source inventory:** `DateField` (schema-core.ts L349, bare `string`); `reference/fields.mdx` (day-only; ISO strings; `daterange` is not a type); `schema.mdx` (date is a promotable column type).
- **Reader outcome:** knows date is day-only, stored as ISO string, links to Date and Time / Time, and is worth promoting when queried.
- **Changes:** (already corrected during the new-pages work) intro now says calendar-day + links to datetime/time; added a `promoted` note for sorted/filtered dates. Generated block auto-trimmed to `DateField`.
- **Review qs:** confirm date is strictly day-only in the current admin picker (vs datetime).

## JSON

- **Payload equivalent:** `fields/json`
- **Template:** intro → example → (Payload: JSON Schema validation — omitted, unsupported).
- **Source inventory:** `JsonField` (schema-core.ts L360); `reference/fields.mdx` ("for genuinely open-ended values", not validated).
- **Reader outcome:** understands JSON is an unvalidated escape hatch and when to prefer Group/Array instead.
- **Changes:** reframed as an escape hatch; added the "you own the shape" caveat and explicit routing to Group (fixed nesting) / Array (repeating). No `jsonSchema` claim (Dyrected has none).
- **Review qs:** confirm Dyrected has no JSON-schema validation option today (Payload does; I asserted absence).

## Rich Text

- **Payload equivalent:** `fields/rich-text`
- **Template:** intro (stored format) → config example → editor feature configuration → rendering.
- **Source inventory:** `RichTextField` + `RichTextFieldConfig` (schema-core.ts L359, L322-340 — `features`, `headingLevels` default `[1,2,3]`, `uploadCollection`); `RichTextFeature` list (L305-317); `reference/fields.mdx` ("Tiptap/ProseMirror JSON, not HTML"); `building-a-page-builder.mdx` (per-framework `RichText` render component).
- **Reader outcome:** knows richText stores Tiptap/ProseMirror JSON, how to render it, and how to restrict the toolbar with `features`/`headingLevels`/`uploadCollection`.
- **Changes:** **corrected two inaccuracies** — the old draft said "embedded blocks" (not a feature; the real feature list is formatting + `table` + `image`) and "Dyrected converters" (no such page; rendering is via the framework `RichText` component). Added the feature/heading-level configuration section grounded in `RichTextFieldConfig`.
- **Review qs:** (1) Confirm "Tiptap/ProseMirror" is the public-facing way to describe the format (it appears in the source-of-truth reference doc). (2) Confirm the render component is publicly called `RichText` across frameworks. (3) There is **no** `new-docs` rich-text rendering/converters page yet — this page describes rendering in prose rather than linking out. Flag if a dedicated rendering page is planned.

---

## Placeholder sweep
No `NEEDS-*` markers remain.

## Canonical links used (all verified REAL)
`fields/select`, `fields/multi-select`, `fields/radio-group`, `fields/checkbox`, `fields/group`, `fields/array`, `fields/datetime`, `fields/time`, `basics/database/indexes`. No links to stub pages (notably avoided the empty `features/rich-text/*` tree).

## Open questions carried to batch summary
- **O-5:** No `new-docs` page documents dynamic options or rich-text rendering (both are empty stubs / absent). Select and rich-text describe these inline. Decide whether dedicated pages are planned so these can link out later.
