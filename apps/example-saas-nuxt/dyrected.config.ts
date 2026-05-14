import { defineCollection, defineGlobal, defineConfig } from '@dyrected/core'
import { sqliteAdapter } from '@dyrected/db-sqlite'
import { localAdapter } from '@dyrected/storage-local'

// ── Collections ──────────────────────────────────────────────────────────

const media = defineCollection({
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  upload: true,
  fields: [
    { name: 'alt', type: 'text' },
  ],
})

const pages = defineCollection({
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'content', type: 'richText' },
    { name: 'featuredImage', type: 'relationship', relationTo: 'media' },
  ],
})

const posts = defineCollection({
  slug: 'posts',
  labels: { singular: 'Post', plural: 'Posts' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'richText' },
    { name: 'featuredImage', type: 'relationship', relationTo: 'media' },
  ],
})

// ── Globals ───────────────────────────────────────────────────────────────

const navigation = defineGlobal({
  slug: 'navigation',
  label: 'Navigation',
  fields: [
    {
      name: 'menuItems',
      type: 'array',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'link', type: 'relationship', relationTo: 'pages' },
      ],
    },
  ],
})

const settings = defineGlobal({
  slug: 'settings',
  label: 'Site Settings',
  fields: [
    { name: 'siteName', type: 'text' },
    { name: 'logo', type: 'relationship', relationTo: 'media' },
    { name: 'footerText', type: 'textarea' },
  ],
})

// ── Config ────────────────────────────────────────────────────────────────

export default defineConfig({
  collections: [media, pages, posts],
  globals: [navigation, settings],
  db: sqliteAdapter({ filename: './data.db' }),
  storage: localAdapter({ directory: './public/uploads', serveFrom: '/uploads' }),
})
