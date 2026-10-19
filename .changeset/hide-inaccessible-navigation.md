---
"@dyrected/core": patch
"@dyrected/admin": patch
---

The admin no longer shows navigation entries a user can't open. Collections, globals, custom pages, workspaces, views and actions are now hidden when your access rules deny them, and opening one by URL shows a "no access" page instead of the screen.

**What was wrong**

Navigation was only filtered by role arrays like `access: ['admin']`. Rules written as functions, Jexl strings or named policies were ignored, so the sidebar listed collections and globals the user couldn't read. View and action access rules were sent to the admin but never used to hide anything, and a global's `access.read` never reached the navigation at all.

**What changed**

- `/api/admin/navigation` evaluates every kind of rule with the same resolver the API uses. A rule that throws hides the item. A rule that returns a row-level filter (`{ owner: { equals: user.sub } }`) keeps it visible, because the user can read some rows.
- `/api/schemas` leaves out views the user can't read, and `/api/admin/navigation/badges` no longer counts items they can't see, including when they've customized their navigation.
- Workspaces whose views are all hidden disappear, and so do groups left empty.
- The admin sidebar and routes hide collections, globals and views you can't read, and hide actions you can't run. This uses `access.update`, the rule the server already checks when an action runs.

This only affects what people see. Your access rules were already enforced by the API, so no data was exposed before and none is newly protected now.

**Docs fix**

The `AccessFunction` example used `user.roles contains 'editor'`, but Jexl has no `contains` operator, so that rule always denied. Use `'editor' in user.roles`.
