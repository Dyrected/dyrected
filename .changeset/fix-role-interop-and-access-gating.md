---
"@dyrected/core": patch
"@dyrected/admin": patch
---

- Normalize `role` and `roles` fields across core auth middleware and admin auth to allow interchangeable use.
- Return collection slug in `GET /me` response to ensure user context collection is always populated.
- Fix route access guard in `EditEntryPage` to check `canCreate` on creation routes instead of incorrectly checking `canRead`.
- Synchronize token authentication with the client on startup and invalidate schemas cache on login/logout so permission rules refresh immediately.
- Fix TypeScript type-narrowing on uploaded file preview in `EditEntryPage`.
