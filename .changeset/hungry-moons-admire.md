---
"@dyrected/db-postgres": patch
"@dyrected/db-sqlite": patch
"@dyrected/admin": patch
"@dyrected/core": minor
---

### @dyrected/core

- **New Discovery Workflow**: Refined the AI setup prompt with a multi-step "Phase 0" discovery process to improve initial project scoping.
- **Nomenclature Standardization**: Updated all system prompts to use "Nuxt.js" nomenclature and improved schema definition examples.

### @dyrected/db-postgres & @dyrected/db-sqlite

- **Architecture Documentation**: Added source-level documentation explaining the use of raw SQL drivers (postgres.js/better-sqlite3) alongside Drizzle to support dynamic runtime schemas.

### @dyrected/admin

- **Internal Maintenance**: Synchronized internal documentation and field renderer context to support the latest core setup workflows.
