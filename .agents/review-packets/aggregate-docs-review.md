# Documentation Review Packet: Collection Aggregations

## 1. Deliverable Summary
- **Primary Deliverable**: New documentation page for Collection Aggregations (`apps/docs/content/docs/deliver-content/sdk-api/aggregate.mdx`).
- **Updated Pages**:
  - `apps/docs/content/docs/deliver-content/sdk-api/meta.json` (Added `"aggregate"` to navigation)
  - `apps/docs/content/docs/deliver-content/sdk-api/overview.mdx` (Added `.aggregate()` to capability list)
  - `apps/docs/content/docs/deliver-content/rest-api/overview.mdx` (Added `POST /api/collections/:slug/aggregate` endpoint documentation)
  - `apps/docs/content/docs/deployment-and-operations/infrastructure/database/overview.mdx` (Updated `DatabaseAdapter` interface snippet)
- **Target Audience**: TypeScript/JavaScript developers using the `@dyrected/sdk` and backend developers querying Dyrected via REST.

---

## 2. Source Inventory
- **Code implementation**:
  - `packages/core/src/types/aggregate.ts` (Core types)
  - `packages/sdk/src/index.ts` (Fluent SDK `.aggregate()` method)
  - `packages/core/src/controllers/collection.controller.ts` (Controller logic, access gating, where sanitization)
  - `packages/db-postgres`, `packages/db-sqlite`, `packages/db-mysql`, `packages/db-mongodb` (Database adapters)
- **Trust Level**: High (Verified by 39 passing adapter contract tests + 5 controller unit tests + 10 SDK tests).

---

## 3. Human Verification Questions & Checks for Reviewer

1. **Voice and Teaching Order**: Does the new page at `/docs/deliver-content/sdk-api/aggregate` clearly explain *why* to use aggregation (saving memory/bandwidth) before jumping into code syntax?
2. **Safe Cast Explanation**: Is the explanation of `cast` and the guarantee that invalid strings (e.g. `"unknown"`) resolve to `null` clear and accurate?
3. **Empty Collection Returns**: Is the distinction clear that `count` on empty sets returns `0`, while `sum`, `avg`, `min`, `max` return `null`?
4. **Security Model**: Is the explanation that aggregations reuse `access.read` (and do not run document-level `beforeRead` hooks) clear?

---

## 4. Uncertainty Register
- **None**: All behaviors, return types, operators, and status codes were confirmed against live implementations across all 4 database engines.
