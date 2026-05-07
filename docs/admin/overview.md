---
title: Admin UI
description: How the Dyrected Admin dashboard works, how to embed it, and how to customise it.
---

The `@dyrected/admin` package is a React-based Admin UI that is **automatically generated** from your `dyrected.config.ts`. You define your schema once — the Admin renders the forms, tables, media browser, and global editors without any additional code.

---

## Embedding the Admin

### In Next.js

Create a catch-all page under your chosen admin path:

```tsx
// app/admin/[[...route]]/page.tsx
'use client'

import { AdminUI } from '@dyrected/admin'
import '@dyrected/admin/dist/index.css'

export default function AdminPage() {
  return (
    <AdminUI
      baseUrl={process.env.NEXT_PUBLIC_CMS_URL!}
      apiKey={process.env.NEXT_PUBLIC_CMS_API_KEY!}
      siteId={process.env.NEXT_PUBLIC_SITE_ID}
    />
  )
}
```

### In Nuxt

The `@dyrected/nuxt` module does not embed the Admin UI — it provides SSR data fetching composables and the server handler. To use the Admin UI in a Nuxt project, add a client-only page:

```vue
<!-- pages/admin/[...slug].vue -->
<template>
  <ClientOnly>
    <AdminUI
      :base-url="config.public.cmsUrl"
      :api-key="config.public.cmsApiKey"
      :site-id="config.public.siteId"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
import { AdminUI } from '@dyrected/admin'
import '@dyrected/admin/dist/index.css'
const config = useRuntimeConfig()
</script>
```

### Standalone (self-hosted)

When running the `@dyrected/core` app directly, the Admin UI is served at `/admin` automatically. No separate setup is needed.

---

## `AdminUI` Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `baseUrl` | `string` | ✅ | The base URL of your Dyrected API (e.g. `https://cms.mysite.com`). |
| `apiKey` | `string` | ✅ | The Site API key used to authenticate all Admin requests. |
| `siteId` | `string` | | The Site ID sent as `X-Site-Id` on every request (required in Cloud mode). |

---

## Admin UI Pages

### Dashboard

The landing page. Shows a count of all collections and globals, quick links to recent collections, and a setup prompt if no schema has been synced yet.

### Collection List

A sortable, searchable data table for any collection.

- **Search:** The search input queries the field specified by `admin.useAsTitle` (or the first visible field).
- **Columns:** Controlled by `admin.defaultColumns`. Falls back to the first three non-hidden fields.
- **Status column:** Automatically added if the collection has a `status` field.
- **Actions:** Edit (navigates to edit page), Copy ID, Delete.

### Collection Edit / Create

The main content editor. Fields are rendered in the order they appear in your `fields` array.

- **Sidebar:** Shows document ID, created/updated timestamps, and a publishing status panel if the collection has a `status` field.
- **Live Preview:** If `admin.previewUrl` is set, a split-pane iframe renders alongside the form.
- **Unsaved changes:** The browser prompts before leaving if there are unsaved edits.

### Media Page

Shown automatically for any collection with `upload: true`.

- Grid of uploaded files with thumbnails (images) or file-type icons (documents, videos, etc.)
- Click to view file details: URL, dimensions, file size, alt text
- Drag-and-drop upload zone
- Delete with confirmation

### Global Editor

A single full-page form for editing a Global's fields. Identical to the collection edit form but without list navigation.

---

## Sidebar Structure

The sidebar is generated from your config at runtime:

1. **Grouped collections** — Collections sharing the same `admin.group` value are nested under a labelled, collapsible section.
2. **Ungrouped collections** — Appear at the top level in definition order.
3. **Upload collections** — Grouped into a "Media" section automatically.
4. **Globals** — Listed below collections, also respecting `admin.group`.
5. **Hidden items** — Collections or globals with `admin.hidden: true` are excluded.

---

## Customising Branding

Pass a top-level `admin` key in your `defineConfig` to override default styling:

```ts
export default defineConfig({
  admin: {
    branding: {
      logo: '/logo.svg',
      logoMark: '/logomark.svg',
      primaryColor: '#6366f1',
      favicon: '/favicon.ico',
    },
    meta: {
      titleSuffix: '— Acme CMS',
    },
  },
  collections: [...],
})
```

See [Admin Config Reference](/docs/core/admin-config) for the full property list.

---

## Custom Field Components

You can replace the default Admin UI widget for any field type or specific field with your own React component:

```tsx
import { AdminUI } from '@dyrected/admin'
import { MyMapPicker } from './components/MyMapPicker'
import { MyColorPicker } from './components/MyColorPicker'

<AdminUI
  baseUrl="..."
  apiKey="..."
  components={{
    fields: {
      // Replace ALL fields of type 'json' with your component
      json: MyCodeEditor,
      // Or target a specific field by name (takes precedence over type)
      'products.locationCoords': MyMapPicker,
      'settings.brandColor': MyColorPicker,
    }
  }}
/>
```

### Custom Component Props

Your component receives:

| Prop | Type | Description |
|---|---|---|
| `value` | `any` | The current field value. |
| `onChange` | `(value: any) => void` | Callback to update the value. |
| `field` | `FieldSchema` | The full field definition from your config. |
| `readOnly` | `boolean` | Whether the field should be non-editable. |

---

## Field Type → Admin Component Mapping

| Field Type | Admin Component | Notes |
|---|---|---|
| `text` | Text input | |
| `textarea` | Textarea | Auto-expanding |
| `richText` | Tiptap editor | Block-based, floating toolbar |
| `number` | Number input | |
| `boolean` | Toggle switch | |
| `date` | Calendar picker | |
| `select` | Dropdown | |
| `multiSelect` | Tag-based multi-select | |
| `email` | Email input | Client-side format validation |
| `url` | URL input | With "Open in new tab" button |
| `relationship` | Searchable combobox | Thumbnail grid for upload collections |
| `array` | Repeatable card list | Drag-to-reorder |
| `object` | Grouped field panel | Collapsible |
| `json` | Code editor | JSON syntax highlighting |
| `blocks` | Block picker + inline editor | One editor per block type |
