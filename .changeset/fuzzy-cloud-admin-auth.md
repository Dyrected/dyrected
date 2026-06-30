---
"@dyrected/admin": patch
"@dyrected/core": patch
"@dyrected/sdk": patch
---

Improve cloud admin auth collection resolution and delegated membership handling

- Prefer the `__admins` collection for admin auth when present, then fall back to the configured `adminAuth.collectionSlug`, then the first auth collection
- Return the resolved admin auth collection slug in public admin auth config so the admin UI and server agree on the active auth collection
- Pass a normalized hook request context to delegated provider membership handlers so cloud-backed user management hooks can safely read query params and request headers
- Preserve multipart upload behavior in the SDK by letting fetch set the multipart boundary automatically
