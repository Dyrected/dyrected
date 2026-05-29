import { defineCollection, defineGlobal, type InferDocShape, type Field } from '../index.js'

// Test 1: field hook `value` is typed per field type — no annotations needed
const Posts = defineCollection({
  slug: 'posts',
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      hooks: {
        beforeChange: [({ value }) => value.toLowerCase()],     // value: string ✓
        afterRead: [({ value }) => value.trim()],               // value: string ✓
      },
    },
    {
      name: 'views',
      type: 'number',
      hooks: {
        beforeChange: [({ value }) => Math.max(0, value)],      // value: number ✓
      },
    },
    {
      name: 'active',
      type: 'boolean',
      hooks: {
        afterRead: [({ value }) => value ?? false],              // value: boolean ✓
      },
    },
    {
      name: 'tags',
      type: 'multiSelect',
      hooks: {
        beforeChange: [({ value }) => value.map(t => t.toUpperCase())], // value: string[] ✓
      },
    },
  ],
  hooks: {
    beforeChange: [({ data }) => {
      const _slug: string = data.slug!     // doc shape inferred from fields ✓
      const _views: number | undefined = data.views
      void _slug; void _views
      return data
    }],
    afterChange: [({ doc }) => {
      const _id: string = doc.id           // id added automatically for collections ✓
      const _slug: string = doc.slug
      void _id; void _slug
    }],
  },
})

// Test 2: explicit interface still works
interface Post { id: string; title: string; status: 'draft' | 'published' }
const Posts2 = defineCollection<Post>({
  slug: 'posts2',
  fields: [{ name: 'title', type: 'text' }],
  hooks: {
    beforeChange: [({ data }) => {
      const _status: 'draft' | 'published' | undefined = data.status
      void _status
      return data
    }],
  },
})

// Test 3: global — inferred, no id
const Settings = defineGlobal({
  slug: 'settings',
  fields: [
    { name: 'siteName', type: 'text', required: true },
    { name: 'maintenance', type: 'boolean' },
  ],
  hooks: {
    afterChange: [({ doc }) => {
      const _name: string = doc.siteName          // required → string ✓
      const _maint: boolean | undefined = doc.maintenance  // optional → boolean | undefined ✓
      void _name; void _maint
    }],
  },
})

// Test 4: InferDocShape utility
const fields = [
  { name: 'title', type: 'text', required: true },
  { name: 'tags', type: 'multiSelect' },
] satisfies Field[]
type _Doc = InferDocShape<typeof fields>
// → { title: string; tags?: string[] }

export { Posts, Posts2, Settings }
