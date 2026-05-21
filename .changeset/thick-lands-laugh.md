---
"@dyrected/admin": patch
"@dyrected/core": patch
---

**`@dyrected/admin` — Patch**

- **Media library**: Replaced the narrow Sheet sidebar with a spacious Dialog (60/40 split-view) for a WordPress-style media editing experience.
- **Infinite scroll**: Replaced pagination with infinite scroll on the media library page.
- **Media preview**: Added a dynamic media preview block (image/audio/video/file) at the top of the `EditEntryPage` for upload collections.
- **Alt & Caption fields**: Default `alt` and `caption` fields are now automatically injected in the "Edit Full Details" form for media collections, even when the user hasn't defined them explicitly — with duplicate prevention.
- **Sticky save bar**: Added a frosted-glass sticky "Save Changes" bar at the bottom of both the collection edit page and global editor page, so users don't need to scroll back to the top to save.
- **Read-only filename**: Filename field in the media dialog is now read-only to prevent storage key corruption.
- **"Edit Full Details" button**: Added navigation from the media dialog to the full schema-driven entry editor for managing complex custom fields.
- **Array delete button**: Made the delete button on sortable array items visibly red by default instead of nearly invisible.
- **Block builder preview**: Truncated the collapsed block preview text to 50 characters so block cards don't grow with long content.
- **URL validation**: Updated the `url` field Zod schema to support both simple strings and structured URL objects (external/internal link data) to resolve validation errors when saving URLs.

**`@dyrected/core` — Patch**

- **Default Query Depth**: Increased default API population depth for `findOne` and `global` endpoints to `10` to guarantee deep/full resolution of relationships and media by default.
- **URL Field Population**: Enhanced the `PopulationService` to dynamically resolve internal `url` fields. It now populates the target document, recursively applies defaults, and rewrites the relative URL to use the target's slug (or falls back to ID).
- **Nested Document Defaults**: The `PopulationService` now automatically applies default values to related documents during relationship population.
- **Recursion Depth Bug Fix**: Fixed an issue in `findOne` and `global` controllers where population starting depth was initialized incorrectly, which blocked relationship populating when depth limit was low.

