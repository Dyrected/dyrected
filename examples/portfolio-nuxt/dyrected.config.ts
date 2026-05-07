import { defineCollection, defineConfig, defineGlobal } from '@dyrected/core'

const media = defineCollection({
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  upload: true,
  fields: [
    { name: 'alt', type: 'text' }
  ]
})

const pages = defineCollection({
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'content', type: 'richText' },
    { name: 'featuredImage', type: 'relationship', collection: 'media' }
  ]
})

const posts = defineCollection({
  slug: 'posts',
  labels: { singular: 'Post', plural: 'Posts' },
  upload: true,
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'richText' }
  ]
})

const comments = defineCollection({
  slug: 'comments',
  labels: { singular: 'Comment', plural: 'Comments' },
  fields: [
    { name: 'author', type: 'text', required: true },
    { name: 'text', type: 'textarea', required: true },
    { name: 'postSlug', type: 'text', required: true },
    { name: 'createdAt', type: 'date' }
  ],
  admin: {
    useAsTitle: 'author',
    group: 'Content'
  }
})

const inquiries = defineCollection({
  slug: 'inquiries',
  labels: { singular: 'Inquiry/Prayer Request', plural: 'Inquiries' },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'type', type: 'select', options: [{ label: 'Prayer Request', value: 'prayer' }, { label: 'General Inquiry', value: 'general' }] },
    { name: 'message', type: 'textarea', required: true },
    { name: 'createdAt', type: 'date' }
  ],
  admin: {
    useAsTitle: 'name',
    group: 'Content'
  }
})

const navigation = defineGlobal({
  slug: 'navigation',
  label: 'Navigation',
  fields: [
    { 
      name: 'menuItems', 
      type: 'array', 
      fields: [
        { name: 'label', type: 'text' },
        { name: 'link', type: 'relationship', collection: 'pages' }
      ]
    }
  ]
})

const settings = defineGlobal({
  slug: 'settings',
  label: 'Site Settings',
  fields: [
    { name: 'siteName', type: 'text' },
    { name: 'logo', type: 'relationship', collection: 'media' },
    { name: 'footerText', type: 'textarea' }
  ]
})

export default defineConfig({
  collections: [media, pages, posts, comments, inquiries],
  globals: [navigation, settings]
})
