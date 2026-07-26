---
"@dyrected/admin": patch
"@dyrected/cli": patch
"@dyrected/core": patch
---

- Scoped split-pane edit page width calculation exclusively to desktop screen breakpoints, preventing form compression on mobile viewports
- Replaced zero-based index array warnings with human-readable collection and field slug names in CLI `sync:schema` outputs
- Added direct documentation links to CLI schema sync warning messages and core config validation outputs
- Added comprehensive built-in Jexl helper utility functions (`slugify`, `lower`, `upper`, `trim`, `capitalize`, `truncate`, `readingTime`, `wordCount`, `replace`, `startsWith`, `endsWith`, `now`, `today`, `formatDate`, `addDays`, `diffDays`, `isPast`, `isFuture`, `includes`, `join`, `first`, `last`, `compact`, `unique`, `length`, `round`, `clamp`, `default`, `coalesce`, `isEmpty`, `get`) across `@dyrected/core`, `@dyrected/admin`, and CLI declarative validation
