---
"@dyrected/admin": patch
"@dyrected/nuxt": patch
"@dyrected/sdk": patch
---

Fix branding logo rendering by replacing the buggy comma operator with `getMediaUrl`. Resolve Nuxt module template and config-load path issues, and bundle the `qs` dependency inside the SDK to eliminate browser compatibility errors.
