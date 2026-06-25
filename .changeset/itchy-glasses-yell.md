---
"@dyrected/knowledge": patch
"@dyrected/admin": patch
"@dyrected/core": patch
"@dyrected/sdk": patch
"@dyrected/docs": patch
---

feat: add customizable field widths to collection edit layouts and unify list page view settings

- Added customizable field widths (25%, 33%, 50%, 66%, 75%, 100%) to edit forms, enabling side-by-side field positioning.
- Expanded the layout preferences API and SDK client to handle generic LayoutItem objects (`Array<{ name: string; width?: string }>`).
- Consolidated the list view mode selector and column configure popovers into a unified "View Settings" panel.
- Enabled column visibility toggles (checklists) directly inside the new unified view settings popover, syncing visible columns with the data table.
