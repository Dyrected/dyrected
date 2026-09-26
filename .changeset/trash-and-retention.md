---
"@dyrected/core": minor
"@dyrected/admin": minor
"@dyrected/sdk": minor
"@dyrected/react": minor
"@dyrected/vue": minor
"dyrected": minor
"@dyrected/next": minor
"@dyrected/db-postgres": patch
"@dyrected/db-mysql": patch
---

Add built-in Trash & Retention system and audit/roles field helpers across core, admin, SDK, and framework integrations:

- **Core Trash & Retention**: Move deleted documents to internal `__trash` collection with deterministic IDs, freeing unique keys and keeping read paths clean. Configurable retention periods with automatic `dyrected:trash-purge` task runner integration.
- **Audit & Schema Field Helpers**: Add `defineCreatedAtField`, `defineUpdatedAtField`, `defineCreatedByField`, `defineUpdatedByField`, and `defineRolesField` (with customizable `adminRole` authorization).
- **Admin UI**: Add collection-level and global `/trash` views, 8-second undo toast on delete, media library trash support, empty trash confirmation dialog, and conflict drawer for "Restore with changes".
- **Ecosystem**: Add `client.trash()` in `@dyrected/sdk`, `useTrash` in `@dyrected/react` and `@dyrected/vue`, `dyrected doctor` trash & retention diagnostics in `@dyrected/cli`, and secret-protected cron endpoints in `@dyrected/next`.
