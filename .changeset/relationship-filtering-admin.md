---
"@dyrected/admin": patch
---

- **Relationship Filtering in Operational Views**: Added multi-select relationship filtering support to table and operational views via `DataTableRelationshipFilter`. Includes infinite scroll pagination for browsing and searching target collection records and a dedicated hydration query ensuring selected items never disappear or appear blank.
- **Multi-Select Filtering on `select`, `multiSelect`, and `relationship`**: Enabled multi-selection by default across all faceted filter types (`select`, `multiSelect`, `relationship`), allowing editors to filter by multiple choices simultaneously.
- **Relationship Picker Selected Value Hydration**: Updated `RelationshipPicker` in document edit forms to hydrate existing selected IDs with a targeted query, preventing selected values from appearing blank when the referenced document is outside the first page of results.
