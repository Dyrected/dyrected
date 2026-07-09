# Fields Docs — Sub-batch 4 Review Packet

Scope: `relationship`, `upload`, `join` (relationships & files)

Status: `ready-for-sme-review`

Shared grounding: `packages/core/src/types/schema-core.ts`, `apps/docs/content/docs/concepts/relationships.mdx`, `concepts/depth.mdx`, `adapters/storage.mdx`, `reference/fields.mdx`. Payload structure only; Payload-only options (`filterOptions`, `maxDepth`, polymorphic `relationTo`, `appearance`) were **not** imported — Dyrected's `relationTo` is a single collection slug and there is no polymorphic form.

---

## Relationship

- **Payload equivalent:** `fields/relationship`
- **Template:** intro + when-to-use → single vs hasMany → returned data shape (depth) → reverse via join.
- **Source inventory:** `RelationshipField` (schema-core.ts L357, value `string | string[]`; `relationTo` single-only); `concepts/relationships.mdx` (stores ID; `hasMany` = array; depth hydrates); `concepts/depth.mdx` (recursive traversal).
- **Reader outcome:** knows a relationship stores an ID (or array), how `hasMany` changes the shape, how read depth controls hydration, and how to get the reverse via Join.
- **Changes:** **fixed a broken link** — the draft linked `[depth](/new-docs/managing-data/sdk-api/depth)`, which is an **empty stub**. Replaced with an inline explanation of depth and a link to the real `sdk-api/overview`. Added a `hasMany` example and a "What the API returns" section.
- **Review qs / flags:**
  - **O-2 (depth default):** `concepts/depth.mdx` says default depth `1`; `concepts/relationships.mdx` implies `0`. The page **deliberately avoids stating a numeric default** ("at the lowest depth you receive just the IDs…"). Confirm the real default before any page asserts one.
  - Confirm `relationTo` is single-collection only (no polymorphic array) in the current release — the page implies single throughout.

## Upload

- **Payload equivalent:** `fields/upload`
- **Template:** intro (pick a file) → config → upload-enabled collection + resolved `url`/metadata.
- **Source inventory:** `ImageField` (schema-core.ts L358, `defineImageField`, value `string | string[]`); `CollectionConfig.upload` + `UploadConfig` (`schema-config.ts`); `UploadDocFields` (`url`, `filename`, `mimeType`, `width`, `height`, …); `adapters/storage.mdx` ("always consume `doc.url`").
- **Reader outcome:** knows the field references an `upload: true` collection, supports `hasMany`, and returns a resolved `url` plus metadata to consume directly.
- **Changes:** named the helper (`defineImageField`), added `hasMany`, the `upload: true` requirement, and the resolved `url`/`filename`/`mimeType`/`width`/`height` detail. Kept the real `storage-adapters` link.
- **Review qs:** confirm "upload" is the right page title while the helper/type is `defineImageField`/`image` (there is no `defineUploadField`; upload is a collection-level concept). Consider whether this page should note the collection-level `upload: true` setup more prominently or defer to a collections/upload page (the `features/upload/overview` page is currently a stub).

## Join

- **Payload equivalent:** Payload models reverse relationships via the `join` field (`fields/join`).
- **Template:** intro (virtual reverse) → config → `collection`/`on`/`limit` + read-only + pairing with relationship.
- **Source inventory:** `JoinField` (schema-core.ts L364; uses `collection`/`on`/`limit` from `FieldBase`); `concepts/relationships.mdx` (virtual reverse, read-only list).
- **Reader outcome:** knows a join stores nothing, gathers documents whose relationship points back, is capped by `limit`, and is the reverse partner to a relationship.
- **Changes:** explained `collection`/`on`/`limit` against the worked comment example; added the read-only + "partner to Relationship" framing. Did **not** assert the default `limit` value (sources mention 10 but I left it unstated).
- **Review qs:** confirm the default `limit` (sources say `10`, `0` = all) if we want to document it.

---

## Placeholder sweep
No `NEEDS-*` markers remain.

## Canonical links used (all verified REAL)
`fields/join`, `fields/relationship`, `managing-data/sdk-api/overview`, `features/upload/storage-adapters`. **The `sdk-api/depth` stub link is now removed from the fields tree.**

## Notes for batch summary
- O-2 (depth default inconsistency) remains open and is the one factual item a reviewer must settle before any page states a numeric depth default.
