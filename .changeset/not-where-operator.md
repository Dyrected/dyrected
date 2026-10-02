---
"@dyrected/core": patch
"@dyrected/admin": patch
---

- **Where Operator `not` & Aliases (`ne`, `not_equal`, `notEquals`)**: Added support for `"not"` and related negation aliases in `parseSqlWhere` and `parseMongoWhere`, resolving unhandled operator errors. Supports scalar values (`!=`, `IS NOT NULL`), arrays (`NOT IN`), nested operator expressions (`NOT (...)`), and top-level `NOT`/`not` blocks (SQL `NOT (...)`, Mongo `$nor`).
- **Where Sanitizer `NOT` Clause Preservation**: Updated `sanitizeWhereClause` and `coerceBooleanWhere` to preserve and recursively walk `NOT`/`not` blocks for boolean coercion and schema field sanitization.
- **Admin Filter Builder & Formatter Support**: Added label and badge formatting support for `"not"` and `"ne"` in admin filter utilities.
