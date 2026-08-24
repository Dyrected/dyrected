---
"@dyrected/core": patch
"@dyrected/admin": patch
---

- **Filter Join Operator**: Support `AND` / `OR` toggle in toolbar and URL parameters (`joinOperator=and|or`) for inter-column filter combinations in operational views.
- **Action Dialog Document Context**: Pass target document/row context (`doc`, `docs`, `record`, `row`, `data`, `formData`) into action form dialogs, `FieldRenderer`, and custom field components.
- **View Features & Action Ordering**: Properly serialize and respect `view.features` (`edit`, `delete`, `duplicate`) and custom `actionOrder` in operational view action menus and table columns.
