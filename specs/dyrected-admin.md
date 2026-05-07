# Dyrected Admin Documentation

The `@dyrected/admin` package provides a standardized, React-based dashboard for managing content, media, and site settings. It is built using **Tailwind CSS** and **Shadcn UI**, offering a premium, modern experience out of the box.

---

## Overview

The Admin UI is designed to work in two distinct modes, mirroring the backend architecture:
1.  **Core Mode (Self-Hosted)**: A focused editor experience for a single site. The site switcher and workspace management are hidden.
2.  **Cloud Mode (Managed)**: A full-featured platform dashboard with workspace switching, site management, and user invitations.

---

## Installation

```bash
pnpm add @dyrected/admin
```

---

## Usage in Next.js

To embed the admin panel, create a catch-all page in your `app` directory.

```tsx
// app/cms/[[...route]]/page.tsx
'use client'

import { DyrectedAdmin } from '@dyrected/admin'
import '@dyrected/admin/dist/index.css'

export default function AdminPage() {
  return (
    <DyrectedAdmin 
      apiPath="/api/dyrected" 
      basePath="/cms"
      config={{
        logo: '/logo.svg',
        primaryColor: '#000000',
      }}
    />
  )
}
```

---

## Core Components

The admin interface is composed of several high-level modules:

### 1. The Sidebar
Dynamically populated based on your `dyrected.config.ts`. It includes:
- **Collections**: Grouped links for each collection defined in your schema.
- **Globals**: Direct links to singleton content like "Settings" or "Navigation".
- **Media**: A centralized media library for managing uploads.

### 2. Collection List View
A powerful data table for browsing items.
- Supports filtering, sorting, and pagination.
- Displays status (Draft/Published) and last updated timestamps.
- Action menus for duplication, deletion, and bulk operations.

### 3. Content Editor
The primary interface for creating and editing content.
- **Dynamic Forms**: Fields are generated automatically based on your field types (`text`, `richText`, `relationship`, etc.).
- **Visual Preview**: Side-by-side live preview for frameworks that support it.
- **Scribe Editor**: Integrated `@dyrected/scribe` for advanced block-based rich text editing, featuring a distraction-free mode and real-time collaboration support (Cloud only).

---

## The Field System

Dyrected Admin automatically renders the appropriate UI component based on the field type defined in your `dyrected.config.ts`.

| Field Type | Admin UI Component | Features |
|---|---|---|
| `text` | Input | Single-line text, validation, placeholders |
| `textarea` | Textarea | Multi-line text, auto-expanding |
| `richText` | Scribe Editor | Block-based editing, drag-and-drop, formatting |
| `number` | Number Input | Step control, min/max validation |
| `boolean` | Switch / Checkbox | Toggle state |
| `date` | Date Picker | Calendar interface, ISO formatting |
| `select` | Dropdown | Single-select from static options |
| `multiSelect` | Multi-select | Tag-based multiple selection |
| `email` | Email Input | Format validation |
| `url` | URL Input | Format validation, "open" button |
| `relationship` | Searchable Select | Paginated lookup across collections, "Add New" inline |
| `array` | Repeatable List | Draggable reordering, nested validation |
| `object` | Grouped Fields | Visual indentation, collapsible sections |
| `json` | Code Editor | Syntax highlighting, JSON validation |

---

## Custom Field Components

You can extend the Admin UI by providing your own React components for specific fields. This is useful for custom map pickers, color selectors, or complex data types.

```tsx
<DyrectedAdmin
  components={{
    fields: {
      customMap: MyMapFieldComponent,
    }
  }}
/>
```

### Component Props
Your custom field component will receive:
- `value`: The current field value.
- `onChange`: Callback to update the value.
- `field`: The full field definition from your config.
- `errors`: Any validation errors for this field.

---

## Deployment

The Admin UI is a client-side React application. When used with the Next.js or Nuxt adapters, it is bundled into your main application, meaning you don't need a separate server or domain for your CMS dashboard.
