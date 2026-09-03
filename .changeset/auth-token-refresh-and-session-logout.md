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
- Enhance action and confirmation dialogs for mobile and tall content:
  - Render as a mobile bottom-sheet (`max-sm:bottom-0`, slide from bottom, top grab handle) on small viewports.
  - Constrain all fields and custom modal components within the device viewport width (`w-full min-w-0 overflow-x-hidden`).
  - Enable independent vertical scrolling (`overflow-y-auto`) with fixed, docked headers and action footer buttons.
- Add operational view Refresh button in [ViewHeader](file:///Users/busola/Work/dyrected/packages/admin/src/pages/collections/views/view-header.tsx) and mobile action menu:
  - Refetches both collection/view data and summary metrics in the background.
  - Keeps current datasets and stats on screen while displaying spinning and pulsing refetch indicators.
- Update back button navigation on document edit and global editor pages to use browser history when available, preserving active operational view filters, sorting, and pagination.
