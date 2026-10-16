---
"@dyrected/admin": minor
"@dyrected/react": minor
---

Custom pages, view layouts and fields in React can now read and write documents with the editor's own permissions.

**For app developers**

- New `useAdminClient()` hook, exported from `@dyrected/react`. It returns the SDK client the admin is already signed in with, so a custom component can call `client.collection("orders").find(...)` or `.update(...)` without handling a token, and only sees what that editor is allowed to see.
- It is different from `useDyrected()` in `@dyrected/react`, which gives a public site's client and needs its own `DyrectedProvider`. Calling `useDyrected()` inside the admin throws, because the admin does not mount that provider.
- In Vue, `useDyrectedClient()` already returns the admin's client inside custom components, so nothing changes there.
- The hook is marked experimental.

**For integration authors**

- `useAdminClient` is also exported from `@dyrected/admin/public`. It reads the admin's own context and throws a clear error outside the admin or before sign-in.
