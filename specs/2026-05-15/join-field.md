# Join Field (Virtual Relationship)

A field that dynamically fetches related documents from another collection without storing them in the current document.

## Overview

A `Join` field is the "reverse" of a relationship. While a `relationship` field stores an ID pointing to another document, a `Join` field queries for all documents that point *back* to the current one.

**Example**: In an `Author` collection, a `Join` field can show all `Posts` written by that author.

## Configuration

```ts
const authors = defineCollection({
  slug: 'authors',
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'posts',
      type: 'join', // New field type
      collection: 'posts', // The collection to query
      on: 'author', // The field in the target collection that points back to this one
      label: 'Author Posts',
    }
  ]
})
```

## Technical Implementation

### 1. Database Level
**Important**: `Join` fields are NOT stored in the database. They are "virtual." 
- When fetching an `Author`, the engine will automatically perform a secondary query: `SELECT * FROM posts WHERE author = author_id`.

### 2. Admin UI
In the Admin UI, a `Join` field renders as a **read-only list** of related documents.
- **Navigation**: Clicking an item in the list navigates to that document's edit page.
- **Creation**: Optionally provide a "Create New" button that opens the target collection's creation form with the relationship field pre-filled.

### 3. API Response
When querying via the SDK, the `Join` field will be populated as an array of documents (or IDs).

```json
{
  "id": "author-1",
  "name": "Jane Doe",
  "posts": [
    { "id": "post-1", "title": "Hello World" },
    { "id": "post-2", "title": "Dyrected is Great" }
  ]
}
```

## Benefits
- No redundant data storage.
- Always stays in sync (it's a live query).
- Provides a "Two-Way" navigation experience in the Admin UI.
