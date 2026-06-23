# Implementation Roadmap for All Spec Files

This document consolidates a high‑level implementation roadmap that aligns with every active specification (`specs/*.md`) currently present in the Dyrected repository. It maps each spec to the corresponding development milestones, ordered by **priority for the MVP**.

---

## Spec Files Overview (Priority Order)

| Priority | Spec File | Status | Key Implementation Areas |
| :--- | :--- | :--- | :--- |
| ✅ | [list-filters-spec.md](file:///Users/busola/Work/dyrected/specs/list-filters-spec.md) | **Fully implemented** | `FilterRule`, `rulesToWhere`, `whereToRules` in `lib/filter-rules.ts`; `FilterBuilder` UI component; URL `?where=` state in list page; backend `where-sanitizer.ts` + collection-level `filterable` guard in controller. |
| 1️⃣ | [custom-actions-spec.md](file:///Users/busola/Work/dyrected/specs/custom-actions-spec.md) | **Not started** | `rowActions` / `bulkActions` arrays on `AdminComponents`; `RowActionProps` / `BulkActionProps` interfaces; refactor hardcoded Edit/Delete/Bulk Delete out of `list-page.tsx`. |
| ⚠️ | [gaps-in-field-implementation.md](file:///Users/busola/Work/dyrected/specs/gaps-in-field-implementation.md) | **Mostly done — 2 items open** | All critical and high items implemented. Open: server-side validation error mapping to field paths; `cacheTTL` on dynamic options typed but not server-enforced. |
| ⚠️ | [database-testing-plan.md](file:///Users/busola/Work/dyrected/specs/database-testing-plan.md) | **Partially done** | `adapter-contract-tests/database-contract.ts` covers CRUD, `find()` filters, `sync()`, and settings. Gaps: transaction rollback tests, validation-error integration tests, cross-collection relation edge cases. |
| ✅ | [db-adapters-testing-plan.md](file:///Users/busola/Work/dyrected/specs/db-adapters-testing-plan.md) | **Fully implemented** | `adapter-contract-tests` runs the same `runDatabaseAdapterContract` suite against SQLite (always), Postgres, MySQL, and MongoDB (env-gated). Storage adapters (Local, S3, B2, Cloudinary) covered by `runStorageAdapterContract`. |
| 2️⃣ | [proposed-advanced-hooks-spec.md](file:///Users/busola/Work/dyrected/specs/proposed-advanced-hooks-spec.md) | **Not started** | Auth lifecycle hooks (`beforeLogin`, `afterLogin`, etc.), media upload hooks, server lifecycle hooks (`onReady`), client-side async validation hook, API response serialization hook. |
| 3️⃣ | [ai-first-architecture-spec.md](file:///Users/busola/Work/dyrected/specs/ai-first-architecture-spec.md) | **Not started** | MCP server package; schema/collection/media resource URIs; MCP tool specs; CLI schema & block auto-generator. (`.dyrected/ai-rules.md` template exists in `knowledge` package — that's the only piece present.) |
| 💤 | [media-library-features.md](file:///Users/busola/Work/dyrected/specs/future/media-library-features.md) _(Future)_ | Backlog | Vimeo iframe embedding, list view toggle, SVG upload settings/sanitization, replace/optimize images, and usage tracking. |
| 💤 | [plugin-form-builder-architecture.md](file:///Users/busola/Work/dyrected/specs/future/plugin-form-builder-architecture.md) _(Future)_ | Backlog | Custom plugin UI components and drag-and-drop schema layout editor. |

---

## Prioritized Milestones

### ✅ Milestone 1 — List Filtering (Complete)

Full filter builder shipped: `FilterRule` / `rulesToWhere` / `whereToRules` utilities, `FilterBuilder` UI, URL-serialised filter state (`?where=`), backend `where-sanitizer`, and `filterable` flag on collections and fields.

### Milestone 2 — Custom Actions (Next)
* **Goal**: Let users plug custom row and bulk actions into the list view.
* **Tasks**:
  * Define `RowActionProps`, `BulkActionProps`, and the `rowActions` / `bulkActions` keys on `AdminComponents`.
  * Refactor hardcoded Edit / Delete row actions in `list-page.tsx` (~lines 277–296) into resolved default entries.
  * Refactor inline bulk delete (~lines 627–656) into a default bulk action following the same pattern.
  * Update `DataTable.bulkActions` prop signature to accept the resolved component list.

### Milestone 3 — Field Gaps & DB Testing Completion (Polish)
* **Goal**: Close the two remaining field gaps and fill transaction/validation test coverage.
* **Tasks**:
  * Implement server-side validation error mapping to field paths ([gaps-in-field-implementation.md](file:///Users/busola/Work/dyrected/specs/gaps-in-field-implementation.md)).
  * Enforce `cacheTTL` server-side for dynamic options.
  * Add transaction rollback, validation-error, and cross-collection relation tests to `database-contract.ts` ([database-testing-plan.md](file:///Users/busola/Work/dyrected/specs/database-testing-plan.md)).

### Milestone 4 — Advanced Hooks & MCP (Future)
* **Goal**: Advanced extensibility and AI-agent integrations.
* **Tasks**:
  * Auth lifecycle hooks, media upload hooks, server `onReady` hook, client-side async validation hook, and response serialization hook ([proposed-advanced-hooks-spec.md](file:///Users/busola/Work/dyrected/specs/proposed-advanced-hooks-spec.md)).
  * MCP server package exposing collections, schemas, and media resources as resource URIs and tool specs ([ai-first-architecture-spec.md](file:///Users/busola/Work/dyrected/specs/ai-first-architecture-spec.md)).
  * CLI schema & block auto-generator.

---

## Verification Plan

- Run the full multi-adapter test suite (`npm run test:adapters`) after each milestone.
- Manually check list view layout, sorting, and filter builder UI inside the admin dashboard.
- Verify video playbacks (YouTube & Vimeo) render dynamically via core react rendering components.
- Run validation checks to ensure unsafe SVGs are blocked or sanitized.

---

## ✅ Completed Core Specs & Fixes

These specs are fully implemented and moved to archival date folders.

| Spec | Summary | Completed |
| :--- | :--- | :--- |
| [list-filters-spec.md](file:///Users/busola/Work/dyrected/specs/list-filters-spec.md) | Full filter builder: `FilterRule` utilities, `FilterBuilder` UI, URL `?where=` state, backend sanitizer, and `filterable` flag on collections and fields. | ✅ 2026-06-23 |
| [db-adapters-testing-plan.md](file:///Users/busola/Work/dyrected/specs/db-adapters-testing-plan.md) | `adapter-contract-tests` package runs identical DB and storage contract suites against SQLite, Postgres, MySQL, MongoDB, S3, B2, and Cloudinary. | ✅ 2026-06-23 |
| [bug-fixes-boolean-filter-and-sibling-id.md](file:///Users/busola/Work/dyrected/specs/2026-06-16/bug-fixes-boolean-filter-and-sibling-id.md) | Fixed Postgres boolean parameter query errors and resolved sibling data document ID missing contexts. | ✅ 2026-06-16 |
| [dx-feedback-and-docs-improvements.md](file:///Users/busola/Work/dyrected/specs/2026-06-16/dx-feedback-and-docs-improvements.md) | Standardized depth guides, hooks capability lifecycle documentation, `findOne` calls, and Vue custom component guides. | ✅ 2026-06-16 |
| `client-side-reactivity-spec.md` | `admin.hooks.onChange` and `admin.hooks.options` — client-side value derivation and cascading dropdowns in sandbox hidden-iframe. | ✅ 2026-05-29 |
| `dynamic-option-queries-spec.md` | Async server-side option resolvers for `select`, `multiSelect`, and `radio` fields. | ✅ 2026-05-29 |
| `lifecycle-hooks-testing-spec.md` | Backend CRUD hook sequence, chaining, abort-on-error, and isolation of `afterChange`/`afterDelete` side-effects. | ✅ 2026-05-29 |
