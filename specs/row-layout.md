# Row Layout

Placing multiple fields side-by-side horizontally to create more compact and intuitive forms.

## Overview

By default, fields in Dyrected are stacked vertically. The `row` layout allows developers to group related short fields (like `First Name` and `Last Name`) into a single horizontal row, reducing the total height of the page.

## Configuration

Fields are wrapped in a `row` type. Individual fields can optionally specify their `width` in the `admin` property.

```ts
{
  type: 'row',
  fields: [
    { 
      name: 'firstName', 
      type: 'text',
      admin: { width: '50%' }
    },
    { 
      name: 'lastName', 
      type: 'text',
      admin: { width: '50%' }
    }
  ]
}
```

## Technical Implementation

### 1. Schema Changes
- Add `row` to `FieldType`.
- Like `tabs` and `collapsible`, this is a **layout-only** field. The data remains flat in the database.

### 2. Admin UI Component
A `Row` component will be implemented in `packages/admin`.

- **Flexbox/Grid**: Uses a flexbox container (`flex-row`) to align children.
- **Width Handling**: Respects the `admin.width` property of children. If no width is specified, it defaults to `100%` or equal distribution.
- **Responsiveness**: On mobile devices, rows automatically "wrap" or switch back to a vertical stack for readability.

## Benefits
- More efficient use of screen real estate.
- Better logical grouping of related fields.
- Professional, "polished" dashboard look.
