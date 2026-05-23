# Edit Page UI Cleanup & Array/Object Collapse + Paging Plan

## Overview

The edit-entry page in `packages/admin/src/pages/collections/edit-page.tsx` currently renders the form and preview layout correctly, but the content area is visually dense and array/object fields can become difficult to manage when they grow large.

This plan defines a focused UI cleanup for the edit page, with a priority on:
- cleaner spacing and panel presentation for the main form wrapper
- improved visual hierarchy for field groups
- collapse behavior for nested object blocks
- paging support for large arrays
- more readable array item summaries and object group headers

## Goals

- Make the edit page feel lighter and more polished by improving spacing, borders, and card structure.
- Keep the existing functional behavior while making arrays and nested objects easier to scan.
- Add collapse affordances for object field groups.
- Preserve drag and reorder behavior, bulk add actions, and existing controls.

## Scope

### Primary files
- `packages/admin/src/pages/collections/edit-page.tsx`
- `packages/admin/src/components/forms/form-field-renderer.tsx`
- `packages/admin/src/components/forms/form-engine.tsx`

### UI aspects
- layout and container width for the edit page
- header spacing and button group styling
- panel/card styling for form sections
- array field list controls, item collapse, and pagination UI
- object field group presentation and collapse state

## Implementation Plan

### 1. Edit page layout cleanup

- Refine the left column container in `EditEntryPage`:
  - use a cleaner max-width when preview pane is hidden
  - reduce large paddings on mobile / small screens
  - ensure the page header and form body are visually separated with consistent card-style spacing
- Improve the top action row:
  - make save/preview buttons more visually grouped
  - reduce noisy border usage in the header
- Adjust the right preview column container to avoid abrupt width jumps and keep the preview pane visually aligned with the form.

### 3. Array item header polish

- Keep the existing item summary logic in `ArrayItemHeader`, but tune it for cleaner display:
  - smaller label text
  - truncated preview text with a more subtle separator
  - optional item count badge if there are many items
- Ensure the expand/collapse and move controls remain accessible and not visually overloaded.

### 4. CSS and visual alignment

- Add collapse wrappers for `schema.type === 'object'` in `FormFieldRenderer`:
  - render object groups in a bordered card with header and description
  - include a collapse toggle button in the object heading
  - show a summary line if object fields are collapsed (empty state or selected preview values)
- Preserve nested field rendering while collapsed by only hiding the children and keeping the object header visible.
- Use a smooth transition class for collapsed state.

### 4. Array item header polish

- Keep the existing item summary logic in `ArrayItemHeader`, but tune it for cleaner display:
  - smaller label text
  - truncated preview text with a more subtle separator
  - optional item count badge if there are many items
- Ensure the expand/collapse and move controls remain accessible and not visually overloaded.

### 5. CSS and visual alignment

- Standardize card background and border styles for form sections, arrays, objects, and empty states.
- Use the `dy-muted` / `dy-border-muted` palette consistently instead of mixed strong borders.
- Reduce the vertical padding inside each array item card and object group to improve focus.
- Maintain the existing Dyrected design language, with serif headers for section titles and sans text for inputs.

## Acceptance Criteria

- The edit page header and form container feel visually lighter and more polished.
- Object fields can collapse/expand cleanly with a visible header and optional summary.
- Drag, reorder, bulk add, delete, and item collapse behavior continue to work.
- No regression in edit page data save/load behavior.

## Verification

1. Open a collection edit page with long arrays and nested object fields.
2. Confirm the edit page spacing and section boundaries are cleaner.
3. Verify array sections show pagination controls when there are more than 5 items.
4. Confirm object field groups can be collapsed and expanded.
5. Run the admin package build to ensure no TS or build issues.

## Notes

- This is intentionally mostly CSS/layout work, but the array paging and object collapse behavior may require small renderer updates in `form-field-renderer.tsx`.
- If pagination logic is too heavy, we can implement a simpler `show first 5 items / show more` pattern as a follow-up.
