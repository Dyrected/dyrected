# @dyrected/nuxt

This is the Nuxt module for the Dyrected ecosystem.

## Composables

### `useDyrectedCollection`

Fetch a collection of documents with auto-seeding support.

```vue
<script setup>
const { data: posts } = await useDyrectedCollection('posts', {
  initialData: [
    { title: 'Welcome to Dyrected', content: '...' }
  ]
})
</script>
```

### `useDyrectedDoc`

Fetch a single document.

```vue
<script setup>
const { data: post } = await useDyrectedDoc('posts', 'my-post-slug', {
  initialData: { title: 'Default Post', content: '...' }
})
</script>
```

### `useDyrectedGlobal`

Fetch global settings.

```vue
<script setup>
const { data: settings } = await useDyrectedGlobal('site-settings', {
  initialData: { siteName: 'My Awesome Site' }
})
</script>
```
