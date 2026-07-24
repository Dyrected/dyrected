---
"@dyrected/admin": patch
"@dyrected/core": patch
"@dyrected/nuxt": patch
"@dyrected/sdk": patch
"dyrected": patch
---

Add Cloud-safe declarative hooks, broader declarative-expression validation, and clearer config diagnostics across core, admin, Nuxt, SDK, and CLI.

- add declarative string hook support for collection/global `beforeRead`, `afterRead`, and `beforeChange`, field `beforeChange`, and field `admin.hooks.onChange`
- preserve supported declarative hook strings during `sync:schema`, strip function hooks from Cloud payloads intentionally, and warn with exact schema paths
- validate declarative access rules, string access policies, declarative hooks, `admin.condition`, and `admin.previewUrl` early with exact config paths and cleaner diagnostics
- expose config diagnostics from `/api/schemas` so admin surfaces can consume them, and improve admin dashboard attention signals around config issues
- improve Nuxt startup and reload reporting for invalid declarative config with formatted diagnostics instead of noisy raw errors
- document the Cloud-safe access and hooks model more clearly, including synced string policies, `createdByCurrentUser` vs `isOwner`, declarative hook contexts, and short notes about early validation for access, hooks, preview, and `admin.condition`
