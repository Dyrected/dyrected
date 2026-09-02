---
"@dyrected/core": patch
"@dyrected/admin": patch
"dyrected": patch
---

- Support `submitLabel` on operational view actions to customize the modal submit/run button text.
- Automatically prefill action modal forms with the target document's current field values when executing row actions.
- Normalize logical operators (`AND`/`and`, `OR`/`or`) case-insensitively in `where-sanitizer`.
- Apply schema default values on `create()` before persisting to the database.
- Strictly type operational view filters as `WhereClause | string`.
- Add thorough JSDoc documentation across all operational view types and interfaces.
- Add architecture specs for `npx dyrected doctor` diagnostics and multi-adapter automatic field promotion.
