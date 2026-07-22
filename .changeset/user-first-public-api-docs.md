---
"@dyrected/admin": patch
"@dyrected/react": patch
"@dyrected/vue": patch
---

Rewrite the public API docs around end-user goals instead of internal architecture.

- Rework the overview for hooks and composables so it starts from the jobs developers are trying to get done, such as media uploads, media picking, document editing, custom fields, and theme-aware shells.
- Add focused documentation pages for media, form and field, and theme APIs in `apps/docs`, with practical guidance for custom components, dashboards, and host apps rather than framing them only as admin internals.
- Keep the lower-level controller layer documented only as supporting context, while steering most readers toward the public React hooks in `@dyrected/react` and Vue composables in `@dyrected/vue`.
