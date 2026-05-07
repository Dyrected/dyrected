---
title: Field Types
description: A comprehensive list of available field types in Dyrected.
---

Dyrected supports a wide range of field types to handle any data structure.

## Basic Types

- **`text`**: Standard single-line text input.
- **`textarea`**: Multi-line text input.
- **`number`**: Numeric input (integer or float).
- **`boolean`**: A simple toggle/checkbox.
- **`date`**: Date and time picker.

## Specialized Types

- **`email`**: Validates for a correct email format.
- **`url`**: Validates for a correct URL format.
- **`json`**: A code editor for raw JSON data.
- **`richText`**: A full-featured editor (powered by Tiptap).

## Selection Types

- **`select`**: Single selection from a list of options.
- **`multiSelect`**: Multiple selection from a list of options.

```typescript
{
  name: 'category',
  type: 'select',
  options: [
    { label: 'Technology', value: 'tech' },
    { label: 'Lifestyle', value: 'lifestyle' }
  ]
}
```

## Structural Types

- **`object`**: Nest fields inside a group.
- **`array`**: A list of repeating field groups.
- **`relationship`**: Connect one collection to another.

```typescript
{
  name: 'author',
  type: 'relationship',
  collection: 'authors',
  required: true
}
```

- **`blocks`**: Create flexible, component-based layouts using predefined block types.
