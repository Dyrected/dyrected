# Radio Field

A single-choice selection UI rendered as a group of radio buttons instead of a dropdown.

## Overview

The Radio field is a layout variant of the `select` field type. It provides better visibility for short lists of options (typically 2-5 items) by showing all choices simultaneously.

## Configuration

Developers can trigger the radio UI by setting `admin.layout` to `'radio'`.

```ts
{
  name: 'status',
  type: 'select',
  options: [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ],
  admin: {
    layout: 'radio',
    direction: 'horizontal', // 'horizontal' | 'vertical' (default)
  }
}
```

## Technical Implementation

### 1. Field Schema
No changes are required to the core `Field` interface as `layout: 'radio'` and `direction` are already present in the `admin` property.

### 2. Admin UI Component
A new `RadioGroup` component (leveraging Radix UI or similar) will be used in `packages/admin`.

- **Orientation**: Supports both stack (vertical) and row (horizontal) layouts.
- **Styling**: Uses the `primaryColor` defined in `AdminConfig` for the active state.
- **Validation**: Supports the same `required` and `defaultValue` logic as standard select fields.

### 3. Usage Guidelines
- **Use Radio buttons when**: Options are fewer than 5 and visibility of all options is helpful.
- **Use Select dropdown when**: Options are numerous (6+) or space is constrained.

## Example UI

- [ ] Option A
- [x] Option B (Selected)
- [ ] Option C
