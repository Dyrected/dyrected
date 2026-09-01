---
"@dyrected/core": patch
"@dyrected/sdk": patch
"@dyrected/admin": patch
"@dyrected/react": patch
"@dyrected/vue": patch
"@dyrected/nuxt": patch
"@dyrected/next": patch
"@dyrected/knowledge": patch
"dyrected": patch
---

- Added type-safe `when` declarative condition and expression builder to `@dyrected/sdk` and `@dyrected/core`.
- Added framework parity for `useDyPath()` and `useDyPathHelper()` in `@dyrected/vue` and auto-imported in `@dyrected/nuxt`.
- Enhanced CLI `upgrade` command to automatically refresh `.dyrected/ai-rules.md` with the latest canonical rules when upgrading packages.
- Added Marketing Site Page Builder Architecture, Array Field Object Shape Contract, and Type Synchronization Workflow to `@dyrected/knowledge` prompt templates and AI rules.
- Added `/docs/[...slug]` legacy catch-all redirect route in documentation.
