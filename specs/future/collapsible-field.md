# Collapsible Fields

Grouping fields into toggleable sections to save vertical space in the Admin UI.

## Overview

Collapsible sections are useful for grouping optional or advanced settings that don't need to be visible at all times. Unlike tabs, which switch between views, collapsibles allow multiple sections to be visible (or hidden) simultaneously.

## Configuration

Fields can be wrapped in a `collapsible` type.

```ts
{
  type: 'collapsible',
  label: 'Advanced Settings',
  admin: {
    initiallyCollapsed: true,
  },
  fields: [
    { name: 'customCss', type: 'textarea' },
    { name: 'externalId', type: 'text' },
  ]
}
```

## Technical Implementation

### 1. Schema Changes
- Add `collapsible` to `FieldType`.
- Like `tabs`, this is a **layout-only** field. The `fields` inside it remain flat in the final database document.

### 2. Admin UI Component
A `Collapsible` component (using Radix UI Accordion or similar) will be implemented in `packages/admin`.

- **State**: Tracks whether the section is open or closed.
- **Header**: Displays the label and a chevron icon.
- **Validation**: If a hidden field within a collapsed section has an error, the section should automatically expand or show a warning indicator on the header.

## Benefits
- Reduces visual clutter.
- Improves focus on primary content.
- Maintains a flat data structure.
