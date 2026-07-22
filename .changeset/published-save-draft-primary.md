---
"@dyrected/admin": patch
---

Refine workflow action behavior in the admin collection editor:

- Prefer `Save draft` as the primary workflow button when an entry is currently in a published workflow state.
- Keep unpublish-style workflow transitions out of the primary button and available from the workflow dropdown instead.
- Preserve normal forward workflow transitions as the primary action for non-published entries.
- Remove the workflow comment dialog's effect-based local state reset to satisfy React Hooks lint rules without changing the required-comment flow.
