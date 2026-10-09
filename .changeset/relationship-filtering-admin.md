---
"@dyrected/admin": patch
---

- **Relationship Filtering in Operational Views**: Added multi-select relationship filtering support to table and operational views via `DataTableRelationshipFilter`. Includes infinite scroll pagination for browsing and searching target collection records and a dedicated hydration query ensuring selected items never disappear or appear blank.
- **Zero-Flicker Relationship Title Display**: Added synchronous document caching and TanStack Query cache seeding to eliminate brief raw ID flashes when selecting relationship filter items.
- **Multi-Select Filtering on `select`, `multiSelect`, and `relationship`**: Enabled multi-selection by default across all faceted filter types (`select`, `multiSelect`, `relationship`), allowing editors to filter by multiple choices simultaneously.
- **Relationship Picker Selected Value Hydration**: Updated `RelationshipPicker` in document edit forms to hydrate existing selected IDs with a targeted query, preventing selected values from appearing blank when the referenced document is outside the first page of results.
- **Date Filtering with Day Bounds & Dual Date Picker for "isBetween"**: Resolved issues where date filters previously failed to match records due to exact millisecond comparisons. Date filters now query against full-day boundaries (`gte: startOfDay, lte: endOfDay`), "isBetween" renders two dedicated date pickers (`Start date` and `End date`) and requires both values, and added "Is on or before" (`lte`) and "Is on or after" (`gte`) operators.
