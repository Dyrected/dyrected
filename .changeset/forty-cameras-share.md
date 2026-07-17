---
"@dyrected/next": patch
---

Add a dedicated `@dyrected/next/server` export for App Router route files and
other server-only helpers so Next server code does not pull the client React
entrypoints from the package root.
