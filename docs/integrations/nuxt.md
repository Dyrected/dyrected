---
title: Nuxt 3 Integration
description: How to use Dyrected inside your Nuxt 3 application.
---

Dyrected provides a native Nuxt module for easy integration.

## Installation

```bash
pnpm add @dyrected/nuxt @dyrected/core
```

## Configuration

Add `@dyrected/nuxt` to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],
  dyrected: {
    // Path to your dyrected.config.ts
    configFile: './dyrected.config.ts'
  }
})
```

## Server API

The Nuxt module automatically sets up a server route at `/api/dyrected`. You can customize this prefix in the config.

## Using Composables

In your Vue components, you can use the built-in composables to fetch data.

```vue
<script setup>
const { data: posts } = await useDyrected('posts').find({
  limit: 5
})
</script>

<template>
  <div v-for="post in posts.docs" :key="post.id">
    {{ post.title }}
  </div>
</template>
```
