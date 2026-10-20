---
"@dyrected/admin": patch
---

The Custom Admin Pages guide now says clearly what a page's `access` rule does and does not protect.

`access` decides who sees a page in the sidebar and who can open it by address. It is not a security boundary, because the page's code ships with the admin. If a page calls an endpoint in your own app, that endpoint has to check who is asking. The guide has a new "Protecting your own endpoints" section with a Next.js route handler and a Nuxt server route. Both verify the session with `me()` and check the user's role, building the SDK client per request so one editor's token is never shared with another request.
