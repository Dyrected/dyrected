---
"@dyrected/admin": patch
"@dyrected/core": patch
"@dyrected/db-sqlite": patch
"@dyrected/react": patch
"@dyrected/sdk": patch
"@dyrected/vue": patch
---

**UI/UX Improvement for Admin**

1. Boolean field layout support  
   Added a new `CheckboxField` and made boolean fields default to checkbox, with `admin.layout: "switch"` available when a switch UI is preferred.

2. Array/object field renderer refactor  
   Moved array and object rendering out of `form-field-renderer.tsx` into dedicated field renderer files. Array fields now use draggable expandable cards with duplicate/move/delete actions.

3. Safer React state/effect patterns  
   Improved preferences/list-column state updates to avoid unnecessary renders and reduce maximum update depth risk. Also updated `AGENTS.md` with React effect/state safety guidance.

4. Persistent user preferences  
   Added server-backed preferences through the core router and SDK, while keeping local storage sync. Data table column visibility can now persist per user/server instead of only locally.

5. Media picker/library consistency and table columns  
   Refined media picker and media library layouts for consistency, adjusted media cards/grids/dialogs, and updated collection list table defaults/config behavior.

6. Responsive table/tooling polish  
   Modernized the data table layout, improved mobile responsiveness across table toolbar, filters, pagination, page header, and list page. Also added toolbar action support.

7. Filter builder apply workflow  
   Changed filters to use a draft/apply model so the popup does not close unexpectedly while editing. Also updated build/dependency config.

8. Collection filtering system  
   Added configurable filterable fields, a UI filter builder, URL/query integration, SDK/query-builder changes, and backend `where` sanitization for safer server-side filtering.

9. Boolean filter fix, document context, and docs/specs  
   Fixed boolean where-clause casting, passed `documentId` through the form engine, and added/expanded a large set of docs and specs around hooks, depth, filters, media, custom actions, and future work.

10. Overhaul admin dashboard
    overhaul admin dashboard with recent activity feed, schema validation alerts, and enhanced UI components
