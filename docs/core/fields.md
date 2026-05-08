---
title: Field Types
description: Complete reference for every field type available in Dyrected, including all properties, validation rules, and Admin UI behaviour.
---

Every field in a collection or global is defined by a `Field` object. All fields share a common set of base properties, and individual types add their own.

---

## Base Properties (All Fields)

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | The key used in the database and JSON responses. Use camelCase. |
| `type` | `FieldType` | ✅ | The field type (see below). |
| `label` | `string` | | Display name in the Admin UI. Defaults to a title-cased version of `name`. |
| `required` | `boolean` | | If `true`, the field must have a non-empty value. Enforced on both client and server. |
| `unique` | `boolean` | | If `true`, the database adapter enforces a unique constraint for this field across the collection. |
| `defaultValue` | `any` | | The initial value for new documents. Type must match the field type. |
| `admin` | `object` | | UI-specific options. See [Admin Field Options](#admin-field-options). |
| `access` | `object` | | Field-level read/update permissions. See [Field Access](#field-access). |
| `hooks` | `object` | | Field-level lifecycle hooks. See [Field Hooks](#field-hooks). |

> [!NOTE]
> **Admin UI Indicators:** Fields marked as `required: true` will display a red asterisk (`*`) next to their label. Fields marked as `unique: true` will display a blue "Unique" badge to alert editors about data constraints.

---

## Text Fields

### `text`

A single-line text input.

```ts
{
  name: 'title',
  type: 'text',
  required: true,
  unique: true,
  admin: {
    placeholder: 'Enter a title...',
    description: 'Used as the page heading and browser tab title.',
  }
}
```

- **Stored as:** `VARCHAR` (SQL) / `string` (MongoDB)
- **API returns:** `string`
- **Admin UI:** `<input type="text" />`

---

### `textarea`

A multi-line text input. Use for descriptions, excerpts, or any plain text longer than a sentence.

```ts
{
  name: 'excerpt',
  type: 'textarea',
  admin: {
    placeholder: 'Short summary of the post...',
    description: 'Shown in list cards. Keep under 160 characters.',
  }
}
```

- **Stored as:** `TEXT` (SQL) / `string` (MongoDB)
- **API returns:** `string`
- **Admin UI:** `<textarea />` (auto-expanding)

---

### `richText`

A full block-based rich text editor powered by **Tiptap**. Supports headings, lists, quotes, code blocks, inline formatting, and embedded media.

```ts
{
  name: 'body',
  type: 'richText',
}
```

- **Stored as:** `JSONB` (PostgreSQL) / `JSON` column (MySQL) / subdocument (MongoDB)
- **API returns:** A Tiptap/ProseMirror JSON document object
- **Admin UI:** Tiptap editor with a floating toolbar

> **Note:** Rich text is not a plain HTML string. Use a Tiptap renderer on your frontend to convert the JSON to HTML, or use `@tiptap/html` to do it server-side.

---

### `email`

A text input that validates the value is a correctly formatted email address.

```ts
{
  name: 'contactEmail',
  type: 'email',
  required: true,
}
```

- **Validation:** RFC 5322 format check (server + client)
- **Stored as:** `VARCHAR` / `string`
- **API returns:** `string`
- **Admin UI:** `<input type="email" />`

---

### `url`

A text input that validates the value is a correctly formatted absolute URL.

```ts
{
  name: 'websiteUrl',
  type: 'url',
  admin: {
    placeholder: 'https://',
  }
}
```

- **Validation:** Must start with `http://` or `https://`
- **Stored as:** `VARCHAR` / `string`
- **API returns:** `string`
- **Admin UI:** `<input type="url" />` with an "Open" icon button

---

## Numeric & Boolean

### `number`

An integer or floating-point number input.

```ts
{
  name: 'price',
  type: 'number',
  required: true,
  defaultValue: 0,
}
```

- **Stored as:** `NUMERIC` / `FLOAT` / `number`
- **API returns:** `number`
- **Admin UI:** `<input type="number" />` with step controls

---

### `boolean`

A true/false toggle.

```ts
{
  name: 'featured',
  type: 'boolean',
  defaultValue: false,
  admin: {
    description: 'Show this post in the featured section on the homepage.',
  }
}
```

- **Stored as:** `BOOLEAN` / `boolean`
- **API returns:** `boolean`
- **Admin UI:** Toggle switch

---

## Date & Time

### `date`

A date (and optionally time) picker. Values are always stored as ISO-8601 strings.

```ts
{
  name: 'publishedAt',
  type: 'date',
}
```

- **Stored as:** `TIMESTAMPTZ` (PostgreSQL) / `DATETIME` (MySQL) / `string` (MongoDB)
- **API returns:** ISO-8601 string, e.g. `"2024-06-01T10:00:00.000Z"`
- **Admin UI:** Calendar date picker with optional time input

---

## Selection Fields

### `select`

A single-value dropdown. Options must be defined in the field config.

```ts
{
  name: 'status',
  type: 'select',
  defaultValue: 'draft',
  options: [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
  ],
}
```

Options can also be a plain string array — Dyrected will convert `'draft'` to `{ label: 'Draft', value: 'draft' }` automatically.

- **Stored as:** `VARCHAR` / `string`
- **API returns:** The selected `value` string
- **Admin UI:** Dropdown `<Select />`

---

### `multiSelect`

Like `select` but allows the user to pick multiple values. Stored as an array.

```ts
{
  name: 'tags',
  type: 'multiSelect',
  options: ['technology', 'design', 'business', 'lifestyle'],
}
```

- **Stored as:** `JSON` array / `TEXT[]` (PostgreSQL)
- **API returns:** `string[]`
- **Admin UI:** Tag-based multi-select with search

---

## Relationship Fields

### `relationship`

Links a field to documents in another collection. The value stored is the related document's `id`. When fetching with `depth >= 1`, the full related document is returned inline.

```ts
{
  name: 'author',
  type: 'relationship',
  collection: 'users',   // slug of the target collection
  required: true,
}
```

**Multi-relationship** (stores an array of IDs):

```ts
{
  name: 'categories',
  type: 'relationship',
  collection: 'categories',
  // value will be string[] when populated from the admin
}
```

- **Stored as:** `VARCHAR` (single) / `JSON` array (multi)
- **API returns (depth=0):** `string` or `string[]` — the raw ID(s)
- **API returns (depth=1+):** The full related document object (or array of objects)
- **Admin UI:** Searchable combobox. For upload collections, shows a thumbnail grid picker instead.

#### Depth

Control how deeply relationships are resolved via the `depth` query parameter:

```
GET /api/collections/posts?depth=1      // populate one level
GET /api/collections/posts/abc?depth=2  // populate nested relationships too
```

> **Tip:** Set `depth=0` when you only need IDs (e.g. for a sidebar count), and `depth=1` when you need to display related data.

---

## Structural Fields

### `object`

Groups related fields into a nested object. Does **not** create a new database table — the grouped data is stored as a JSON column inline.

```ts
{
  name: 'seo',
  type: 'object',
  fields: [
    { name: 'metaTitle', type: 'text' },
    { name: 'metaDescription', type: 'textarea' },
    { name: 'ogImage', type: 'relationship', collection: 'media' },
  ],
}
```

- **API returns:** `{ metaTitle: string, metaDescription: string, ogImage: string | object }`
- **Admin UI:** Collapsible group panel with a distinct border

---

### `array`

A list of repeating field groups. Each item in the array has the same sub-field shape.

```ts
{
  name: 'faq',
  type: 'array',
  fields: [
    { name: 'question', type: 'text', required: true },
    { name: 'answer', type: 'textarea', required: true },
  ],
}
```

- **Stored as:** `JSON` / `JSONB`
- **API returns:** `Array<{ question: string, answer: string }>`
- **Admin UI:** Repeatable card list with Add/Remove buttons and drag-to-reorder

---

### `blocks`

A flexible layout builder. Each block in the list can be a different type, chosen from a predefined set of `Block` definitions. Ideal for page builders and rich landing pages.

```ts
{
  name: 'pageContent',
  type: 'blocks',
  blocks: [
    {
      slug: 'hero',
      labels: { singular: 'Hero', plural: 'Heroes' },
      fields: [
        { name: 'heading', type: 'text', required: true },
        { name: 'subheading', type: 'textarea' },
        { name: 'backgroundImage', type: 'relationship', collection: 'media' },
      ],
    },
    {
      slug: 'richTextBlock',
      labels: { singular: 'Rich Text', plural: 'Rich Text Blocks' },
      fields: [
        { name: 'content', type: 'richText' },
      ],
    },
    {
      slug: 'callToAction',
      labels: { singular: 'Call to Action', plural: 'Calls to Action' },
      fields: [
        { name: 'text', type: 'text' },
        { name: 'link', type: 'url' },
        { name: 'variant', type: 'select', options: ['primary', 'secondary', 'ghost'] },
      ],
    },
  ],
}
```

- **Stored as:** `JSON` / `JSONB`
- **API returns:** `Array<{ blockType: string, ...blockFields }>`. Each item includes a `blockType` property matching the block's `slug`.
- **Admin UI:** Block-picker modal + per-block inline editor

---

### `json`

A raw JSON editor for arbitrary structured data. Use when no other field type fits. Avoid if you can model the shape explicitly with `object` or `array`.

```ts
{
  name: 'metadata',
  type: 'json',
}
```

- **Stored as:** `JSONB` / `JSON`
- **API returns:** The raw parsed JSON value
- **Admin UI:** Code editor with JSON syntax highlighting and validation

---

## Admin Field Options

The `admin` object on a field controls how it behaves in the Admin UI. None of these affect the API or database.

```ts
{
  name: 'internalNotes',
  type: 'textarea',
  admin: {
    placeholder: 'Add internal notes here...',
    description: 'Only visible to admins. Never shown to end users.',
    readOnly: false,
    hidden: false,
    condition: (data) => data.status === 'published',
  }
}
```

| Property | Type | Description |
|---|---|---|
| `placeholder` | `string` | Input placeholder text. |
| `description` | `string` | Help text rendered below the field. |
| `readOnly` | `boolean` | Renders the field as disabled. The value is still submitted. |
| `hidden` | `boolean` | Hides the field from the form entirely. The value is preserved in the database. |
| `condition` | `(data: any) => boolean` | A function that receives the current document values and returns `true` to show the field, `false` to hide it. Evaluated reactively as the editor types. |

---

## Field Access

Field-level access control limits who can read or write individual fields.

```ts
{
  name: 'internalNotes',
  type: 'textarea',
  access: {
    read:   ({ user }) => user?.role === 'admin',
    update: ({ user }) => user?.role === 'admin',
  }
}
```

- **`read`**: If it returns `false`, the field is **stripped from the API response** for that user. The Admin UI also hides the field from the form.
- **`update`**: If it returns `false`, the field value is **silently ignored** on write. The Admin UI renders the field as read-only.

Both functions receive `{ user, doc, data, req }` — the same shape as collection-level access functions.

---

## Field Hooks

Field hooks allow transformation or async logic at the field level, without writing a full collection hook.

```ts
{
  name: 'email',
  type: 'email',
  hooks: {
    beforeChange: [
      ({ value }) => value.toLowerCase().trim(),
    ],
    afterRead: [
      ({ value }) => value, // can mask, format, etc.
    ],
  }
}
```

| Hook | When it runs | Return value |
|---|---|---|
| `beforeChange` | Before the document is saved | The transformed value to persist |
| `afterRead` | After the document is fetched | The transformed value to return |

Hook functions receive `{ value, originalDoc, data, user }`.
