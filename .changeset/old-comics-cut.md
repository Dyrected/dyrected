---
"@dyrected/admin": patch
"@dyrected/core": patch
"@dyrected/db-mongodb": patch
"@dyrected/db-mysql": patch
"@dyrected/db-postgres": patch
"@dyrected/db-sqlite": patch
"@dyrected/next": patch
"@dyrected/nuxt": patch
"@dyrected/react": patch
"@dyrected/sdk": patch
"@dyrected/docs": patch
---

**Add universal sort parsing, admin CSS isolation, initial token support, and updated branding theme**

- Added universal sort parsing in `@dyrected/core`:
  - New `parseSort` utility
  - New regression test for `sort=-updatedAt`
  - Exported parser from core

- Integrated normalized sort handling across all DB adapters:
  - MongoDB
  - SQLite
  - Postgres
  - MySQL

- Added admin/Dyrected Cloud initial token support:
  - Internal `initialToken` auth bypass path for Cloud-hosted dashboard bootstrapping

- Added `defaultTechStack` support:
  - Setup prompt/provider context now supports default tech stack configuration

- Added admin CSS isolation work:
  - Custom PostCSS plugin for scoping Tailwind styles
  - Prefixed/scoped admin animations
  - Disabled global Tailwind preflight
  - Scoped resets under `.dy-admin-ui`
  - Scoped prose and CSS variables away from `:root`

- Updated branding/theme system:
  - Theme-aware logo support
  - Light/dark logo variants
  - Signal Lime / Violet semantic tokens
  - Typography and semantic CSS variable cleanup

- Updated docs UI:
  - Docs layout/component structure refactors
  - Global docs styling update
  - Lighter lime background styling
