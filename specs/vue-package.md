# Package: @dyrected/vue

A framework-specific SDK and UI library for integrating Dyrected into Vue 3 applications.

## Overview

While `@dyrected/nuxt` provides a high-level integration for Nuxt.js, many users may want to use Dyrected in a standard Vue 3 application (e.g., Vite-based). The `@dyrected/vue` package serves as the foundation for all Vue-based integrations, including the Admin UI bridge and composables.

## Architecture

### 1. Separation of Concerns
- **`@dyrected/vue`**: Core Vue 3 logic (composables, base components, React-in-Vue bridge).
- **`@dyrected/nuxt`**: Nuxt 3 module that provides auto-imports, module configuration, and Nitro server handlers. It will depend on `@dyrected/vue`.

## Key Components

### `<DyrectedAdmin />`
A Vue component that mounts the React-based Admin UI shell into a DOM element.

```vue
<template>
  <DyrectedAdmin 
    :config="dyrectedConfig" 
    basename="/admin"
    :components="{
      fields: {
        customPicker: MyVuePicker
      }
    }"
  />
</template>

<script setup>
import { DyrectedAdmin } from '@dyrected/vue';
import MyVuePicker from './components/MyVuePicker.vue';
</script>
```

### `useDyrected()`
A reactive composable for fetching content within Vue components.

```ts
const { doc, pending, error } = useDyrected('pages', 'home');
```

## Technical Implementation

### 1. React-in-Vue Bridge
Since the Admin UI is built in React, `@dyrected/vue` will include a robust bridge:
- **Mounting**: Uses `react-dom/client` to mount the shell into a Vue-controlled `ref`.
- **Prop Syncing**: Watches Vue props and updates the React root.
- **Component Injection**: Automatically wraps Vue components passed as props into React-compatible wrappers using a mounting helper.

### 2. Live Preview Support
The `useLivePreview` composable will be ported to `@dyrected/vue` to allow visual editing feedback in any Vue app.

## Proposed Package Structure

```text
packages/vue/
├── src/
│   ├── components/
│   │   └── DyrectedAdmin.vue
│   ├── composables/
│   │   ├── useDyrected.ts
│   │   └── useLivePreview.ts
│   ├── bridge/
│   │   └── react-in-vue.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Migration Plan
1. Extract `DyrectedAdmin.vue` and composables from `packages/nuxt`.
2. Move them to `packages/vue`.
3. Update `packages/nuxt` to re-export from `@dyrected/vue` and provide Nuxt-specific glue (e.g. `defineNuxtModule`).
