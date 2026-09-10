# Admin UI Multi-Tenancy Gap Analysis & Roadmap

> **Status:** Out of scope for current iteration (Backend + AI + Docs completed).  
> **Document Purpose:** Detailed audit of Admin UI capabilities and missing features across the three Dyrected multi-tenancy patterns.

---

## Executive Summary

While the `@dyrected/core` server, `@dyrected/sdk` client, and AI Content Assistant provide complete architectural support for all three multi-tenancy models, **the Admin UI (`packages/admin`) currently only has low-level foundation hooks without the necessary user-facing switching and management controls.**

Specifically:
- `DyrectedProvider` accepts `siteId` and passes it to `@dyrected/sdk`.
- `@dyrected/sdk` attaches `x-site-id` to API requests.
- `useQuery(["schemas", ..., siteId])` fetches the active site's schemas.

**However, the visual UI (`admin-shell.tsx`, data tables, form views, and navigation) lacks user-facing controls to switch tenants, inspect tenant memberships, auto-populate tenant fields, or handle live schema invalidation.**

---

## Pattern-by-Pattern Gap Analysis

### 1. Pattern 1: Row-Level Tenancy (Workspaces & Teams)

| Feature | Current State in Admin UI | Missing Capabilities |
| :--- | :--- | :--- |
| **Document Listing** | Server filters records using collection access rules. Users only see permitted rows. | **No Workspace Filter for Admins:** Superadmins with cross-tenant access cannot easily filter the table view by `tenantId` without manually typing a custom filter query. |
| **Document Creation** | Renders all fields defined in the schema. | **No Tenant Auto-Population in Forms:** Unless the schema hides `tenantId` (`admin: { hidden: true }`) and sets it via a `beforeChange` hook, editors see an editable `tenantId` text field that must be manually typed. |
| **Workspace Switcher** | Not implemented. | No top-bar workspace/team selector dropdown to switch between user organizations. |
| **Bulk Operations** | Standard batch actions execute across selected IDs. | No tenant safety indicator confirming that selected documents belong to the active workspace. |

---

### 2. Pattern 2: Header-Scoped Sites (`X-Site-Id`)

| Feature | Current State in Admin UI | Missing Capabilities |
| :--- | :--- | :--- |
| **Site Switching UI** | None. `siteId` is read once from `localStorage` or `initialSiteId` prop. | **No Site Switcher Dropdown:** Users with `allowedSites: ["site-a", "site-b"]` in their JWT payload have no dropdown in `admin-shell.tsx` to toggle between sites. |
| **Schema Scoping** | `/api/schemas` respects the active `siteId` and filters the sidebar navigation. | **No Dynamic Transition:** Changing `siteId` requires a manual page reload or `localStorage` edit; does not reactively re-render the sidebar collections. |
| **Collection & Global Filtering** | Non-permitted collections return 404 from backend. | **No Site Badges:** In multi-site setups with shared and site-specific collections, the sidebar does not visually label collections (e.g. `[Site A] Articles` vs `[Shared] FAQ`). |
| **Cache Invalidation** | React Query caches queries by default keys. | When switching sites, active table queries, media library queries, and audit log caches are not automatically purged. |

---

### 3. Pattern 3: Dynamic Tenant Schemas (`onSchemaFetch`)

| Feature | Current State in Admin UI | Missing Capabilities |
| :--- | :--- | :--- |
| **Schema Discovery** | Sidebar updates if `/api/schemas` returns dynamic collections on initial load. | **No Live Schema Refresh:** If tenant custom fields are added in the database, the Admin UI caches the schema in React Query. No "Reload Schema" or webhook-triggered cache bust exists. |
| **Visual Customization** | Uses default theme and branding provider. | **No Per-Tenant Branding / White-labeling:** Dynamic tenant logos, color schemes, or custom CSS provided via `globals` are not dynamically applied to the Admin Shell. |
| **In-Admin Schema Builder** | None. Schemas must be defined in TypeScript or database JSON. | **No GUI Field Builder:** Non-technical tenant administrators cannot add custom fields or collections from within the Admin UI. |
| **AI Assistant Tenant Scoping** | Assistant queries respect `projectId`. | **Thread List Re-scoping:** When `siteId` changes, the AI drawer thread history does not automatically invalidate and reload for the newly selected site. |

---

## Recommended Implementation Roadmap (Future Iteration)

When Admin UI multi-tenancy support is prioritized in a future milestone, the following components should be implemented:

### Phase 1: Site & Workspace Switcher Component
1. **`TenantSwitcher.tsx` in `admin-shell.tsx`:**
   - Read `user.allowedSites` or `user.workspaces` from auth state.
   - Render a combobox in the sidebar header displaying the active site/workspace.
   - On change: update `siteId` state in `DyrectedProvider`, persist to `localStorage("dyrected_site_id")`, and call `queryClient.invalidateQueries()`.

### Phase 2: Form & Table Enhancements
1. **Automatic Tenant Field Handling:**
   - Detect `tenantId` fields in collection schemas.
   - Automatically hide or lock `tenantId` fields on create forms and default the value to the authenticated user's active tenant.
2. **Superadmin Cross-Tenant View:**
   - Add a quick-filter pill above collection tables to filter by tenant when user has superadmin privileges.

### Phase 3: Dynamic Schema & AI Sync
1. **Schema Sync Button:**
   - Add a "Sync Schema" button in Admin Settings or developer drawer to invalidate `["schemas"]` query cache.
2. **AI Drawer Invalidation:**
   - Bind AI thread list query key to `siteId` so switching sites immediately swaps conversation history.
