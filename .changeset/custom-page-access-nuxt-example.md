---
"@dyrected/admin": patch
---

The "Protecting your own endpoints" section of the Custom Admin Pages guide now has a Nuxt server route next to the Next.js route handler. Both verify the session with `me()` and check the user's role, and both build the SDK client per request so one editor's token is never shared with another request.
