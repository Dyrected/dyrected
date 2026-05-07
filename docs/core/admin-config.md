---
title: Admin UI Configuration
description: Complete reference for all admin.* options on collections, globals, and fields that control the Dyrected Admin dashboard.
---

The `admin` object on a `CollectionConfig`, `GlobalConfig`, or `Field` configures how that item appears and behaves in the Admin UI. These options have **no effect** on the API or database — they are purely presentation and UX controls.

---

## Collection `admin` Options

```ts
export const Posts = defineCollection({
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'author', 'publishedAt'],
    group: 'Blog',
    hidden: false,
    previewUrl: (doc) => `https://mysite.com/posts/${doc.slug}`,
    previewMode: 'postMessage',
  },
  fields: [...],
})
```

| Property | Type | Default | Description |
|---|---|---|---|
| `useAsTitle` | `string` | `'id'` | The field name used as the document title throughout the Admin UI — in the list table, breadcrumb, and relationship pickers. |
| `defaultColumns` | `string[]` | First 3 non-hidden fields | The ordered list of field names to display as columns in the list table. If omitted, the first three visible fields are shown. |
| `group` | `string` | none | Groups this collection under a labelled section in the sidebar. Collections with the same `group` string are collapsed together. |
| `hidden` | `boolean` | `false` | Hides the collection from the sidebar entirely. The API routes still exist; only the Admin UI navigation link is removed. |
| `previewUrl` | `string \| (doc, { locale }) => string` | none | Enables the Live Preview panel on the edit page. Provide a static URL string or a function that receives the current document and returns a URL. |
| `previewMode` | `'postMessage' \| 'token'` | `'postMessage'` | How the Admin UI communicates draft data to the preview iframe. `postMessage` requires no server round-trip and works for same-origin or CORS-enabled frontends. `token` issues a signed preview token stored in Redis, suitable for statically generated sites. |

### `useAsTitle`

The field referenced by `useAsTitle` is used in:

- The **list table** first column (document title link)
- The **breadcrumb** in the edit page header
- The **relationship picker** label when this collection is related to another

```ts
// Collection: products
admin: { useAsTitle: 'name' }

// In a relationship picker for products, each option shows item.name instead of item.id
```

### `defaultColumns`

Controls exactly which fields appear as columns in the list view and in what order.

```ts
admin: {
  defaultColumns: ['title', 'status', 'author', 'publishedAt'],
}
```

Fields not in this list are still accessible in the Edit form — they simply don't appear as list columns. If a field name in `defaultColumns` does not exist in `fields`, it is silently ignored.

### `group`

```ts
// These two collections will be grouped together under "Content" in the sidebar
export const Posts = defineCollection({ slug: 'posts', admin: { group: 'Content' }, ... })
export const Pages = defineCollection({ slug: 'pages', admin: { group: 'Content' }, ... })

// This collection appears under "Users" 
export const Members = defineCollection({ slug: 'members', admin: { group: 'Users' }, ... })
```

Collections with no `group` are listed at the top of the sidebar ungrouped.

### `previewUrl`

When set, the Edit page renders a split-pane layout: the form on the left, a live preview iframe on the right.

```ts
// Static URL
admin: { previewUrl: 'https://mysite.com/api/preview' }

// Dynamic URL based on document fields
admin: {
  previewUrl: (doc, { locale }) => {
    if (!doc?.slug) return null
    const base = process.env.NEXT_PUBLIC_SITE_URL
    return `${base}/posts/${doc.slug}?preview=true`
  }
}
```

If `previewUrl` returns `null` or `undefined`, the preview pane is hidden.

---

## Global `admin` Options

```ts
export const SiteSettings = defineGlobal({
  slug: 'site-settings',
  admin: {
    group: 'Configuration',
    hidden: false,
  },
  fields: [...],
})
```

| Property | Type | Default | Description |
|---|---|---|---|
| `group` | `string` | none | Same as collections — groups this global under a labelled sidebar section. |
| `hidden` | `boolean` | `false` | Hides the global from the sidebar. |

---

## Field `admin` Options

```ts
{
  name: 'internalNotes',
  type: 'textarea',
  admin: {
    placeholder: 'Internal use only...',
    description: 'Never shown publicly. Only visible to admin users.',
    readOnly: false,
    hidden: false,
    condition: (data) => data.status === 'published',
  }
}
```

| Property | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | `'Enter {label}...'` | Placeholder text shown inside the input when empty. |
| `description` | `string` | none | Help text rendered directly below the field. Use for formatting hints or data requirements. |
| `readOnly` | `boolean` | `false` | Renders the field disabled. The value is included in the form submission but cannot be edited. |
| `hidden` | `boolean` | `false` | Hides the field from the form entirely. The value is preserved in the database — it just cannot be edited via the Admin UI. |
| `condition` | `(data: any) => boolean` | always shown | A function evaluated reactively against the current document values. Return `true` to show the field, `false` to hide it. |

### `condition` — Conditional Fields

Use `condition` to show or hide a field based on the values of *other* fields in the same document.

```ts
// Only show 'scheduledAt' when status is 'scheduled'
{
  name: 'scheduledAt',
  type: 'date',
  admin: {
    condition: (data) => data.status === 'scheduled',
  }
}

// Only show 'discountPercent' when 'hasDiscount' is true
{
  name: 'discountPercent',
  type: 'number',
  admin: {
    condition: (data) => data.hasDiscount === true,
  }
}

// Only show 'externalUrl' when contentType is 'link'
{
  name: 'externalUrl',
  type: 'url',
  admin: {
    condition: (data) => data.contentType === 'link',
  }
}
```

The `data` argument is the **current live values of the entire document** as the editor is typing — not the saved version. The condition is re-evaluated on every keystroke.

> **Important:** `condition` only hides the field in the UI. The field is **not** removed from Zod validation or from the API. If you need the field to truly be absent from saves, combine `condition` with `access.update`.

---

## Top-Level `admin` Config (on `defineConfig`)

In addition to per-collection and per-field options, you can configure global Admin UI branding at the top level:

```ts
export default defineConfig({
  collections: [...],
  globals: [...],
  admin: {
    branding: {
      logo: '/logo.svg',          // Path to your logo (shown in sidebar header)
      logoMark: '/logomark.svg',  // Compact mark shown when sidebar is collapsed
      primaryColor: '#6366f1',    // Accent color (overrides the default indigo)
      favicon: '/favicon.ico',
    },
    meta: {
      titleSuffix: '— My CMS',    // Appended to the browser tab title on every page
    },
  },
})
```

| Property | Type | Description |
|---|---|---|
| `branding.logo` | `string` | URL or path to the logo shown in the sidebar header. |
| `branding.logoMark` | `string` | Compact mark used when sidebar is collapsed to icon-only mode. |
| `branding.primaryColor` | `string` | Hex color used for primary buttons, active states, and focus rings. |
| `branding.favicon` | `string` | URL or path to the favicon served by the admin. |
| `meta.titleSuffix` | `string` | Appended to the `<title>` tag on every admin page. |

---

## Sidebar Rendering Logic

The sidebar is built dynamically from your config at runtime, following this order:

1. **Grouped collections** — Collections with an `admin.group` are listed inside a collapsible section labelled with the group name.
2. **Ungrouped collections** — Collections without `admin.group` are listed at the top level.
3. **Media** — Upload-enabled collections (`upload: true`) automatically get a camera icon and appear in a dedicated "Media" section.
4. **Globals** — Listed below collections, also respecting `admin.group`.
5. **Hidden items** — Collections or globals with `admin.hidden: true` are excluded entirely.

The order within each group matches the order they appear in your `collections` / `globals` array in `defineConfig`.

---

## Access Flags in the Admin UI

When a user is authenticated, the Admin UI resolves access functions against the current user and reflects the outcome:

| Resolved Access | Admin UI Behaviour |
|---|---|
| `access.read === false` | Collection is hidden from the sidebar and returns a 403 if navigated to directly |
| `access.create === false` | "Create" button is hidden on the list page |
| `access.update === false` | Edit form renders in read-only mode; "Save" button is hidden |
| `access.delete === false` | "Delete" action is hidden from the row action menu |
| `field.access.read === false` | Field is removed from the form entirely |
| `field.access.update === false` | Field is rendered as `readOnly` |

Access is resolved **server-side** via the `/api/schemas` response, which includes computed access booleans for the authenticated user. The Admin UI never re-implements access logic — it only reads and reflects what the server returns.
