---
"@dyrected/admin": patch
---

Polish the admin editing experience with better loading and layout behavior.

- replace branded and text-only loading states with skeleton loaders across bootstrap, collections, globals, dashboard, and media views
- add professional not-found states for missing collections, globals, routes, and missing edit entries after loading resolves
- keep the desktop sidebar pinned to the viewport while the main content scrolls independently
- remove the nested media-page scroll container so the page uses a single parent scroll area
- debounce admin list and media search while keeping existing results mounted so only the results region refreshes during server-side search
- add a draggable desktop split view for resizing the live preview and form editor on collection edit pages
- make rich text editor prose respect dark mode typography tokens
- use configured global `admin.icon` values in the global edit header
