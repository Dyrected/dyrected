---
"@dyrected/admin": patch
---

Align drawer saves with edit-page mutation pipeline and parent query invalidation:

- Unify drawer mutations across `JoinField` and `DetailRepeatComponent` via a shared `drawerSavePipeline`.
- Support password changes (`oldPassword`, `newPassword`, `confirmPassword`) from drawers using `client.changePassword(...)`.
- Immediately seed React Query document detail caches upon mutation for zero-flicker UI updates.
- Optimistically update parent join lists and caches (`["join", target, onField, parentDocId]`).
- Thoroughly invalidate parent document queries (`detail` and `entry`), parent collection list queries, and relation join queries so parent pages update immediately without manual page reload.
- Trigger parent query invalidations when executing custom actions in drawer views via `onActionSuccess`.
- Provide standardized success and error notifications matching edit-page conventions.
