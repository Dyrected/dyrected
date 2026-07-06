---
"@dyrected/admin": patch
"@dyrected/core": patch
---

Render single-field arrays as a flat, reorderable list instead of accordion cards, with the label shown once and per-row actions (duplicate, move, delete) in an overflow menu. Add a `hideLabel` admin option to suppress a field's label where it would be redundant. Hide the admin's own mobile header when embedded so the host dashboard renders a single top bar, driven via a `dyrected:toggle-menu` window event. Fix the mobile nav drawer closing immediately after opening (the close-on-navigation effect depended on the open state and re-triggered itself); it now closes only when the route changes. Refresh the dashboard update-check cache on a TTL so the banner reflects newly published versions instead of freezing on the first value seen.
