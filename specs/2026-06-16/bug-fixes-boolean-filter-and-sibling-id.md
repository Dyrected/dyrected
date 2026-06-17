# Bug Fixes: Boolean Filter & id in siblingData

Two confirmed bugs surfaced from real-world usage (TheSweetUnion). Both are small, targeted fixes.

---

## Fix 1 — Boolean SQL Filtering

### Problem

`where: { attending: { equals: true } }` throws `operator does not exist: text = boolean` in Postgres.

In all SQL adapters, relationship and field data is stored in a JSON column and extracted via:
- Postgres: `data->>'field'` — always returns `text`
- SQLite: `json_extract(data, '$.field')` — returns native type
- MySQL: `JSON_UNQUOTE(JSON_EXTRACT(data, '$.field'))` — always returns `text`

In Postgres and MySQL, the extraction always produces a `text` value. Comparing `text = true` (boolean) is a type error. The `parseSqlWhere` utility in `packages/core/src/utils/parse-where.ts` currently pushes the raw boolean as a query parameter.

### Fix

In `buildSingleOp` inside `parseSqlWhere`, normalise boolean parameter values to their string representation before pushing:

```ts
// Before (in equals / not_equals cases):
params.push(operand);

// After:
params.push(typeof operand === 'boolean' ? String(operand) : operand);
```

This converts `true` → `'true'` and `false` → `'false'`, matching what Postgres and MySQL extract from JSON columns as text. SQLite `json_extract` returns native types but also accepts string comparison, so this is safe across all three SQL adapters.

**File:** `packages/core/src/utils/parse-where.ts`
**Function:** `buildSingleOp`
**Operators affected:** `equals`, `not_equals` (the only operators where a boolean value is semantically valid)

### MongoDB

No change needed. MongoDB stores and compares BSON booleans natively — `parseMongoWhere` is unaffected.

---

## Fix 2 — id Missing from siblingData

### Problem

Custom field components receive `context.siblingData` but the document `id` is never included. When a component needs to know whether it's on a create or edit form, or needs to construct a URL, it must parse `window.location.hash` — a fragile workaround.

### Root Cause

In `packages/admin/src/components/forms/form-field-renderer.tsx`, `siblingData` is built from `useWatch({ control })` which only watches registered form fields. `id` is never registered as a form field (it's read-only metadata), so `useWatch` never includes it.

```ts
// form-field-renderer.tsx ~line 214
const formValues = useWatch({ control })
// formValues does NOT include id because id is not a registered field
const siblingData = useWatch({ control, name: (basePath || undefined) as string }) || {}
const conditionData = basePath ? { ...formValues, ...siblingData } : formValues

// id is absent from conditionData → absent from context.siblingData
```

### Fix

The edit page passes `id` down via `useParams()`. Thread it through to the form and inject it explicitly into `conditionData`:

1. **Edit page** — pass `id` as a prop to the form component
2. **Form component** — accept `documentId?: string` prop  
3. **form-field-renderer.tsx** — merge it into `conditionData`:

```ts
const conditionData = basePath
  ? { ...formValues, ...siblingData, ...(documentId ? { id: documentId } : {}) }
  : { ...formValues, ...(documentId ? { id: documentId } : {}) }
```

On the create form, `documentId` is `undefined`, so `id` remains absent from `siblingData` — which is correct: the document doesn't have an id yet. Components can use the presence/absence of `id` in `siblingData` as the canonical signal for create vs edit.

**Files:**
- `packages/admin/src/pages/collections/edit-page.tsx` — pass `id` down to the form
- `packages/admin/src/components/forms/form-field-renderer.tsx` ~line 214 — merge `id` into `conditionData`

---

## Fix 3 — findById Discoverability (Docs Only)

### Problem

`collection.findOne(id)` already exists on the SDK query builder. Developers were using the verbose pattern `find({ where: { id: { equals: id } }, limit: 1 })` because `findOne` wasn't visible enough.

### No Code Change Needed

This is a documentation gap only.

### Doc Fix

The SDK `find()` reference should open with a callout box:

> **Looking for a single document by ID?**  
> Use `client.collection('posts').findOne(id)` — it returns the document directly, not a paginated result. The `find({ where: { id: ... } })` pattern is unnecessary.

`find` and `findOne` should be documented on the same page, side by side, so developers see both options before they reach for one.
