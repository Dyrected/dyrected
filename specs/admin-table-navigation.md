# Admin Table Navigation

Improving accessibility and speed of navigation by allowing clicks on the primary column of the data table.

## Overview

Currently, navigating to a document edit page requires clicking a "three-dot" action menu at the end of a row and selecting "Edit". This is slow and physically distant from the user's focus (usually the first column). 

This spec proposes making the primary column (the `useAsTitle` field) a clickable link that navigates directly to the edit page.

## Proposed Changes

### 1. Clickable Primary Column
In the `DataTable` component (`packages/admin`), the first column (or the field defined in `admin: { useAsTitle: '...' }`) will be rendered as a link.

- **Visuals**: The text will have a subtle hover effect (e.g., underline or primary color shift) to indicate it is clickable.
- **Behavior**: Clicking the text triggers a router navigation to `/collections/[slug]/[id]`.

### 2. Row Hover State
To further improve the UX, the entire row can have a hover state that highlights the record being hovered over.

### 3. "Edit" Button Visibility
While the "Action" menu remains for complex operations (Delete, Duplicate, Publish), the primary way to enter the edit screen should be the direct link on the title.

## Technical Implementation

- **DataTable Column Rendering**: Update the cell renderer to check if the current field matches the `useAsTitle` config of the collection.
- **Link Component**: Wrap the content in a `Link` component from the internal router.

## Example
| Title (Clickable) | Status | Date |
| :--- | :--- | :--- |
| **[My Awesome Page]** | Draft | 2026-05-15 |
| **[Contact Us]** | Published | 2026-05-14 |
