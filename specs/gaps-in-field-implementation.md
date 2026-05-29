# Gaps in Field Implementation

Last updated: 2026-05-29

Legend: ✅ Implemented · ❌ Still open

---

## Critical (break real-world use cases)

### ✅ Relationship & URL pickers — hardcoded document limits
**Implemented in `e49970a`.**
`relationship-picker.tsx` now uses `useInfiniteQuery` with a `PAGE_SIZE = 50` page window, infinite scroll ("Load more" button), and a live search input. Previously fetched 20 / 50 docs max with no pagination.

### ✅ Date field — no time support
**Implemented in `e49970a`.**
`date-picker.tsx` now supports time selection. `datetime` field type introduced in `a7874c8`.

### ✅ Radio field — no dynamic options
**Implemented in `e49970a`.**
`radio-field.tsx` now calls the server-side `GET /api/dyrected/options/:collection/:field` endpoint when `options` is a dynamic resolver, matching the behaviour of `select` and `multiSelect`.

### ✅ Rich text — window.prompt() for links
**Implemented in `e49970a`.**
Link insertion and editing use a proper in-form dialog with URL input and validation. `window.prompt()` removed.

---

## High (meaningfully limits content editing quality)

### ✅ Block builder — no duplication, no search in type picker
**Implemented in `bd0d9a3` and `0ba510f`.**
- Each block now has a **Duplicate** button (copies the block and its content via `JSON.parse(JSON.stringify(...))`).
- The block type picker modal has a **Search** input that filters by block name and description.

### ✅ JSON field — raw textarea only
**Implemented in `0ba510f`.**
`json-editor.tsx` now has two modes toggled by toolbar buttons:
- **Code mode** — textarea with error reporting including line and column numbers.
- **Tree mode** — collapsible `JsonTreeNode` tree view for read/inspection.

### ✅ Media picker — no inline upload
**Implemented in `0ba510f`.**
`media-picker.tsx` now accepts drag-and-drop files directly via `react-dropzone`. Files upload immediately without opening the media library dialog.

### ✅ Rich text — no table support
**Implemented in `a7874c8`.**
Table insertion and editing added to the rich text editor toolbar.

### ✅ Rich text — no image alt-text editing
**Implemented in `a7874c8` / `0ba510f`.**
The image insertion dialog now includes an **Alternative Text** field (labelled for accessibility). Alt text can be set and edited after insertion.

---

## Medium (polish / DX gaps)

### ✅ Icon picker — hardcoded to 280 icons, no categories, no scroll
**Implemented in `bd0d9a3`.**
Icons are now grouped into categories. The category list is scrollable. Icon count expanded beyond the original 280 hardcoded subset.

### ✅ Character/word counts — no warning state
**Implemented in `bd0d9a3` and `3a1f8d1`.**
`text-field.tsx` and `text-area-field.tsx` enforce `maxLength` / `maxWords` limits. The counter turns orange at 80 % of the limit and red at 100 %.

### ✅ Array item deletion — no confirmation dialog
**Implemented in `bd0d9a3`.**
The array item renderer in `form-field-renderer.tsx` now shows a **Confirm Deletion** dialog before removing an item. Accidental single-click deletion is no longer possible.

### ✅ Select/multiSelect — no "clear" button
**Implemented in `3a1f8d1`.**
Both `select-field.tsx` and `multi-select.tsx` now render a clear (×) button when a value is selected.

### ✅ JEXL conditions — re-evaluated on every keystroke, no memoization
**Implemented in `0ba510f`.**
`form-field-renderer.tsx` compiles JEXL expressions once and caches the compiled result. Subsequent evaluations reuse the compiled expression rather than re-parsing the string on every keystroke.

---

## Architectural

### ❌ No custom field type registration
`FieldRenderer` is still a hardcoded switch statement. There is no plugin or extension point for adding a new field type without modifying the core file. Not yet implemented.

### ❌ No server-side validation error mapping
API validation errors are not mapped back to specific form fields. Zod runs client-side but server-returned errors show as a generic message rather than being surfaced inline on the offending field. Not yet implemented.

---

## Partial / Type-only

### ⚠️ Dynamic options — `cacheTTL` typed but not server-enforced
`cacheTTL` is defined in `FieldBase.options` in `packages/core/src/types/index.ts` and documented in the schema API, but the options endpoint (`GET /api/dyrected/options/:collection/:field`) does not yet honour the value. Results are fetched on every request. Server-side caching implementation is pending.
