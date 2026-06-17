# Implementation Roadmap for All Spec Files

This document consolidates a high‑level implementation roadmap that aligns with every active specification (`specs/*.md`) currently present in the Dyrected repository. It maps each spec to the corresponding development milestones, ordered by **priority for the MVP**.

---

## Spec Files Overview (Priority Order)

| Priority | Spec File | Primary Focus | Key Implementation Areas |
| :--- | :--- | :--- | :--- |
| 1️⃣ | [list-filters-spec.md](file:///Users/busola/Work/dyrected/specs/list-filters-spec.md) | Advanced collection list filtering | Backend JSON `where` validation, field filterable permissions, clean schema stripping, and frontend filter builder UI. |
| 2️⃣ | [custom-actions-spec.md](file:///Users/busola/Work/dyrected/specs/custom-actions-spec.md) | Custom API routes & list actions | Allow developers to register custom endpoints and add action buttons to collection list views. |
| 3️⃣ | [gaps-in-field-implementation.md](file:///Users/busola/Work/dyrected/specs/gaps-in-field-implementation.md) | UI field inputs gap checklist | Track and complete remaining small edge cases in core fields (JSON tree view, rich text tables, confirm array deletes). |
| 4️⃣ | [database-testing-plan.md](file:///Users/busola/Work/dyrected/specs/database-testing-plan.md) | Core DB Transaction & CRUD tests | Comprehensive unit tests for transactional stability, validation errors, and cross-collection relations. |
| 5️⃣ | [db-adapters-testing-plan.md](file:///Users/busola/Work/dyrected/specs/db-adapters-testing-plan.md) | Adapter compatibility testing | Run identical test suites across SQLite, Postgres, and MongoDB adapter layers to guarantee feature parity. |
| 6️⃣ | [proposed-advanced-hooks-spec.md](file:///Users/busola/Work/dyrected/specs/proposed-advanced-hooks-spec.md) | Advanced execution hooks | Add custom pre/post hooks, context sharing between middleware, and hook cancellation abort flows. |
| 7️⃣ | [ai-first-architecture-spec.md](file:///Users/busola/Work/dyrected/specs/ai-first-architecture-spec.md) | MCP & AI integrations | Expose collections, schemas, and media resources dynamically via Model Context Protocol (MCP) endpoints for agents. |
| 💤 | [media-library-features.md](file:///Users/busola/Work/dyrected/specs/future/media-library-features.md) _(Future)_ | Media management & external links | Vimeo iframe embedding, list view toggle, SVG upload settings/sanitization, replace/optimize images, and usage tracking. |
| 💤 | [plugin-form-builder-architecture.md](file:///Users/busola/Work/dyrected/specs/future/plugin-form-builder-architecture.md) _(Future)_ | Runtime form visual creator | Enable custom plugin UI components and a drag-and-drop schema layout editor (Postponed / Future backlog). |

---

## Prioritized Milestones

### 1. List Filtering (Milestone 1)
* **Goal**: Enable powerful list querying.
* **Tasks**:
  * Implement backend validation and schema-aware filter stripping in `where` clauses ([list-filters-spec.md](file:///Users/busola/Work/dyrected/specs/list-filters-spec.md)).
  * Build the frontend list filters modal and badge controls.

### 2. Custom Actions & Field Polish (Milestone 2)
* **Goal**: Provide custom endpoints and polish interactive field UX.
* **Tasks**:
  * Create registering middleware for custom actions in collections ([custom-actions-spec.md](file:///Users/busola/Work/dyrected/specs/custom-actions-spec.md)).
  * Resolve remaining field gaps (JSON tree error mapping, array deletions, clean fields).

### 3. DB Adapter & Transactional Testing (Milestone 3)
* **Goal**: Robust stability guarantees.
* **Tasks**:
  * Execute validation/transaction integration test suites ([database-testing-plan.md](file:///Users/busola/Work/dyrected/specs/database-testing-plan.md)).
  * Run multi-adapter compatibility checks ([db-adapters-testing-plan.md](file:///Users/busola/Work/dyrected/specs/db-adapters-testing-plan.md)).

### 4. Advanced Architecture & DX (Milestone 4)
* **Goal**: Advanced features and MCP integrations.
* **Tasks**:
  * Implement hooks context pipeline ([proposed-advanced-hooks-spec.md](file:///Users/busola/Work/dyrected/specs/proposed-advanced-hooks-spec.md)).
  * Expose schemas/collections via MCP endpoints for AI agent interactions ([ai-first-architecture-spec.md](file:///Users/busola/Work/dyrected/specs/ai-first-architecture-spec.md)).
  * Ergonomics improvements to TypeScript SDK interfaces.

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
| [bug-fixes-boolean-filter-and-sibling-id.md](file:///Users/busola/Work/dyrected/specs/2026-06-16/bug-fixes-boolean-filter-and-sibling-id.md) | Fixed Postgres boolean parameter query errors and resolved sibling data document ID missing contexts. | ✅ 2026-06-16 |
| [dx-feedback-and-docs-improvements.md](file:///Users/busola/Work/dyrected/specs/2026-06-16/dx-feedback-and-docs-improvements.md) | Standardized depth guides, hooks capability lifecycle documentation, `findOne` calls, and Vue custom component guides. | ✅ 2026-06-16 |
| `client-side-reactivity-spec.md` | `admin.hooks.onChange` and `admin.hooks.options` — client-side value derivation and cascading dropdowns in sandbox hidden-iframe. | ✅ 2026-05-29 |
| `dynamic-option-queries-spec.md` | Async server-side option resolvers for `select`, `multiSelect`, and `radio` fields. | ✅ 2026-05-29 |
| `lifecycle-hooks-testing-spec.md` | Backend CRUD hook sequence, chaining, abort-on-error, and isolation of `afterChange`/`afterDelete` side-effects. | ✅ 2026-05-29 |
