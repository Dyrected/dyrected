---
title: Globals & Site Settings
description: Use globals to manage singleton content like site settings, navigation, and footer links.
---

Globals are for content that only has one instance — your site name, navigation menu, SEO defaults, footer links, announcement banners. Unlike collections, a global has no list view; editors just open it and edit the single document.

---

## 1. Define a global

```ts
// dyrected.config.ts
export default defineConfig({
  globals: [
    {
      slug: 'site-settings',
      label: 'Site Settings',
      fields: [
        { name: 'siteName',    type: 'text',     required: true },
        { name: 'tagline',     type: 'text' },
        { name: 'logo',        type: 'relationship', relationTo: 'media' },
        { name: 'favicon',     type: 'relationship', relationTo: 'media' },
        { name: 'seoDefault',  type: 'object', fields: [
          { name: 'title',       type: 'text' },
          { name: 'description', type: 'textarea' },
          { name: 'ogImage',     type: 'relationship', relationTo: 'media' },
        ]},
      ],
    },
  ],
})
```

---

## 2. Add a navigation global

```ts
{
  slug: 'navigation',
  label: 'Navigation',
  fields: [
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url',   type: 'text', required: true },
        {
          name: 'children',
          type: 'array',
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'url',   type: 'text', required: true },
          ],
        },
      ],
    },
  ],
}
```

---

## 3. Fetch a global

Globals use a dedicated endpoint: `GET /api/globals/:slug`

```ts
// app/layout.tsx (Next.js server component)
async function getSiteSettings() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_DYRECTED_URL}/globals/site-settings?depth=1`,
    {
      headers: { 'x-api-key': process.env.DYRECTED_API_KEY! },
      next: { revalidate: 3600 }, // cache for 1 hour
    }
  )
  return res.json()
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()

  return (
    <html lang="en">
      <head>
        <title>{settings.siteName}</title>
        {settings.favicon && <link rel="icon" href={settings.favicon.url} />}
      </head>
      <body>
        <header>
          {settings.logo && <img src={settings.logo.url} alt={settings.siteName} />}
        </header>
        {children}
      </body>
    </html>
  )
}
```

---

## 4. Fetch with the SDK

```ts
const settings = await client.global('site-settings').get({ depth: 1 })
const nav = await client.global('navigation').get()
```

---

## 5. Update a global via the API

```bash
PATCH /api/globals/site-settings
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "siteName": "My Updated Site Name" }
```

You can also update globals programmatically in hooks — for example, to track the last published date:

```ts
// In a collection's afterChange hook
afterChange: [
  async ({ doc, operation }) => {
    if (doc.status === 'published') {
      await fetch(`${process.env.NEXT_PUBLIC_DYRECTED_URL}/globals/site-settings`, {
        method: 'PATCH',
        headers: {
          'x-api-key': process.env.DYRECTED_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lastPublishedAt: new Date().toISOString() }),
      })
    }
  }
]
```

---

## 6. Revalidate on change

Use an `afterChange` hook on the global to revalidate your layout:

```ts
{
  slug: 'site-settings',
  hooks: {
    afterChange: [
      async () => {
        // Next.js ISR revalidation
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate`, {
          method: 'POST',
          headers: { 'x-revalidate-secret': process.env.REVALIDATE_SECRET! },
          body: JSON.stringify({ path: '/' }),
        })
      },
    ],
  },
  fields: [...],
}
```

---

## Common globals to define

| Slug | What it holds |
|---|---|
| `site-settings` | Site name, logo, favicon, SEO defaults |
| `navigation` | Header nav items with optional dropdowns |
| `footer` | Footer columns, social links, legal copy |
| `announcement` | Banner message, enabled toggle, CTA link |
| `theme` | Accent colour, font choice, dark mode default |
