---
"@dyrected/admin": patch
"@dyrected/core": patch
"@dyrected/nuxt": patch
---

- Bundle all admin UI implementation dependencies into pre-compiled ESM to eliminate Vite runtime dependency discovery and page reloads.
- Lazy-load AI SDK dependencies and add `@vercel/oidc` browser shim to eliminate Vite CommonJS export errors.
- Hide AI lip trigger when no AI config is specified.
- Fix relative ESM import extension for `loadConfig` and add `jiti` dependency to `@dyrected/nuxt`.
