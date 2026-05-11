---
title: Building a Page Builder
description: Use the blocks field to let editors assemble pages from reusable content blocks.
---

The `blocks` field lets editors pick from a defined set of block types and arrange them in any order — a hero, then a rich text section, then a call-to-action. This guide builds a `pages` collection with three block types and renders them in Next.js.

---

## 1. Define your blocks

Each block has a `slug` and its own set of fields:

```ts
// dyrected.config.ts
import { defineConfig } from '@dyrected/core'

const HeroBlock = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    { name: 'heading',    type: 'text',         required: true },
    { name: 'subheading', type: 'textarea' },
    { name: 'image',      type: 'relationship', relationTo: 'media' },
    { name: 'ctaLabel',   type: 'text' },
    { name: 'ctaUrl',     type: 'url' },
  ],
}

const RichTextBlock = {
  slug: 'richText',
  labels: { singular: 'Rich Text', plural: 'Rich Text Blocks' },
  fields: [
    { name: 'content', type: 'richtext', required: true },
  ],
}

const CallToActionBlock = {
  slug: 'callToAction',
  labels: { singular: 'Call to Action', plural: 'Calls to Action' },
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'body',    type: 'textarea' },
    { name: 'label',   type: 'text', required: true },
    { name: 'url',     type: 'url',  required: true },
    { name: 'variant', type: 'select', options: ['primary', 'secondary'], defaultValue: 'primary' },
  ],
}
```

---

## 2. Add the blocks field to a pages collection

```ts
export default defineConfig({
  collections: [
    {
      slug: 'pages',
      access: { read: () => true },
      fields: [
        { name: 'title',  type: 'text', required: true },
        { name: 'slug',   type: 'text', required: true },
        {
          name: 'layout',
          type: 'blocks',
          blocks: [HeroBlock, RichTextBlock, CallToActionBlock],
        },
      ],
    },
  ],
})
```

---

## 3. What the API returns

Each item in `layout` includes a `blockType` matching the block's `slug`:

```json
{
  "title": "Home",
  "slug": "home",
  "layout": [
    {
      "blockType": "hero",
      "heading": "Ship content faster",
      "subheading": "The CMS that lives in your codebase.",
      "ctaLabel": "Get started",
      "ctaUrl": "/docs"
    },
    {
      "blockType": "richText",
      "content": { ... }
    },
    {
      "blockType": "callToAction",
      "heading": "Ready to build?",
      "label": "Start free",
      "url": "https://app.dyrected.com",
      "variant": "primary"
    }
  ]
}
```

---

## 4. Fetch and render in Next.js

```ts
// app/[slug]/page.tsx
async function getPage(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_DYRECTED_URL}/collections/pages?where[slug][equals]=${slug}&depth=1`,
    { headers: { 'x-api-key': process.env.DYRECTED_API_KEY! } }
  )
  const { docs } = await res.json()
  return docs[0] ?? null
}

export default async function Page({ params }: { params: { slug: string } }) {
  const page = await getPage(params.slug)
  if (!page) notFound()

  return (
    <main>
      {page.layout.map((block: any, i: number) => (
        <Block key={i} block={block} />
      ))}
    </main>
  )
}
```

---

## 5. The block renderer

Switch on `blockType` to render each block with its own component:

```tsx
// components/Block.tsx
import { Hero } from './blocks/Hero'
import { RichText } from './blocks/RichText'
import { CallToAction } from './blocks/CallToAction'

export function Block({ block }: { block: any }) {
  switch (block.blockType) {
    case 'hero':        return <Hero {...block} />
    case 'richText':    return <RichText {...block} />
    case 'callToAction': return <CallToAction {...block} />
    default:            return null
  }
}
```

```tsx
// components/blocks/Hero.tsx
export function Hero({ heading, subheading, ctaLabel, ctaUrl, image }: any) {
  return (
    <section className="py-24 text-center">
      {image && <img src={image.url} alt={image.alt} className="mx-auto mb-8" />}
      <h1 className="text-5xl font-bold">{heading}</h1>
      {subheading && <p className="mt-4 text-xl text-muted">{subheading}</p>}
      {ctaLabel && ctaUrl && (
        <a href={ctaUrl} className="mt-8 inline-block rounded-md bg-black px-6 py-3 text-white">
          {ctaLabel}
        </a>
      )}
    </section>
  )
}
```

---

## 6. Generate static paths

```ts
export async function generateStaticParams() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_DYRECTED_URL}/collections/pages?limit=100`, {
    headers: { 'x-api-key': process.env.DYRECTED_API_KEY! },
  })
  const { docs } = await res.json()
  return docs.map((page: any) => ({ slug: page.slug }))
}
```

---

## Adding new block types

Define a new block object, add it to the `blocks` array, create its renderer component, and add a case to the `Block` switch. The Admin UI picks up new block types automatically — no other changes needed.
