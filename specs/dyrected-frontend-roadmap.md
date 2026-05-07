# Dyrected Frontend Roadmap

This document covers all outstanding frontend work needed across the Dyrected ecosystem:
- Admin UI improvements and config parity
- Live Preview system
- Relationship & Media display
- Role-Based Access Control enforcement in the UI
- React and Vue composables/hooks for live preview

---

## 1. Admin UI — Config Parity Gaps

The Admin UI (`@dyrected/admin`) must fully reflect every option in `CollectionConfig` and `GlobalConfig`. Currently many config keys are read but not rendered.

### 1.1 Collection-Level Config Properties Not Yet Wired

| Config Property | Current State | Required Admin Behavior |
|---|---|---|
| `labels.singular / plural` | Partially used | Use `plural` in list heading; `singular` in Create button and breadcrumb |
| `admin.group` | Not used | Group sidebar links under the `group` label with a collapsible section |
| `admin.hidden` | Not enforced | Hide collection from sidebar and refuse navigation to its routes |
| `admin.useAsTitle` | Used in search key only | Use as the primary display column in list table and as the document title in edit header |
| `admin.defaultColumns` | Partially used | Respect the ordered column list exactly; show a column picker UI to override |
| `auth: true` | Not reflected | Show a "Login" badge on the collection card; suppress Create button if access denied |
| `upload: true / UploadConfig` | Switches to MediaPage | Show allowed MIME types as a hint in the upload dropzone; enforce `maxFileSize` client-side |
| `access.*` | Not enforced | Hide Create/Edit/Delete buttons when the user's role would be denied (see §4) |
| `hooks.*` | N/A in UI | No UI change needed; hooks run server-side |
| `shared: true` | Not surfaced | Show a "Shared" badge; explain it appears across all sites |

### 1.2 Field-Level Config Properties Not Yet Wired

| Field Property | Current State | Required Admin Behavior |
|---|---|---|
| `label` | Used | — (already correct) |
| `required` | Used via Zod | Show red asterisk on label |
| `unique` | Ignored | Show a "unique" badge on the field label |
| `defaultValue` | Used in buildDefaultValues | — |
| `options` (string[]) | Not handled | Normalise to `{ label, value }[]` before passing to Select/MultiSelect |
| `admin.placeholder` | Used | — |
| `admin.description` | Used | — |
| `admin.hidden` | Used | — |
| `admin.readOnly` | Used | — |
| `admin.condition` | **Not implemented** | Evaluate `condition(watchedValues)` on every form change; hide/show field dynamically |
| `access.read` | **Not enforced** | Strip field from form if `read` returns false for current user |
| `access.update` | **Not enforced** | Set field `readOnly` if `update` returns false |

### 1.3 Global-Level Config Properties Not Yet Wired

| Config Property | Current State | Required Admin Behavior |
|---|---|---|
| `label` | Used | — |
| `admin.group` | Not used | Same grouping logic as collections |
| `admin.hidden` | Not used | Hide from sidebar |
| `access.read` | Not enforced | Show 403 state if denied |
| `access.update` | Not enforced | Disable Save button if denied |

---

## 2. Relationship Display — Current Problems & Fix Plan

### 2.1 Current Problems

**In the List Table (`list-page.tsx`):**
- Relationship field values arrive as raw IDs (strings) when `depth=0` or when the cell renderer doesn't know the field type.
- The generic cell renderer calls `String(value ?? "-")` — an ID like `"abc123"` is shown raw.
- Media relationships are rendered as an `<img>` tag only for `field.type === "image"`, but the standard media relationship type is `"relationship"`.

**In the Relationship Picker (`relationship-picker.tsx`):**
- Display label fallback is `item.title || item.name || item.slug || item.id` — does not respect `admin.useAsTitle` from the related collection's schema.
- No thumbnail for media relationships — it shows the title text even if the related collection is an upload collection.
- Single-value only — no support for `string[]` multi-relationship values.
- Loads all 100 items at once — no search debounce against the API.

**In the Media Picker (`media-picker.tsx`):**
- Matches by `filename` instead of `id` — `value === item.filename` — inconsistent with how relationships are stored.
- Preview URL is hand-assembled: `` `${client.getBaseUrl()}/media/${filename}` `` — breaks for S3/Cloudinary where `item.url` is already the full absolute URL.
- Grid does not show filename or file size.
- No upload-from-picker capability.

### 2.2 Fixes Required

#### 2.2.1 `RelationshipPicker` Upgrades

```tsx
// Determine title field from the related collection schema
const relatedSchema = schemas?.collections.find(c => c.slug === relationTo)
const titleField = relatedSchema?.admin?.useAsTitle || 'title'

const getDisplayLabel = (item: any) =>
  item[titleField] || item.title || item.name || item.slug || item.id

// Media thumbnail: if the related collection has upload:true, show a thumbnail
const isMediaCollection = !!relatedSchema?.upload
```

Add props:
- `multiple?: boolean` — when true, value is `string[]` and renders tags.
- `searchQuery` state with a 300 ms debounce that passes `?where[title][like]=...` to the API.

#### 2.2.2 `MediaPicker` Upgrades

- Store and match by `item.id`, not `item.filename`.
- Use `item.url` for the preview image (already populated by the storage adapter).
- Add drag-and-drop upload zone inside the picker dialog so editors can upload without leaving the form.
- Show filename and file size below each thumbnail.

#### 2.2.3 List Table Relationship Cells

In `list-page.tsx`, fetch with `depth=1` so relationships arrive populated, then add a type-aware cell renderer:

```tsx
if (field.type === 'relationship') {
  const relatedSchema = schemas?.collections.find(c => c.slug === field.relationTo)
  const titleField = relatedSchema?.admin?.useAsTitle || 'title'
  const isMedia = !!relatedSchema?.upload

  if (isMedia && typeof value === 'object') {
    return <img src={value.url} className="h-8 w-8 rounded object-cover" alt={value.alt || ''} />
  }
  if (typeof value === 'object') {
    return <span>{value[titleField] || value.id}</span>
  }
  // Fallback: raw ID
  return <span className="font-mono text-xs text-muted-foreground">{value}</span>
}
```

---

## 3. Live Preview System

Live Preview lets editors see how content looks on their frontend *before* saving. The admin sends the current (unsaved) form state to the frontend via `postMessage` or a preview URL with a token.

### 3.1 Architecture

```
Editor (Admin UI)
  │  watches form.watch()
  │  serialises current form values
  │
  ├─ [iframe mode] postMessage(data, previewOrigin)
  │
  └─ [URL mode] navigates iframe to /preview?token=<jwt>
                  (token stored in Redis, fetched by frontend)

Frontend (Next.js / Nuxt)
  │
  ├─ [iframe mode] window.addEventListener('message', handler)
  │   merges received data into local state, re-renders
  │
  └─ [URL mode] fetches /api/preview-data?token=<jwt>
                  gets the draft data, renders
```

### 3.2 Backend: Preview Token Endpoint

Add to the core router:

```
POST /api/preview-token
Body: { collectionSlug, documentId?, data }
Headers: x-api-key (required)
Response: { token: string, expiresAt: string }
```

The token is a signed JWT (`JWT_SECRET`) with a 15-minute TTL, stored in Redis. The payload contains `{ collectionSlug, documentId, data }`.

```
GET /api/preview-data?token=<jwt>
Response: { collectionSlug, documentId, data }
```

This endpoint is **public** (no API key) so the frontend iframe can fetch it cross-origin.

### 3.3 Admin UI: Live Preview Panel

In `edit-page.tsx`, add a toggle in the sidebar:

- **Preview URL** field in collection config: `admin.previewUrl: string | ((doc) => string)`.
- When set, the Edit page shows a split-pane layout with the form on the left and an iframe on the right.
- `useEffect` subscribes to `form.watch()` and debounces 400 ms before sending the message.

```tsx
// packages/admin/src/components/live-preview/LivePreviewPane.tsx
interface LivePreviewPaneProps {
  previewUrl: string
  formValues: any
  mode: 'postMessage' | 'token'
}
```

Add `admin.previewUrl` and `admin.previewMode` to `CollectionConfig`:

```ts
admin?: {
  useAsTitle?: string
  defaultColumns?: string[]
  group?: string
  hidden?: boolean
  previewUrl?: string | ((doc: any, { locale }: { locale?: string }) => string)
  previewMode?: 'postMessage' | 'token'  // default: 'postMessage'
}
```

### 3.4 React Hook: `useLivePreview`

Package: `@dyrected/react` (new package, or added to `@dyrected/sdk`)

```ts
// packages/react/src/useLivePreview.ts
import { useState, useEffect } from 'react'

interface UseLivePreviewOptions<T> {
  initialData: T
  serverURL: string   // The admin URL (origin for postMessage validation)
  depth?: number
}

export function useLivePreview<T = any>(options: UseLivePreviewOptions<T>) {
  const { initialData, serverURL } = options
  const [data, setData] = useState<T>(initialData)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== serverURL) return
      if (event.data?.type === 'dyrected-live-preview') {
        setData(event.data.data)
        setIsLive(true)
      }
    }
    window.addEventListener('message', handler)
    // Signal readiness to parent
    window.parent?.postMessage({ type: 'dyrected-preview-ready' }, serverURL)
    return () => window.removeEventListener('message', handler)
  }, [serverURL])

  return { data, isLive }
}
```

**Usage in a Next.js page:**

```tsx
// app/posts/[slug]/page.tsx (client component for preview)
'use client'
import { useLivePreview } from '@dyrected/react'

export default function PostPreview({ initialPost }: { initialPost: Post }) {
  const { data: post, isLive } = useLivePreview({
    initialData: initialPost,
    serverURL: process.env.NEXT_PUBLIC_CMS_URL!,
  })

  return (
    <article>
      {isLive && <span className="preview-badge">Preview Mode</span>}
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  )
}
```

### 3.5 Vue Composable: `useLivePreview`

Package: Added to `@dyrected/nuxt` runtime composables.

```ts
// packages/nuxt/src/runtime/composables/useLivePreview.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useLivePreview<T>(options: {
  initialData: T
  serverURL: string
}) {
  const data = ref<T>(options.initialData)
  const isLive = ref(false)

  function handleMessage(event: MessageEvent) {
    if (event.origin !== options.serverURL) return
    if (event.data?.type === 'dyrected-live-preview') {
      data.value = event.data.data as T
      isLive.value = true
    }
  }

  onMounted(() => {
    window.addEventListener('message', handleMessage)
    window.parent?.postMessage({ type: 'dyrected-preview-ready' }, options.serverURL)
  })

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
  })

  return { data, isLive }
}
```

**Usage in a Nuxt page:**

```vue
<script setup lang="ts">
const { data: page, isLive } = useLivePreview({
  initialData: await useDyrectedDoc('pages', route.params.slug),
  serverURL: useRuntimeConfig().public.cmsUrl,
})
</script>

<template>
  <div>
    <span v-if="isLive" class="badge">Preview</span>
    <h1>{{ page.title }}</h1>
  </div>
</template>
```

Also expose `useLivePreview` in the `addImports` call in `module.ts`.

---

## 4. Role-Based Access Control in the Admin UI

Access functions run on the server; the Admin UI must **reflect** their outcome without re-implementing the logic. The approach is:

1. The `/api/schemas` endpoint is extended to include **resolved access** for the current user.
2. The Admin reads these flags and conditionally disables/hides UI elements.

### 4.1 Schema Endpoint Extension

Extend `GET /api/schemas` response to include access metadata when a user is authenticated:

```json
{
  "collections": [
    {
      "slug": "posts",
      "access": {
        "create": true,
        "read": true,
        "update": true,
        "delete": false
      },
      "fields": [
        {
          "name": "internalNotes",
          "type": "text",
          "access": {
            "read": false,
            "update": false
          }
        }
      ]
    }
  ]
}
```

In `router.ts`, call each access function with the current user from the request context and serialise the result:

```ts
const resolveAccess = async (fn: AccessFunction | undefined, args: any): Promise<boolean> => {
  if (!fn) return true
  const result = await fn(args)
  if (typeof result === 'boolean') return result
  // object result means "allowed with filter" — true for UI purposes
  return true
}
```

### 4.2 Admin UI: Access-Aware Components

**List Page:**
- Hide "Create" button if `access.create === false`.
- Hide "Delete" action in row menu if `access.delete === false`.
- Hide "Edit" link if `access.update === false`.

**Edit Page:**
- If `access.update === false`, render form in read-only mode (all fields disabled, "Save" button hidden, show "View Only" badge).
- Strip fields where `field.access.read === false` from the form entirely.
- Set `readOnly` on fields where `field.access.update === false`.

**Sidebar:**
- Hide collections where `admin.hidden === true`.
- Show a lock icon on collections where `access.read === true` but `access.create/update/delete === false`.

### 4.3 Access Context in Admin Provider

The `DyrectedProvider` needs to store the current user's resolved access. After login or on mount, fetch `/api/schemas` (which is already done) and extract access flags:

```ts
interface CollectionAccess {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
}

// In useDyrected hook
const getCollectionAccess = (slug: string): CollectionAccess => {
  const schema = schemas?.collections.find(c => c.slug === slug)
  return schema?.access ?? { create: true, read: true, update: true, delete: true }
}
```

---

## 5. Admin UI — General UX Improvements

### 5.1 List Page

- **Delete action is wired but not implemented** — add `useMutation` calling `client.collection(slug).delete(id)` with a confirmation dialog.
- **Pagination** — the DataTable currently loads one page; add `page` state and Previous/Next controls using `response.total` and `response.limit`.
- **Bulk actions** — row checkboxes + "Delete selected" / "Publish selected" toolbar.
- **Search** — pass `?where[<titleField>][like]=<query>` to the API; debounce 300 ms.
- **Empty state** — replace the implicit "no rows" with an illustrated empty state and a "Create first entry" CTA.

### 5.2 Edit Page

- **Unsaved changes guard** — detect `form.formState.isDirty` and show a browser `beforeunload` prompt.
- **Autosave draft** — optional; when `admin.autosave: true`, save to `localStorage` every 30 s and restore on reload.
- **Duplicate entry** — "Duplicate" button in the sidebar that clones the document (strips ID and timestamps).
- **Publish/Unpublish shortcut** — when the collection has a `status` field, add dedicated "Publish" and "Unpublish" buttons in the sidebar that patch only the `status` field (no full form submit).
- **Relationship display in sidebar** — show a "Referenced by" section listing documents that link to this entry.

### 5.3 Media Page

- **Grid view vs list view** toggle.
- **Drag-and-drop upload** — currently only the dialog has an upload button; the page itself should accept dropped files.
- **File details panel** — clicking a file shows a right-side panel with: URL (copyable), dimensions, filesize, alt text editor, usage count.
- **Folder / prefix filtering** — show a folder tree based on the `prefix` used during upload.
- **Bulk delete** with confirmation.

### 5.4 Global Editor Page

- Currently renders the form but has no "last saved" indicator.
- Add a "Saved at HH:MM" chip that updates after each successful mutation.
- Support `access.read/update` (see §4).

---

## 6. Implementation Order

| Priority | Item | Effort |
|---|---|---|
| P0 | Fix relationship cells in list table (§2.2.3) | S |
| P0 | Fix MediaPicker to use `item.id` and `item.url` (§2.2.2) | S |
| P0 | Wire Delete action in list-page row menu (§5.1) | S |
| P1 | RelationshipPicker: multi-value + useAsTitle + thumbnail (§2.2.1) | M |
| P1 | Field `admin.condition` evaluation (§1.2) | M |
| P1 | Schema endpoint resolved access + Admin UI RBAC (§4) | L |
| P1 | Live Preview — postMessage mode + `useLivePreview` hooks (§3) | L |
| P2 | List page pagination + search (§5.1) | M |
| P2 | Edit page unsaved-changes guard + publish shortcut (§5.2) | M |
| P2 | Admin sidebar grouping by `admin.group` (§1.1) | S |
| P2 | Media page drag-and-drop + file details panel (§5.3) | M |
| P3 | Live Preview — token mode + backend endpoint (§3.2) | L |
| P3 | Bulk operations in list table (§5.1) | M |
| P3 | Autosave draft (§5.2) | M |

---

## 7. New / Modified Files Summary

### `@dyrected/core`

- `src/router.ts` — Extend `/api/schemas` to resolve and return access flags per user.
- `src/router.ts` — Add `POST /api/preview-token` and `GET /api/preview-data` endpoints.
- `src/types/index.ts` — Add `admin.previewUrl`, `admin.previewMode` to `CollectionConfig`.

### `@dyrected/admin`

- `src/components/forms/relationship-picker.tsx` — Multi-value, useAsTitle, thumbnail, search debounce.
- `src/components/forms/media-picker.tsx` — Match by ID, use `item.url`, add upload zone.
- `src/components/live-preview/LivePreviewPane.tsx` — **[NEW]** Split-pane iframe wrapper.
- `src/pages/collections/list-page.tsx` — Relationship-aware cells, delete action, pagination, RBAC.
- `src/pages/collections/edit-page.tsx` — Unsaved guard, publish shortcut, live preview split pane, RBAC.
- `src/pages/media/media-page.tsx` — Drag-drop, file detail panel, grid/list toggle.
- `src/providers/dyrected-provider.tsx` — Expose resolved access helpers from schema.
- `src/components/layout/admin-shell.tsx` — Sidebar grouping, hidden flag, lock icons.

### `@dyrected/react` (new package or added to SDK)

- `src/useLivePreview.ts` — **[NEW]** React hook for live preview `postMessage` integration.

### `@dyrected/nuxt`

- `src/runtime/composables/useLivePreview.ts` — **[NEW]** Vue composable for live preview.
- `src/module.ts` — Register `useLivePreview` in `addImports`.
