# Fields Docs — Sub-batch 3 Review Packet

Scope: `group`, `array`, `blocks`, `row` (structure & layout)

Status: `ready-for-sme-review`

Shared grounding: `packages/core/src/types/schema-core.ts` (`ObjectField`/`ArrayField`/`BlocksField`/`RowField` — all bare `TypedField<…, unknown>`; nesting comes from `FieldBase.fields`/`blocks`), `Block`/`BlockVariant` interfaces, `apps/docs/content/docs/reference/fields.mdx`, `apps/docs/content/docs/guides/building-a-page-builder.mdx`. Payload structure only; Payload-only options (`minRows`/`maxRows`, `initCollapsed`, `isSortable`, `interfaceName`, `dbName`, `labels`) were **not** imported — Dyrected's structural fields carry none of them.

---

## Group

- **Payload equivalent:** `fields/group`
- **Template:** intro + when-to-use → config example → stored shape + lifecycle + routing.
- **Source inventory:** `ObjectField` (schema-core.ts L361, `type: object`); `reference/fields.mdx` ("fixed nested shape, same lifecycle as parent"); `concepts/fields.mdx` (stored as `{ seo: {...} }`).
- **Reader outcome:** knows a group nests fields under one key, stores as an embedded object, shares the parent lifecycle, and when to escalate to Array / Collection+Relationship.
- **Changes:** added the stored-shape sentence (`{ seo: { title, description } }`), lifecycle note, and decision routing (Array for repeating, Collection+Relationship for own-lifecycle). Removed the original lone relationship pointer in favor of the fuller routing paragraph.
- **Review qs:** confirm "group" is the right page title while the helper/type is `defineObjectField`/`object` (parallels the checkbox/boolean naming — same pattern).

## Array

- **Payload equivalent:** `fields/array`
- **Template:** intro + when-to-use → config → stored shape + collection-instead guidance.
- **Source inventory:** `ArrayField` (schema-core.ts L362); `reference/fields.mdx` ("repeatable items sharing one shape; use a collection instead if entries need their own IDs/access/querying/reuse").
- **Reader outcome:** knows an array is an ordered same-shape list stored in the parent, and the precise signal to switch to a Collection+Relationship.
- **Changes:** added the stored-shape sentence (`[{ label, url }, ...]`) and the "use a collection instead when…" decision paragraph. Did **not** add `minRows`/`maxRows` (Payload-only; absent in Dyrected).
- **Review qs:** confirm Dyrected has no array row-count constraints (`minRows`/`maxRows`) today.

## Blocks

- **Payload equivalent:** `fields/blocks`
- **Template:** intro → block-definition example → blockType discriminator + stability → variants.
- **Source inventory:** `BlocksField` (L363), `Block`/`BlockVariant` interfaces (generated on this page); `reference/fields.mdx` (blockType, keep slugs stable, renderers handle unknown types); `building-a-page-builder.mdx` (variants: reserved `variant` key, passed as prop, first is default, switching preserves content).
- **Reader outcome:** knows each row carries a `blockType`, to keep slugs stable and handle unknown types, and how presentation `variants` work.
- **Changes:** added the blockType/render-map paragraph with slug-stability + unknown-type-fallback guidance, and a **Presentation variants** section with a grounded example. The `Block`/`BlockVariant` contracts already render in the generated block.
- **Review qs:** (1) confirm the reserved key is `variant` (singular) and the component receives a `variant` prop. (2) confirm "first variant is the default" is current behavior.

## Row

- **Payload equivalent:** `fields/row`
- **Template:** intro (layout-only) → config → no-stored-wrapper + width control.
- **Source inventory:** `RowField` (L365, layout-only); `BaseFieldAdmin.width` ("CSS width hint used when the field appears inside a `row`"); `reference/fields.mdx` (children with `admin.width` stay at document level).
- **Reader outcome:** knows a row is presentation-only, stores nothing itself, and that `admin.width` on children controls the columns.
- **Changes:** added the "stores nothing of its own" clarification and the `admin.width` sizing note.
- **Review qs:** confirm `admin.width` accepts CSS width strings like `'50%'` (per the `BaseFieldAdmin.width` JSDoc).

---

## Placeholder sweep
No `NEEDS-*` markers remain.

## Canonical links used (all verified REAL)
`fields/blocks`, `fields/array`, `fields/relationship`, `basics/configuration/collections`. No stub links.

## Notes for batch summary
- The generated reference blocks for `array`, `group`, `row`, `join` are thin (`TypedField<…, unknown>`) because these types carry no type-specific members — the real options (`fields`, `blocks`, `collection`, `on`, `limit`) live in the shared `FieldBase` on the overview page. The authored prose now carries the teaching weight. **O-6:** consider whether the generator should surface the relevant `FieldBase` members on each structural page, or whether the current prose-carries-it approach is acceptable (a generator/JSDoc change, not a per-page fix).
