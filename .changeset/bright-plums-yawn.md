---
"@dyrected/admin": patch
"@dyrected/core": patch
---

Improve workflow editing UX in the Admin for workflow-enabled and `drafts: true` collections. Editors now get faster transition actions in the entry header and list view, clearer live-vs-draft status messaging, desktop labels for header action buttons, and a manual "save draft" fallback alongside workflow transitions.

Add workflow-aware draft autosave config to collection admin options with `admin.autosave` and `admin.autosaveDelayMs`. Workflow-enabled collections now default to autosaving draft revisions without changing the published snapshot, while projects can still disable autosave per collection when they need explicit manual saves.
