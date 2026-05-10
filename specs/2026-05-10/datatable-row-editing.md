# Spec: DataTable Click-to-Edit Functionality

## Objective
Enhance the data management experience by allowing users to initiate editing directly from the table rows, reducing the need for explicit "Edit" action buttons.

## User Experience
- **Interactive Rows**: Rows should highlight on hover to indicate interactivity.
- **Direct Navigation**: Clicking anywhere on a row (except for specific action icons or checkboxes) triggers the edit view for that record.
- **Visual Feedback**: The cursor should change to `pointer` when hovering over a row.

## Technical Implementation

### 1. Row Component
- Wrap the `<tr>` or its equivalent in a clickable handler.
- Use a `data-id` attribute to identify the record.

### 2. Navigation Logic
- Integrate with the routing system (e.g., `react-router` or `next/navigation`) to push the edit URL.
- Ensure that clicks on internal buttons (like "Delete") do not bubble up to the row-level click handler.

### 3. Accessibility
- Ensure rows are focusable via keyboard (`tabindex="0"`).
- Support `Enter` and `Space` keys to trigger the same navigation logic as a click.
- Add `aria-label` to indicate the row is editable.

## UI Requirements
- **Flat Table Design**: Remove all unnecessary vertical and horizontal borders between cells. Use a clean, borderless header or a single bottom-border for the header row only.
- **Alternating Row Colors (Zebra Striping)**: Use white for even rows and a very light shade of the primary color (e.g., `primary-50` or `rgba(var(--primary), 0.03)`) for odd rows to provide visual tracking without lines.
- **Hover State**: Subtle background color change (e.g., `bg-slate-50` or `bg-blue-50/30`).
- **Active State**: Brief visual flash or shadow when clicked to confirm the action.
- **No Outer Borders**: The table should not be wrapped in a card or have an outer border; it should sit flat on the workspace background.
- **Loading State**: Show a skeleton or spinner if the navigation takes more than 100ms.
