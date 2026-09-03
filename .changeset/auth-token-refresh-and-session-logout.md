---
"@dyrected/sdk": patch
"@dyrected/admin": patch
"dyrected": patch
---

- Fix Admin UI session staleness and authentication desynchronization:
  - Add proactive background token refresh timer scheduled 5 minutes before JWT expiration.
  - Refresh token on browser tab `focus` and `visibilitychange` when returning to an open dashboard.
  - Dispatch `dyrected:auth-unauthorized` and support `onAuthError` callback in `@dyrected/sdk` on 401 responses.
  - Automatically attempt token refresh on 401s in Admin UI, falling back to instant login gate transition if session is expired or revoked.
  - Fix user state leak bug in `DyrectedProvider` that prevented logout and login page rendering.
  - Call backend `POST /api/collections/:slug/logout` to revoke server session in `__auth_sessions` during logout.
- Allow operational view component slots (`afterViewHeader`, `beforeViewHeader`, `beforeViewContent`, `afterViewContent`) to resolve components registered under either `components.collectionView` or `components.collectionList`.
