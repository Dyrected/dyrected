---
"@dyrected/admin": patch
---

The Custom Admin Pages guide now says clearly what a page's `access` rule does and does not protect.

`access` decides who sees a page in the sidebar and who can open it by address. It is not a security boundary, because the page's code ships with the admin. If a page calls an endpoint in your own app, that endpoint has to check who is asking. The guide has a new "Protecting your own endpoints" section with a Next.js route handler that verifies the session with `me()` and checks the user's role.
