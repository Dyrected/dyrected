---
"@dyrected/db-mysql": patch
"@dyrected/core": patch
"@dyrected/admin": patch
"@dyrected/nuxt": patch
"dyrected": patch
---

- **MySQL Adapter Feature Parity & Resilience (`@dyrected/db-mysql`)**:
  - **Concurrent Schema Migration Safety**: Added in-memory `tableLocks` mutex and lifecycle table cache to prevent concurrent requests from firing duplicate `ALTER TABLE` queries during initialization.
  - **Duplicate Field Tolerance**: Caught `ER_DUP_FIELDNAME` (errno `1060`) and duplicate column errors silently during concurrent column promotion.
  - **AI Chat Storage Provisioning**: Auto-created `_dyrected_ai_threads` and `_dyrected_ai_messages` internal tables with indexes and cascading foreign keys on boot, bringing MySQL to parity with Postgres.
  - **Promoted Field Types & Backfilling**: Added `DATETIME(3)` column type support for `date`/`datetime` promoted fields and added automatic backfill from JSON `data` into newly promoted SQL columns.
  - **Connection Resilience & Retries**: Added default keep-alive (`enableKeepAlive: true`, `10000ms`), connection timeout (`20000ms`), exponential backoff retries on pool initialization, and exposed `poolOptions` in `MysqlAdapterConfig`.
  - **Global Pool Caching**: Cached MySQL connection pool on `globalThis` (`getSharedMysqlClientCache`) and exported `closeAllMysqlClients()` to prevent connection exhaustion during Next.js/Nuxt HMR.
  - **Column Inspection Caching**: Replaced repetitive `SHOW COLUMNS` queries on every CRUD/aggregate call with an in-memory `tableColumnsCache`.

- **Configurable Superuser Role (`@dyrected/core`, `@dyrected/admin`)**:
  - Added `adminRole?: string` to `AuthConfig` interface.
  - Added `getAdminRoleForCollection` and `isUserAdmin` helper utilities in `@dyrected/core`.
  - Updated `/first-user` setup endpoint to inspect the collection's configured `adminRole` and `roles` field options, automatically selecting the appropriate superuser role instead of hardcoding `'admin'`.
  - Decoupled hardcoded `'admin'` checks across routes, controllers, and Admin UI to recognize configured admin roles alongside `'super_admin'` and `'admin'`.

- **Nuxt Config Loading via `jiti` (`@dyrected/nuxt`)**:
  - Replaced the static top-level ESM `import` in the generated Nitro plugin with dynamic `loadDyrectedConfig` (via `jiti` with `esmResolve: true`), natively supporting extensionless TypeScript imports and path aliases at initial boot.

- **Safe Package Publishing & Workspace Protocol Protection (`dyrected`, `scripts/publish-packages.mjs`)**:
  - Replaced native `npm publish` with `pnpm publish --no-git-checks` so internal `workspace:^` dependencies are automatically resolved into concrete published semver versions.
  - Added an automated pre-publish assertion (`assertNoRawWorkspaceDeps`) that verifies package tarballs before upload and immediately aborts if any raw `"workspace:"` string is present in the distribution manifest.
