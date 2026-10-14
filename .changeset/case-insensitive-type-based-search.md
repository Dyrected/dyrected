---
"@dyrected/core": patch
---

- **Case-insensitive collection search**: `contains` and `starts_with` now compare lowercased values on MySQL and SQLite, so admin list search no longer depends on letter case (MySQL's binary-collated JSON extraction and SQLite's ASCII-only `LIKE` folding previously made matching case-sensitive). Postgres (`ILIKE`) and MongoDB (`$options: "i"`) were already insensitive.
- **Literal special characters in search**: `%` and `_` in `contains`/`starts_with` are escaped for SQL `LIKE`, and regex metacharacters are escaped for MongoDB `$regex`, so searching for `50%` or `(` matches literally instead of acting as a wildcard or throwing. The raw `like` operator keeps wildcard semantics on SQL.
- **Searchable fields chosen by type**: when `admin.searchableFields` is omitted, search covers `admin.useAsTitle` plus every visible `text`, `textarea`, `richText`, `email` and `url` field (up to eight, including fields nested in `row`), regardless of field name. Relationship fields are searched only when listed in `searchableFields`.
