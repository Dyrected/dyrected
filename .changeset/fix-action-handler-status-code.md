---
"@dyrected/core": patch
"@dyrected/sdk": patch
---

- Respect `error.statusCode` from throwing `defineAction` handlers in the collection action runner instead of always returning HTTP 500, matching the workflow-transition error path. Single-row failures now return the thrown status (e.g. 400 for validation failures) with an `{ error: true, message }` body, and bulk runs report the per-row status.
- Surface the server's error message in `DyrectedError` for string and bare `{ error }` response bodies, so admin action toasts show the actual validation message instead of a bare status code.
