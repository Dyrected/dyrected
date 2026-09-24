---
"@dyrected/core": minor
"@dyrected/admin": minor
"dyrected": minor
"@dyrected/sdk": minor
"@dyrected/db-sqlite": minor
"@dyrected/db-mysql": minor
"@dyrected/db-postgres": minor
"@dyrected/knowledge": minor
---

Operational views and dynamic navigation

- **Workspaces:** add `defineWorkspace` and `DefineWorkspaceOptions` for standalone operational workspaces, collection placement, groups, ordering (`order`, `position`, `before`, `after`), `addToCollection`, and role-based `access`. Reserved route slugs are validated at config load.
- **Navigation APIs:** serve `/api/admin/navigation` (compiled tree, pruned per user role) and `/api/admin/navigation/badges` (batched aggregates, invalidated on mutations).
- **Badges:** support static text badges, aggregate count badges with variants, and per-view badges. Metrics gain `countDistinct` and string-based aggregates, with improved Postgres casting.
- **Admin:** add an inline navigation customizer with auto-generated slugs, a Lucide icon picker, and permanent view deletion. Pinned items now sit under the dashboard, and preference events no longer dispatch during render.
- **Database adapters:** add collection database indexes and the aggregate improvements above to the SQLite, MySQL, and Postgres adapters.
- **CLI:** add `dyrected nav pull` and `dyrected nav push` to sync UI-configured navigation with `dyrected.config.ts`, and keep navigation in sync during `sync:schema`.
- **SDK:** resolve relative base URLs server-side.
- **Knowledge:** add KYC review, order fulfillment, and support desk workspace recipes.
- **Docs:** add the "Workspaces and navigation" guide and remove legacy `list-view-v1` content.
