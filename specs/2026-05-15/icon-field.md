# Icon Field

A visual picker for selecting icons from a library (Lucide) or providing custom icon choices.

## Overview

The `icon` field type allows developers to capture iconography as part of their content schema. This is useful for feature lists, navigation items, and UI elements where a visual identifier is required.

## Configuration

```ts
const features = defineCollection({
  slug: 'features',
  fields: [
    {
      name: 'icon',
      type: 'icon', // New field type
      label: 'Feature Icon',
      admin: {
        description: 'Choose an icon to represent this feature.',
      }
    }
  ]
})
```

## Technical Implementation

### 1. Core Type Definition
Add `icon` to the `FieldType` union in `packages/core/src/types/index.ts`.

### 2. Database Storage
Icons are stored as a simple `string` representing the icon identifier (e.g., `"rocket"`, `"shield"`, `"activity"`).

### 3. Admin UI Component
A new `IconPicker` component will be added to `packages/admin`.

- **Library**: Primarily powered by [Lucide React](https://lucide.dev/guide/packages/lucide-react).
- **Search**: Includes a search input to filter icons by name or tags.
- **Grid View**: A scrollable grid of icons for quick selection.
- **Preview**: Displays the currently selected icon next to the picker.

### 4. Custom Icon Sets (Future)
Optionally allow developers to provide their own icon sets via the `DyrectedConfig`.

```ts
// Proposed expansion
{
  name: 'icon',
  type: 'icon',
  options: [
    { label: 'Custom Star', value: 'custom-star', svg: '...' }
  ]
}
```

## Developer Experience (Frontend)

The Dyrected SDK will return the icon slug. Developers can then render it using the Lucide component or a dynamic helper.

```vue
<script setup>
import * as LucideIcons from 'lucide-vue-next'
const props = defineProps(['iconName'])
const Icon = LucideIcons[props.iconName]
</script>

<template>
  <component :is="Icon" v-if="Icon" />
</template>
```
