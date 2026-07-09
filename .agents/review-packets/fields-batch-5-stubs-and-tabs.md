# Fields Docs — Sub-batch 5 Review Packet (Stubs + Tabs)

Scope: the five empty stub pages (`code`, `collapsible`, `point`, `tabs`, `ui`) whose names match Payload field types Dyrected does not have.

Status: `ready-for-sme-review`

Decision (from product): remove all four of `code`/`collapsible`/`point`/`ui` from nav and delete them; keep `tabs`, but reframe it around a new `defineTab` helper that stamps `admin.tab` on a group of fields.

---

## Confirmed absence (why these aren't normal field pages)
`packages/core/src/types/schema-core.ts` `FieldType` (L6-28) has no `code`/`collapsible`/`point`/`tabs`/`ui`, and `packages/core/src/index.ts` has no matching helper. Writing standard field-reference pages for them would invent behavior, which the constraints forbid.

## `code`, `collapsible`, `point`, `ui` — removed
- Deleted the four stub `.mdx` files.
- Removed the four slugs from `meta.json`.
- Verified: no inbound links anywhere in `new-docs` (grep clean), so no broken links.
- Idiomatic Dyrected alternatives (for future reference / possible recipe pages): `code` → `textarea`/`json`; `collapsible` → `group`/`row` or `admin.tab`; `point` → two `number` fields or `json`; `ui` → `admin.component`.

## `tabs` — kept, reframed around a new `defineTab` helper

### New package code
`packages/core/src/index.ts` — added `defineTab`:
```ts
export function defineTab<const T extends readonly Field[]>(args: {
  label: string;
  fields: T;
}): T {
  return args.fields.map((field) => ({
    ...field,
    admin: { ...(field.admin ?? {}), tab: args.label },
  })) as unknown as T;
}
```
It returns the given fields with each one's `admin.tab` set to `label`, preserving literal inference (`const T`) so `InferDocShape` still works when the result is spread into `fields`. Purely presentational — storage/API shape is unchanged.

### Why this is real, not invented
`admin.tab` is an existing, documented property (`BaseFieldAdmin.tab`), and the admin **already renders tabs from it**: `packages/admin/src/components/forms/form-engine.tsx:352-391` groups fields by `admin.tab`, and fields without a tab fall into a leading tab named after the collection (L376-378). `defineTab` is an ergonomic wrapper over that existing mechanism — no new admin code required.

### Docs
Rewrote `apps/docs/content/new-docs/basics/fields/tabs.mdx` as an authored-only page (no generated marker — `tabs` is not a field type, so it is intentionally absent from `fieldPageContracts` and the test's `fieldPageSlugs`): explains tabs are presentational, introduces `defineTab` with a two-tab example, documents untabbed-fields behavior, and shows the underlying `admin.tab` escape hatch.

### Test
`packages/core/src/__tests__/define-field.test.ts` — added a `defineTab` case asserting it stamps `admin.tab` on each field and preserves existing `admin` options.

### Verification
- `pnpm --filter @dyrected/core build` → DTS success.
- `define-field.test.ts` → 5/5 pass (incl. `defineTab`).
- `generate:check` → clean; `knowledge test` → 35/35 (deleting the 4 files and dropping them from nav broke nothing, since none were generator targets).

### Review questions
1. Confirm the helper name `defineTab` and the `{ label, fields }` signature (vs `name` instead of `label`, or a `defineTabs` that takes multiple tabs at once).
2. Confirm the "untabbed fields go into a leading tab named after the collection" behavior is stable and worth documenting (it's current per `form-engine.tsx`).
3. `defineTab` is exported from `@dyrected/core` but has no generated reference block (it's not a field type). Confirm that's acceptable, or decide whether the helper should appear in a generated "helpers" reference somewhere.

## Placeholder sweep
No `NEEDS-*` markers.
