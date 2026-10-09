---
"@dyrected/admin": patch
---

- **Relationship Filtering in Operational Views**: Added multi-select relationship filtering support to table and operational views via `DataTableRelationshipFilter`. Includes infinite scroll pagination for browsing and searching target collection records and a dedicated hydration query ensuring selected items never disappear or appear blank.
- **Pinned "Selected" Section in Popover**: Pinned checked items into a dedicated "Selected" section at the top of the popover, keeping them accessible for unchecking even while searching or paging through other options.
- **Descriptive Trigger Badges on Table Toolbar**: Updated the filter pill trigger badge to display the actual document titles for 1 or 2 items (e.g. `Author: Acme Corp` or `Author: Acme Corp, Beta Corp`) and count badges for 3+ items.
- **Multi-Field Server Search for Relationships**: Broadened server-side search across candidate identifier fields (`displayField`, `name`, `title`, `email`, `slug`, `username`, `code`) matching with `OR` clauses.
- **Avatars & Thumbnails in Filter Lists**: Added thumbnail and avatar rendering for visual upload collections and documents with media fields.
- **Relationship Invert & Negation Operators**: Added support for `in` ("Is any of"), `not_in` ("Is not any of"), `isEmpty` ("Is empty"), and `isNotEmpty` ("Is not empty") operators in relationship filters.
- **Zero-Flicker Relationship Title Display**: Added synchronous document caching and TanStack Query cache seeding to eliminate brief raw ID flashes when selecting relationship filter items.
- **Multi-Select Filtering on `select`, `multiSelect`, and `relationship`**: Enabled multi-selection by default across all faceted filter types (`select`, `multiSelect`, `relationship`), allowing editors to filter by multiple choices simultaneously.
- **Relationship Picker Selected Value Hydration**: Updated `RelationshipPicker` in document edit forms to hydrate existing selected IDs with a targeted query, preventing selected values from appearing blank when the referenced document is outside the first page of results.
- **Date Filtering with Day Bounds & Dual Date Picker for "isBetween"**: Resolved issues where date filters previously failed to match records due to exact millisecond comparisons. Date filters now query against full-day boundaries (`gte: startOfDay, lte: endOfDay`), "isBetween" renders two dedicated date pickers (`Start date` and `End date`) and requires both values, and added "Is on or before" (`lte`) and "Is on or after" (`gte`) operators.
