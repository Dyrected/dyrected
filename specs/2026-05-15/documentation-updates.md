# Documentation Updates

Changes required to the public documentation (`apps/docs`) for features shipped in this batch.

---

## Summary of affected pages

| Doc page | Change type |
|---|---|
| `content/docs/concepts/fields.mdx` | Add `icon`, `join`, `row` field types; add `select` radio layout variant; expand Admin Field Options table with `tab`, `width`, `direction`, `layout` |
| `content/docs/features/live-preview.mdx` | Add Inline Page Editing section and `data-dy-path` attribute reference |
| `content/docs/admin/overview.mdx` | Note that the primary column (`useAsTitle`) is now a direct edit link |

---

## 1. `content/docs/concepts/fields.mdx`

### 1a. Update Base Properties table

`name` is now optional for layout-only field types (`row`). Update the row:

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ (omit for `row`) | The key used in the database and JSON responses. Use camelCase. Layout fields (`row`) do not require a name since they produce no database column. |

---

### 1b. Add to Admin Field Options table

Insert after the existing `condition` row:

| Property | Type | Applies to | Description |
|---|---|---|---|
| `tab` | `string` | All fields | Groups the field into a named tab on the edit page. Fields without a `tab` are placed in a "General" tab. Tabs are ordered by first appearance in the `fields` array. |
| `layout` | `"radio"` \| `"select"` | `select` | Renders the select as radio buttons instead of a dropdown. Best for 2–5 short options that should all be visible at once. |
| `direction` | `"horizontal"` \| `"vertical"` | `select` (radio layout) | Controls the orientation of the radio group. Defaults to `"vertical"`. |
| `width` | `string` | Any field inside a `row` | CSS width of the field within its row container (e.g. `"50%"`, `"200px"`). Fields without a width grow equally to fill remaining space. |

---

### 1c. Add `icon` field type (under Selection Fields)

```mdx
### `icon`

A searchable icon picker backed by the [Lucide](https://lucide.dev) icon library. Stores the icon name as a string.

\```ts
{
  name: 'featureIcon',
  type: 'icon',
  label: 'Feature Icon',
  admin: {
    description: 'Choose an icon to represent this feature.',
  }
}
\```

- **Stored as:** `VARCHAR` / `string` — the Lucide component name, e.g. `"Rocket"`, `"ShieldCheck"`
- **API returns:** `string`
- **Admin UI:** Button that opens a searchable grid of all Lucide icons with a live preview thumbnail

#### Rendering on the frontend (Vue/Nuxt)

\```vue
<script setup>
import * as LucideIcons from 'lucide-vue-next'
const props = defineProps(['iconName'])
const Icon = LucideIcons[props.iconName]
</script>

<template>
  <component :is="Icon" v-if="Icon" class="w-5 h-5" />
</template>
\```

#### Rendering on the frontend (React/Next.js)

\```tsx
import * as LucideIcons from 'lucide-react'

export function DynamicIcon({ name }: { name: string }) {
  const Icon = (LucideIcons as any)[name]
  return Icon ? <Icon className="w-5 h-5" /> : null
}
\```
```

---

### 1d. Add `join` field type (under Relationship Fields, after `relationship`)

```mdx
### `join`

A **virtual** reverse-relationship field. Rather than storing an ID, it performs a live query for all documents in another collection that reference the current document. Nothing is written to the database for the `join` field itself.

**Use case:** On an `Author` document, show all `Posts` that have `author` set to this author.

\```ts
const authors = defineCollection({
  slug: 'authors',
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'posts',
      type: 'join',
      collection: 'posts', // target collection slug
      on: 'author',        // field in that collection pointing back here
      label: 'Written Posts',
    }
  ]
})
\```

#### Properties

| Property | Type | Required | Description |
|---|---|---|---|
| `collection` | `string` | ✅ | The slug of the collection to query. |
| `on` | `string` | ✅ | The field name in the target collection that holds the reference back to this document. |

#### Behaviour

- **Database:** No column is created. On read, the engine runs a secondary query: `SELECT * FROM {collection} WHERE {on} = {currentId}`.
- **API returns:** An array of populated documents (or IDs, depending on `depth`).
- **Admin UI:** A read-only list of related documents. Each row links directly to that document's edit page. A "Create new" button opens the target collection's creation form with the relationship field pre-filled.
- **New documents:** The join list shows a "Save this document first" prompt until the document has been persisted.

> **Note:** `join` fields are automatically excluded from form submission and validation. They cannot be written via the API.
```

---

### 1e. Add `row` field type (new section: Layout Fields)

Add a new top-level section after Structural Fields:

```mdx
## Layout Fields

Layout fields control how the Admin UI renders the form. They have **no effect on the API or database** — the underlying child fields remain flat in the document.

### `row`

Places a group of fields side-by-side in a horizontal row. Use for short, related fields like `firstName` / `lastName` or `price` / `currency`.

\```ts
{
  type: 'row',
  fields: [
    {
      name: 'firstName',
      type: 'text',
      label: 'First Name',
      admin: { width: '50%' },
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'Last Name',
      admin: { width: '50%' },
    },
  ],
}
\```

- `row` fields do not need a `name` — they produce no database column.
- Child field widths are set via `admin.width`. Without a width, children grow equally to fill the row.
- On narrow screens the row wraps to vertical automatically.
- All validation rules on child fields apply as normal.

> **Tip:** `row` pairs well with `tabs` — you can combine both in the same collection.
```

---

### 1f. Add Tabs Layout example (under Admin Field Options)

Add below the `admin` options reference:

```mdx
### Tabs Layout

Assign fields to named tabs by setting `admin.tab`. Any field without a `tab` is placed in a "General" tab (or the default section if no other tabs are defined).

Tabs are ordered by first appearance in the `fields` array.

\```ts
const pages = defineCollection({
  slug: 'pages',
  fields: [
    { name: 'title',           type: 'text',     admin: { tab: 'Content' } },
    { name: 'body',            type: 'richText', admin: { tab: 'Content' } },
    { name: 'metaTitle',       type: 'text',     admin: { tab: 'SEO' } },
    { name: 'metaDescription', type: 'textarea', admin: { tab: 'SEO' } },
    { name: 'slug',            type: 'text' }, // → goes to "General" tab
  ],
})
\```

This produces a three-tab edit form: **General → Content → SEO**.

Tabs are purely visual — data structure and API responses are unaffected.
\```

---

### 1g. Add select radio layout variant (under Selection Fields → `select`)

Append to the existing `select` entry:

```mdx
#### Radio layout

For 2–5 options where you want all choices visible at once, use `admin.layout: 'radio'`:

\```ts
{
  name: 'status',
  type: 'select',
  options: [
    { label: 'Draft',     value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived',  value: 'archived' },
  ],
  admin: {
    layout: 'radio',
    direction: 'horizontal', // or 'vertical' (default)
  }
}
\```

- **`direction: 'horizontal'`** — radio buttons arranged in a wrapping row.
- **`direction: 'vertical'`** — stacked column (default).
- Stored and returned identically to a standard `select`.
```

---

## 2. `content/docs/features/live-preview.mdx`

### 2a. Add Inline Page Editing section

Append as a new top-level section after the existing Token Mode content:

```mdx
---

## Inline Page Editing

Inline Page Editing lets editors click any element in the Live Preview pane to instantly jump to the corresponding field in the sidebar form — without hunting through the field list.

### How It Works

1. An **Edit Mode** toggle (cursor icon) appears in the Live Preview toolbar.
2. When activated, the Admin sends a `dyrected-enter-edit-mode` message to the preview iframe.
3. Your frontend listens for this message and activates click listeners on elements marked with `data-dy-path`.
4. Clicking a marked element sends `dyrected-element-clicked` back to the Admin.
5. The Admin sidebar scrolls to and focuses the matching field.

\```
Editor clicks "Edit" in preview toolbar
  │
  ├─ postMessage({ type: 'dyrected-enter-edit-mode' }) → iframe
  │
  │  Editor hovers/clicks a [data-dy-path] element
  │
  ├─ postMessage({ type: 'dyrected-element-clicked', path: 'title' }) → Admin
  │
  └─ Admin scrolls to field[name="title"] and focuses the input
\```

---

### Marking elements with `data-dy-path`

Add a `data-dy-path` attribute to any HTML element whose value maps directly to a field name in your collection schema.

\```html
<!-- HTML output — rendered by your frontend template -->
<h1 data-dy-path="title">My Page Title</h1>
<p  data-dy-path="excerpt">Short intro text...</p>
\```

#### Vue / Nuxt shorthand

The `useLivePreview` composable handles edit mode automatically — no extra code needed. Just mark your elements:

\```vue
<template>
  <h1 data-dy-path="title">{{ post.title }}</h1>
  <div data-dy-path="body" v-html="post.body" />
</template>
\```

When the editor activates Edit Mode, `useLivePreview` adds hover outlines and click listeners to all `[data-dy-path]` elements and tears them down when Edit Mode is exited.

#### React / Next.js

The inline edit listener is not yet built into `@dyrected/react`. Add it manually or wait for a future release:

\```tsx
useEffect(() => {
  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'dyrected-enter-edit-mode') {
      document.querySelectorAll('[data-dy-path]').forEach(el => {
        el.addEventListener('click', () => {
          window.parent.postMessage(
            { type: 'dyrected-element-clicked', path: (el as HTMLElement).dataset.dyPath },
            '*'
          )
        })
      })
    }
  }
  window.addEventListener('message', handleMessage)
  return () => window.removeEventListener('message', handleMessage)
}, [])
\```

---

### Naming convention for `data-dy-path`

The `path` value should match the **field `name`** in your collection schema exactly. For nested fields use dot notation:

| Content path | Field schema |
|---|---|
| `title` | `{ name: 'title', type: 'text' }` |
| `seo.metaTitle` | `{ name: 'seo', type: 'object', fields: [{ name: 'metaTitle', ... }] }` |
| `blocks.0.heading` | First block inside a `blocks` field, `heading` sub-field |

> **Note:** The Admin sidebar only scrolls to top-level field names. Dot-notation paths (`seo.metaTitle`) will scroll to the parent object group (`seo`).

---

### postMessage protocol reference

All messages use `window.postMessage` with no origin restriction (`'*'`) by default. Set `serverURL` in `useLivePreview` to lock down the allowed origin.

| Direction | Message type | Payload | Description |
|---|---|---|---|
| Admin → Frontend | `dyrected-live-preview` | `{ data: object }` | Sends the current form values for live re-render |
| Admin → Frontend | `dyrected-enter-edit-mode` | — | Activates inline edit listeners |
| Admin → Frontend | `dyrected-exit-edit-mode` | — | Deactivates inline edit listeners |
| Frontend → Admin | `dyrected-live-preview-ready` | — | Signals iframe is mounted and ready |
| Frontend → Admin | `dyrected-element-clicked` | `{ path: string }` | Reports which field path was clicked |
```

---

## 3. `content/docs/admin/overview.mdx`

### 3a. Add note about clickable title column

Locate the section that describes the collection list page (or the data table) and add:

```mdx
### Navigating to a Document

The **primary column** of the list table — determined by `admin.useAsTitle` on the collection — is rendered as a direct link to the document's edit page. Click it to open the editor immediately, without using the three-dot action menu.

\```ts
defineCollection({
  slug: 'posts',
  admin: {
    useAsTitle: 'title',  // "title" column becomes a clickable link
  },
  fields: [...],
})
\```

If `useAsTitle` is not set, the first visible non-status field is used as the link target.
```

---

---

## 4. New page: `content/docs/integrations/vue.mdx`

Also add `"vue"` to `content/docs/integrations/meta.json`:

```json
{
  "title": "Integrations",
  "pages": ["nextjs", "nuxt", "vue", "sdk"]
}
```

Full page content:

```mdx
---
title: Vue 3 Integration
description: Using @dyrected/vue in a Vite-based Vue 3 application — composables, the Admin UI component, and custom field bridges.
---

`@dyrected/vue` is the foundation of all Vue-based Dyrected integrations. It provides reactive composables, the `<DyrectedAdmin />` component, and a React-in-Vue bridge for custom field components. `@dyrected/nuxt` re-exports everything here and adds Nuxt-specific glue on top — if you are building a Nuxt app, follow the [Nuxt integration guide](/docs/integrations/nuxt) instead.

---

## Installation

\```bash
pnpm add @dyrected/vue @dyrected/sdk
\```

---

## Step 1 — Provide the client

The composables rely on Vue's provide/inject system. Register the client once at the root of your app (usually `main.ts`):

\```ts
// main.ts
import { createApp } from 'vue'
import { createClient } from '@dyrected/sdk'
import { DYRECTED_CLIENT_KEY } from '@dyrected/vue'
import App from './App.vue'

const app = createApp(App)

const client = createClient({
  baseUrl: import.meta.env.VITE_DYRECTED_URL,
  apiKey: import.meta.env.VITE_DYRECTED_API_KEY,
  siteId: import.meta.env.VITE_DYRECTED_SITE_ID, // Cloud mode only
})

app.provide(DYRECTED_CLIENT_KEY, client)
app.mount('#app')
\```

Environment variables:

\```bash
# .env
VITE_DYRECTED_URL=https://your-site.com/dyrected
VITE_DYRECTED_API_KEY=sk_live_...
VITE_DYRECTED_SITE_ID=site_...   # Cloud mode only
\```

---

## Step 2 — Fetch data with composables

All composables must be used inside a component's `setup()` (or `<script setup>`). They require the client to have been provided as shown above.

### `useDyrectedCollection(collection, options?)`

Fetch a list of documents from a collection. Returns reactive `docs`, `pending`, `error`, and a `refresh()` function.

\```vue
<script setup lang="ts">
import { useDyrectedCollection } from '@dyrected/vue'

const { docs: posts, pending } = useDyrectedCollection('posts', {
  where: { status: { equals: 'published' } },
  sort: '-createdAt',
  depth: 1,
  limit: 10,
})
</script>

<template>
  <div v-if="pending">Loading...</div>
  <ul v-else>
    <li v-for="post in posts" :key="post.id">{{ post.title }}</li>
  </ul>
</template>
\```

| Return | Type | Description |
|---|---|---|
| `docs` | `Ref<T[]>` | The fetched documents. Empty array until loaded. |
| `pending` | `Ref<boolean>` | `true` while the request is in-flight. |
| `error` | `Ref<any>` | Set if the request fails. |
| `refresh` | `() => void` | Re-fetches with the same options. |

---

### `useDyrected(collection, idOrSlug, options?)`

Fetch a single document by ID or slug.

\```vue
<script setup lang="ts">
import { useDyrected } from '@dyrected/vue'

const props = defineProps<{ id: string }>()
const { doc: post, pending } = useDyrected('posts', props.id, { depth: 1 })
</script>
\```

| Return | Type | Description |
|---|---|---|
| `doc` | `Ref<T \| null>` | The fetched document. |
| `pending` | `Ref<boolean>` | Loading state. |
| `error` | `Ref<any>` | Error state. |
| `refresh` | `() => void` | Re-fetches the document. |

---

### `useDyrectedGlobal(slug, options?)`

Fetch a global document (e.g. site settings, navigation).

\```vue
<script setup lang="ts">
import { useDyrectedGlobal } from '@dyrected/vue'

const { data: settings } = useDyrectedGlobal('site-settings')
</script>
\```

---

### `useDyrectedClient()`

Returns the raw `DyrectedClient` instance for one-off queries or mutations.

\```vue
<script setup lang="ts">
import { useDyrectedClient } from '@dyrected/vue'

const client = useDyrectedClient()

async function createPost(data: any) {
  const post = await client.collection('posts').create(data)
  return post
}
\```

---

### `useLivePreview(options)`

Enables real-time synchronization with the Admin UI preview pane via `postMessage`. See the [Live Preview guide](/docs/features/live-preview) for full details including inline edit mode.

\```vue
<script setup lang="ts">
import { useDyrected, useLivePreview } from '@dyrected/vue'

const props = defineProps<{ id: string }>()

// Fetch initial data
const { doc: initialPost } = useDyrected('posts', props.id, { depth: 1 })

// Sync with Admin live preview
const { data: post, isLive } = useLivePreview({
  initialData: initialPost.value,
  serverURL: import.meta.env.VITE_DYRECTED_ADMIN_URL,
})
</script>
\```

---

## Step 3 — Embed the Admin UI

`<DyrectedAdmin />` mounts the React-based Admin dashboard into your Vue app. It handles all React root lifecycle and prop syncing internally.

\```vue
<!-- AdminPage.vue -->
<script setup lang="ts">
import { DyrectedAdmin } from '@dyrected/vue'
</script>

<template>
  <DyrectedAdmin basename="/admin" />
</template>
\```

> Ensure React and the Admin UI bundle are available. Add to your `vite.config.ts`:
>
> \```ts
> optimizeDeps: {
>   include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query']
> }
> \```

### Props

| Prop | Type | Description |
|---|---|---|
| `basename` | `string` | The URL prefix where the admin is mounted. Defaults to `'/'`. |
| `baseUrl` | `string` | Override the API base URL (Cloud mode). |
| `apiKey` | `string` | Override the API key (Cloud mode). |
| `siteId` | `string` | Override the site ID (Cloud mode). |
| `components` | `object` | Custom field components to inject. See [Custom Fields](#custom-field-components). |

---

## Custom Field Components

Pass Vue components as custom admin fields using the `components` prop. The bridge automatically wraps them so they render correctly inside the React-based Admin UI.

\```vue
<script setup lang="ts">
import { DyrectedAdmin } from '@dyrected/vue'
import MyColorPicker from './components/MyColorPicker.vue'
</script>

<template>
  <DyrectedAdmin
    basename="/admin"
    :components="{
      fields: {
        colorPicker: MyColorPicker,
      }
    }"
  />
</template>
\```

For advanced use, import `wrapVueComponent` directly to wrap a Vue component into a React-compatible wrapper yourself:

\```ts
import { wrapVueComponent } from '@dyrected/vue'
import MyPicker from './MyPicker.vue'

const ReactMyPicker = wrapVueComponent(MyPicker)
// Use ReactMyPicker anywhere in a React tree
\```

---

## All Composables

| Composable | Description |
|---|---|
| `useDyrectedClient()` | Returns the injected `DyrectedClient` |
| `useDyrected(slug, id, opts?)` | Fetches a single document reactively |
| `useDyrectedCollection(slug, opts?)` | Fetches a collection reactively |
| `useDyrectedGlobal(slug, opts?)` | Fetches a global document reactively |
| `useLivePreview(opts)` | Syncs with the Admin live preview pane; supports inline edit mode |

---

## TypeScript

Pass your collection type to any composable for fully typed responses:

\```ts
interface Post {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
  author: { id: string; name: string }
}

const { docs: posts } = useDyrectedCollection<Post>('posts', { depth: 1 })
// posts.value is Post[]
\```
```

---

---

## 5. `content/docs/concepts/fields.mdx` — Custom Admin Input Components

Add as a new subsection under **Admin Field Options**, after the options table:

```mdx
### Custom Input Components

Replace the default input for any field with your own React component by setting `admin.component` to a string key:

\```ts
// dyrected.config.ts
{
  name: 'accentColor',
  type: 'text',
  admin: {
    component: 'colorPicker', // must match a key registered in the Admin shell
    description: 'Primary brand color for this item.',
  }
}
\```

The string key is resolved against the `components.fields` map passed to `<AdminUI />` (React/Next.js) or `<DyrectedAdmin />` (Vue/Nuxt):

\```tsx
// React / Next.js
import { AdminUI } from '@dyrected/admin'
import { ColorPickerField } from './components/ColorPickerField'

export default function AdminPage() {
  return (
    <AdminUI
      components={{
        fields: {
          colorPicker: ColorPickerField,
        }
      }}
    />
  )
}
\```

\```vue
<!-- Vue / Nuxt -->
<DyrectedAdmin
  basename="/admin"
  :components="{
    fields: {
      colorPicker: MyVueColorPicker,
    }
  }"
/>
\```

> When using Vue components, `@dyrected/vue` automatically wraps them with `wrapVueComponent` so they render correctly inside the React-based Admin UI. See the [Vue integration guide](/docs/integrations/vue#custom-field-components).

#### Custom component interface

Custom field components receive these props:

\```tsx
interface CustomFieldProps {
  value: any
  onChange: (value: any) => void
  field: Field        // the full field schema
  path: string        // dot-notation path, e.g. "blocks.0.content"
  error?: string
  label?: string
  description?: string
  disabled?: boolean
}
\```

If `admin.component` is set but no matching component is registered in the shell, the Admin UI falls back to the default input for the field's `type`.
```

---

## Changelog entry

Add to `apps/docs/CHANGELOG.md`:

```md
## [Unreleased]

### Added
- **Icon field** (`type: "icon"`) — searchable Lucide icon picker, stores icon name as string
- **Join field** (`type: "join"`) — virtual reverse-relationship; queries related docs by back-reference, read-only in Admin UI
- **Row layout** (`type: "row"`) — places child fields side-by-side; supports `admin.width` per child
- **Tabs layout** (`admin.tab`) — groups fields into named tabs on the collection edit page
- **Radio layout** (`admin.layout: "radio"`, `admin.direction`) — renders a `select` field as radio buttons
- **Clickable title column** — `useAsTitle` field in the list table is now a direct link to the edit page
- **Inline Page Editing** — Edit Mode in Live Preview; click `[data-dy-path]` elements to jump to the matching sidebar field; supported out-of-the-box by `useLivePreview` in Vue/Nuxt
- **Custom Admin Inputs** — `admin.component` field property lets developers inject custom React (or bridged Vue) components into the Admin UI field renderer
- **`@dyrected/vue` integration** — Standalone Vue 3 composables (`useDyrectedCollection`, `useDyrected`, `useDyrectedGlobal`, `useLivePreview`), `<DyrectedAdmin />` component, and React-in-Vue bridge utilities (`wrapVueComponent`, `wrapComponents`)
```
