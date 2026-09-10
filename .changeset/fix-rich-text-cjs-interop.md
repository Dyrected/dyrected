---
"@dyrected/admin": patch
"@dyrected/vue": patch
"@dyrected/core": patch
---

Resolve Rolldown CommonJS interop error in lazy-loaded `RichTextEditor` chunk by shimming `use-sync-external-store` to native React 18/19 hooks, and inject a browser `window.require` fallback for `react` and `react-dom` in `@dyrected/admin` and `@dyrected/vue`.
