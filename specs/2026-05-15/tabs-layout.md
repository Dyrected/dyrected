# Tabs Layout

Organizing fields into logical, navigable sections within the Collection Edit page.

## Overview

As collections grow in complexity, a single vertical list of fields can become overwhelming. The `tabs` feature allows developers to group related fields into tabbed sections by assigning each field to a specific tab. This improves the editorial experience without altering the data structure.

## Configuration

Fields can be assigned to a tab using the `admin.tab` property.

```ts
const pages = defineCollection({
  slug: 'pages',
  fields: [
    { 
      name: 'title', 
      type: 'text',
      admin: { tab: 'Content' } 
    },
    { 
      name: 'content', 
      type: 'richText',
      admin: { tab: 'Content' } 
    },
    { 
      name: 'metaTitle', 
      type: 'text',
      admin: { tab: 'SEO' } 
    },
    { 
      name: 'metaDescription', 
      type: 'textarea',
      admin: { tab: 'SEO' } 
    },
  ],
});
```

## Technical Implementation

### 1. Schema Changes
- Add `tab` to the `admin` property of the `Field` interface in `packages/core/src/types/index.ts`.
- The `tab` property is an optional `string`.

```ts
export interface Field {
  // ...
  admin?: {
    tab?: string;
    // ...
  };
}
```

### 2. Admin UI Logic
The Admin UI will automatically group fields based on their `tab` value:

1. **Extraction**: Collect all unique `tab` values from the `fields` array.
2. **Sorting**: Tabs are rendered in the order they first appear in the `fields` array.
3. **Default Tab**: Fields without a `tab` property are grouped into a default "General" or "Main" tab (or displayed before any tabs).
4. **Rendering**: Use a Tabbed navigation (e.g., Radix UI Tabs) where each tab pane contains the corresponding fields in their original relative order.

### 3. Non-Breaking Nature
- **Data Integrity**: This change is strictly visual/administrative. It does NOT affect how data is stored in the database or returned by the API.
- **Backward Compatibility**: Existing collections without `tab` properties will continue to render as a single list (within the default tab).

## Benefits
- **Simplicity**: No need for nested `fields` arrays or new field types.
- **Flat Structure**: Maintains the flat content contract that is easy for AI to understand and generate.
- **Flexibility**: Easy to move fields between tabs just by changing a string.
