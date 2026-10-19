---
"@dyrected/admin": patch
---

The "Role Default" button in the navigation editor now shows for every user the server will accept, not only users whose role is exactly `admin`.

**What was wrong**

The server lets `admin`, `super_admin`, `superadmin`, `owner` and the collection's configured admin role publish a navigation layout for a role. The editor only checked for `admin`, so a `super_admin` could never see the button, even though saving would have worked.

**What changed**

The editor now uses the same `isUserAdmin` check as the server, so the button and the permission always agree.
