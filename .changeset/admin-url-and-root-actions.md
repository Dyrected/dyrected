---
"@dyrected/core": patch
"@dyrected/admin": patch
---

Fix collection-level `actions` not appearing in the admin, and fix invite and password-reset links. `/api/schemas` now includes root-level `collection.actions`, so `displayAction` items on a detail view resolve instead of showing "Action not found". Invite and reset emails now link to the admin UI instead of the site URL. The base URL comes from the new `admin.adminUrl` option, then the `DYRECTED_ADMIN_URL` env var, then the page the admin is running on, then `/admin`, and relative values resolve against the request origin. The invite dialog's "Copy" field now shows the full invite link with its token.
