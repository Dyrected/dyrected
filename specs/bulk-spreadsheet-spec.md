# Specification: Airtable-Style Bulk Spreadsheet Editor in `@dyrected/admin`

This document details the architectural approach and implementation details for adding a spreadsheet-like bulk editing view (similar to Airtable) to `@dyrected/admin`. 

---

## 1. Overview & Objectives

Currently, `@dyrected/admin` provides a standard dashboard UI with:
- A data list view (`CollectionListPage` utilizing TanStack Table / `DataTable`).
- An individual record edit view (`EditEntryPage` utilizing `FormEngine`).

To enhance productivity when managing catalog items, product attributes, inventory, or massive record sets, we will introduce a **Spreadsheet (Bulk Edit) View**. This view will support:
1. **Inline cell editing** for supported primitive field types (text, numbers, booleans, select/enums).
2. **Batch saves / auto-saves** with transactional state tracking to avoid corrupting records.
3. **Keyboard navigation** (arrow keys, Tab, Enter, Esc) mimicking Excel/Airtable behavior.
4. **Copy-paste integration** (both within the grid and from external spreadsheets like Excel/Google Sheets).
5. **Bulk drag-to-fill / fill down** handles.

---

## 2. Interface Design & User Experience

We will add a toggle button on the [`CollectionListPage`](file:///Users/busola/Work/dyrected/packages/admin/src/pages/collections/list-page.tsx) header to switch between "List View" (standard table) and "Spreadsheet View" (bulk edit).

### Visual Layout
- **Sticky Column Headers**: Display field labels, types (icons), and a column settings menu.
- **Sticky First Column(s)**: Row numbers, bulk checkboxes, and the primary key / record identifier.
- **Dynamic Input Renderers**: Cells render standard display values until clicked or focused, at which point they swap to inline editor inputs (e.g., standard text box, number picker, toggle switch, dropdown menu, or calendar date picker).
- **Status Indicator Footer**: Shows dirty state (e.g., `3 unsaved changes`), a "Save Changes" action button, and an "Undo" / "Cancel" option (if using manual-save mode).

```
+-------------------------------------------------------------------------------+
| [<- Back] Collection: Products        (List View) | [Spreadsheet View] (Active)|
+-------------------------------------------------------------------------------+
|    | ID   | Name [Abc]     | Price [$]  | Status [v]   | Active [x] | Description |
+----+------+----------------+------------+--------------+------------+-------------|
| 1  | 001  | [Nike Zoom   ] | 120.00     | Published    |    [x]     | running...  |
| 2  | 002  | Adidas Runner  | [95.00   ] | Draft        |    [ ]     | classic...  |
| 3  | 003  | Puma Speed     | 80.00      | [Archived  v]|    [x]     | lifestyle.. |
+----+------+----------------+------------+--------------+------------+-------------|
| 3 Unsaved Changes                                           [Discard] [Save (Cmd+S)]|
+-------------------------------------------------------------------------------+
```

---

## 3. Technology Selection

We need a highly performant grid/spreadsheet engine that integrates cleanly with TailwindCSS and React. Below, we compare the top candidates:

| Metric / Feature | Option A: `react-data-grid` | Option B: `react-datasheet-grid` | Option C: `@silevis/reactgrid` | Option D: TanStack Table (Custom Cells) |
| :--- | :--- | :--- | :--- | :--- |
| **Grid Concept** | Virtualized Data Grid | Spreadsheet / Airtable-focused | Excel-like Cell Matrix | Customized Data Table |
| **Performance (Virtualization)** | **Excellent** (Built-in) | **Excellent** (Built-in) | **Moderate** (Must build manually or pay for Pro) | Custom (Must implement virtualizer) |
| **Keyboard Navigation** | **Full** (Standard grid nav) | **Full** (Excel/Airtable replica) | **Full** (Excel replica) | None (Must build from scratch) |
| **Copy-Paste Integration** | Basic cell-level hooks | **Full** (Excel, Google Sheets compatible) | **Full** (Native Excel-like paste) | None (Requires custom hook) |
| **License** | MIT | MIT | MIT (Pro version required for advanced features) | MIT |
| **Bundle Impact & Ease of Integration** | Medium. Requires setting up custom row/cell renderers. | **High (Best DX)**. Built for Airtable feel out of the box with widgets. | Medium. Requires structuring data as a strict grid layout (`Row[]`, `Column[]`). | Low. Already installed, but high custom dev effort. |

### Option Analysis

- **`react-data-grid` (Option A)**:
  - *Pros*: Excellent performance for huge datasets, very mature, robust API.
  - *Cons*: Doesn't feel like a spreadsheet (e.g. copy-pasting selections, drag-to-fill) without writing a significant amount of custom wrapper code.

- **`react-datasheet-grid` (Option B)**:
  - *Pros*: Specifically designed to copy **Airtable and Google Sheets**. It handles multi-cell copy-pasting out of the box, provides intuitive inline widget renderers, supports drag-to-fill, and has built-in smooth virtualization.
  - *Cons*: Slightly less flexible than `react-data-grid` if you need custom column sizing algorithms, but perfect for typical CMS schema tabular formats.

- **`@silevis/reactgrid` (Option C)**:
  - *Pros*: Extremely faithful Excel-like experience. Perfect if you need custom cell selection bounding boxes.
  - *Cons*: Requires converting database records into a separate abstract row/column coordinate tree. Virtualization is only available in the Pro (paid) package, making it unsuitable for large tables in the open-source core.

### Recommendation
**`react-datasheet-grid`** is the best fit for `@dyrected/admin`. It yields the closest out-of-the-box Airtable spreadsheet feel, supports robust clipboard manipulation, and handles virtualization without requiring us to buy a commercial license or build complex copy-paste logic from scratch.

---


## 4. State Management & API Integration

To prevent high-latency write cycles on every single keystroke, we will implement a **Draft Buffer Architecture** (optimistic local state).

### Local Draft Buffer
```typescript
interface SpreadsheetDraft {
  // Keyed by record ID, containing only modified fields
  [recordId: string]: {
    [fieldName: string]: any;
  }
}
```

- When a cell is edited, we *do not* immediately trigger `useMutation` to hit the API. Instead, we write the change to a local `drafts` state.
- Modified cells receive a distinct visual treatment (e.g., a subtle amber background border or highlight).
- The user can trigger a save manually with a **Save** button or `Cmd+S` shortcut.
- Alternatively, we can support **Auto-Save** with a debounced queue (e.g., waiting 1000ms after the user stops typing to patch the record).

### Batch Save Mutation
```typescript
const bulkUpdateMutation = useMutation({
  mutationFn: async (drafts: SpreadsheetDraft) => {
    // Perform parallel or batched API patches via the @dyrected/sdk client
    const promises = Object.entries(drafts).map(([id, changes]) =>
      client.collection(slug).update(id, changes)
    );
    return Promise.all(promises);
  },
  onSuccess: () => {
    toast.success("All spreadsheet changes saved successfully!");
    queryClient.invalidateQueries({ queryKey: ["collection", slug] });
    setDrafts({}); // Clear draft buffer
  }
});
```

---

## 5. Field Compatibility Matrix

To ensure full coverage of the `@dyrected/core` schema specification, here is how all 21 available field types will behave in the spreadsheet layout:

| Category | Field Type | Inline Support | Editor Component / UI Behavior |
| :--- | :--- | :--- | :--- |
| **Simple Text** | `text`<br>`email`<br>`url` | **Full** | Frameless `<input type="text" />` (with input-type validation where appropriate). |
| **Long Text** | `textarea`<br>`richText` | **Read-Only / Popover** | Cell displays strip-tags plaintext. Double-clicking launches a Modal/Popover containing our existing [RichTextEditor](file:///Users/busola/Work/dyrected/packages/admin/src/components/forms/fields/rich-text-editor.tsx) (TipTap-based), saving proper HTML structure upon closing. `textarea` launches our standard textarea element. |
| **Numeric** | `number` | **Full** | Frameless `<input type="number" />` matching min/max steps. |
| **State** | `boolean` | **Full** | Custom center-aligned checkmark toggle. Clicking directly flips the state. |
| **Temporal** | `date`<br>`datetime`<br>`time` | **Full** | Combines HTML5 native picker elements (`type="date"`, `type="datetime-local"`, `type="time"`) or a mini Radix Popover-based picker. |
| **Selection** | `select`<br>`multiSelect`<br>`radio` | **Full** | Inline select/combobox. `multiSelect` shows pill tags and clicking opens a multi-checkbox drop-down. `radio` is mapped to an inline select menu. |
| **Relationship** | `relationship`<br>`join` | **Partial** | Displays related document's title/name as a pill. Double-clicking opens an async search dropdown (Combobox) to select referenced records. `join` is read-only (displays relationship structure). |
| **Structural** | `array`<br>`object`<br>`blocks`<br>`json` | **Read-Only / Popover** | Displays summarized JSON (e.g. `[3 items]` or `{...}`). Double-clicking opening a slide-out drawer or modal with structured sub-forms/JSON editor. |
| **Media** | `image` | **Read-Only / Popover** | Miniature thumbnail image preview. Clicking opens the file manager / Cloudinary overlay. |
| **Utility** | `icon` | **Full** | Displays selected icon. Double-clicking opens a grid selector matching Lucide icon sets. |
| **Layout** | `row` | **N/A** | Skipped in spreadsheet representation (flattened into columns). |

---

## 6. Implementation Roadmap

1. **Phase 1: Grid Foundation**
   - Create a new component `SpreadsheetEditor.tsx` in `packages/admin/src/components/ui/`.
   - Wire up virtualization or pagination matching the current `CollectionListPage`.
   
2. **Phase 2: Local Buffering & Cell Editors**
   - Implement cell editors for `text`, `number`, `boolean`, and `select`.
   - Setup the `drafts` state hook and style modified cells.

3. **Phase 3: Integration & Keys**
   - Add Keyboard navigation handlers (up/down/left/right shifting active cell focus).
   - Hook up `Cmd+S` save mutation mapping.

4. **Phase 4: Navigation Toggles**
   - Embed the toggle in `CollectionListPage.tsx` and dynamically load the Spreadsheet view.
