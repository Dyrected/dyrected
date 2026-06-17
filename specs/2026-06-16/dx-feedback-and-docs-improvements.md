# DX Feedback & Docs Improvements

Feedback collected from a real production project (TheSweetUnion) built on Dyrected. Each point is assessed against intended framework design and mapped to a doc improvement or code fix.

---

## Philosophy Alignment

The developer summarised Dyrected as:

> "Define your schema, get CRUD for free. Own your complex logic in API routes."

**This matches intention exactly.** The framework handles storage, admin UI, access control, and relationship management. The developer owns validation, business rules, emails, and concurrency. The split is correct. It just needs to be stated this explicitly in the docs — upfront, not buried.

Proposed first paragraph for the Dyrected overview doc:

> Dyrected handles the boring parts: storage, admin UI, access control, and relationship management. You own everything interesting: validation, business rules, emails, and concurrency. Collections define your data shape. API routes define your logic. The boundary is intentional and worth respecting from day one.

---

## Point-by-Point Assessment

### 1. Collection-as-config is fast — ✓ Matches intention

No doc change needed. This is working as designed and the developer felt it clearly.

---

### 2. Access control strings are elegant — ✓ Matches intention

No doc change needed. This is a validated DX win.

---

### 3. Admin UI is essentially free — ✓ Matches intention

**Minor doc improvement:** `useAsTitle`, `defaultColumns`, and `group` should be documented together in a single "Configuring the Admin UI" section rather than scattered across individual field and collection docs. Developers want to see the full picture of what the config buys them before they start writing collections.

---

### 4. "No findById" — ✗ Misunderstanding, docs gap

`collection.findOne(id)` exists on the SDK query builder. The developer didn't know it was there.

**Doc fix:** The SDK `find()` reference should open with a callout:

> Looking for a single document by ID? Use `collection.findOne(id)` — not `find({ where: { id: { equals: id } } })`.

The `find` and `findOne` methods should appear together in the docs, not on separate pages.

---

### 5. "Hooks are synchronous and data-transform only" — ✗ Misunderstanding, significant docs gap

This is factually wrong — and it's the most consequential misunderstanding in the feedback.

**The reality:**

| Hook | Async | DB reads | DB writes | Side effects (email, fetch) |
|---|---|---|---|---|
| `beforeChange` | ✓ | ✓ (read-only) | ✗ | ✓ (external only) |
| `afterChange` | ✓ | ✓ | ✓ | ✓ (email, webhooks, capacity updates) |
| `afterDelete` | ✓ | ✓ | ✓ | ✓ |
| `beforeRead` | ✓ | ✓ (read-only) | ✗ | ✗ |
| `afterRead` | ✓ | ✓ (read-only) | ✗ | ✗ |

`afterChange` receives the full writable `DatabaseAdapter`. It is the correct place for emails, webhook pings, capacity checks, and any write that should happen after a document is saved. This should be the second thing any Dyrected developer learns, right after collection basics.

**Doc fix:** Add a dedicated "Hook Lifecycle" page with the table above and a clear example of `afterChange` sending an email. The current type comments cover this but are not visible to anyone reading the docs.

Also explicitly state: *"If you find yourself building an API route just to trigger a side effect after a save, check if `afterChange` covers it first."*

---

### 6. Boolean fields stored as text — ✓ Real bug, fix in progress

`where: { attending: { equals: true } }` throws a type error in Postgres because JSON extraction via `->>` returns text, but `parseSqlWhere` pushes a raw boolean as the query parameter.

**Fix:** Normalise boolean values to their string representation in `parseSqlWhere` before pushing to params. This is a code fix, not a doc fix — tracked separately.

**Interim doc note until fixed:** Add a warning in the `where` clause reference:

> Boolean fields: use `{ equals: 'true' }` (string) rather than `{ equals: true }` (boolean) when filtering in SQL databases. This is a known limitation that will be resolved in a future release.

---

### 7. depth is powerful but opaque — ✓ Real docs gap

The developer is right. There is no way to know what `depth: 1` will populate without testing it against a real record. The field type (single relationship vs array of relationships) determines the response shape, and that's only visible in the config.

**Doc fix:** Add a "Understanding depth" guide that covers:

- `depth: 0` — IDs only for relationships
- `depth: 1` — one level of relationships populated (the most common case)
- `depth: 2` — nested relationships populated (e.g. event → photo → Cloudinary URL)
- How to read the response shape from the collection config without testing it
- A worked example: before/after JSON for the same query at depth 0, 1, and 2

**Also:** The docs should state *use `depth: 1` by default for any collection with relationship fields*. Developers were writing extra round-trips to resolve names and labels that `depth: 1` would have provided automatically.

---

### 8. Custom admin components are React-inside-Vue — ✓ Real sharp edge, docs gap

The developer hit three specific issues building a custom Vue component inside DyrectedAdmin:

1. `computed()` won't react to React Router navigation — Vue doesn't know the URL changed
2. `history.pushState` is replaced by React Router — must be patched back to detect hash changes
3. `id` of the current record is never passed to the component — must be parsed from `window.location.hash`

Issues 2 and 3 are code fixes (tracked separately). Issue 1 is inherent to the React-in-Vue architecture.

**Doc fix:** Add a dedicated "Custom Admin Components in Vue" guide covering:
- How the Vue-in-React bridge works (mounted inside React tree via bridge)
- How to read the current document ID (from the URL hash until the prop fix ships)
- How to react to navigation (use `window.addEventListener('hashchange', ...)` not Vue watchers or computed properties on `route`)
- What context is available: `doc`, `collection`, `user`, `field`, `value`

---

### 9. SDK surface area is small — ✓ Intentional design, needs clearer expectation-setting

No `count`, no `aggregate`. The SDK covers CRUD. Complex queries belong in API routes.

**Doc fix:** The SDK reference should open with an explicit scope statement:

> The SDK covers document CRUD and relationship traversal via `depth`. It does not expose count, aggregate, or complex join queries. For those, write an API route and query the database directly using the adapter.

This sets the right expectation before developers reach for things the SDK doesn't have.

---

### 10. "Everything-is-a-field-component forces creative hacks" — ✗ Intentional design

The developer considered the check-in scanner living in a create form to be a hack. **This is intentional Dyrected design.** A custom field component is not limited to editing a field value — it can do anything on render or submit, call APIs, manage its own state, and skip the normal edit flow entirely. The create form is a valid host for any rich UI action.

**Doc fix:** The custom field components guide should include an example of a component that doesn't edit a field value — a scanner, a calculator, a preview pane — to establish this pattern as first-class, not a workaround.

---

### 11. Rate limiting, email reliability — ✓ Outside Dyrected's scope, needs acknowledgement

Rate limiting and email error handling are the developer's responsibility. Dyrected provides the `email.send` hook, not a delivery guarantee.

**Doc fix:** Add a short "Production Checklist" page covering:
- Rate limit your API routes (Dyrected doesn't)
- Wrap email sends in try/catch and log failures
- Boolean filter workaround until the fix ships
- Set `limit` explicitly on all `find()` calls — the default is not unbounded but may not be what you expect

---

## Summary: What Needs Docs vs Code

| Issue | Type | Priority |
|---|---|---|
| Hook lifecycle table (beforeChange vs afterChange) | Docs | High |
| `findOne` discoverability | Docs | High |
| `depth` guide with before/after JSON | Docs | High |
| Custom components in Vue guide | Docs | High |
| Boolean filter bug | Code fix | High |
| `id` in siblingData | Code fix | Medium |
| Philosophy statement in overview | Docs | Medium |
| SDK scope statement | Docs | Medium |
| Admin UI config overview | Docs | Low |
| Production checklist | Docs | Low |
