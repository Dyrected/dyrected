---
"@dyrected/core": patch
"@dyrected/admin": patch
---

- **Where Operator Aliases (`greater_than`, `less_than`, etc.)**: Added support for verbose operator names in `parseSqlWhere` and `parseMongoWhere` (`greater_than`, `less_than`, `greater_than_equal`, `greater_than_or_equal`, `less_than_equal`, `less_than_or_equal`, `like`), resolving HTTP 500 errors on Detail View adjacent record navigation queries (Previous / Next document buttons).
- **Core Jexl Pre-bundling**: Pre-bundled `jexl` into `@dyrected/core` to prevent Vite and browser runtime CJS default export errors across consumer applications.
- **Public/Default Preferences Read**: Allowed `GET /api/preferences/:key` to use `optionalAuth`, enabling unauthenticated clients (e.g. login screen, theme initialization) to retrieve global preferences and default fallback values without throwing 401 Unauthorized errors. Mutations (`PUT`, `DELETE`) remain protected.
- **Media Library Clipboard Paste & Progress Indication**: Added global clipboard paste support (`⌘V` / `Ctrl+V`) to `MediaLibraryDialog` with auto-switch to the Upload tab, live upload progress display, toast feedback notifications, and discoverability shortcut badges.
