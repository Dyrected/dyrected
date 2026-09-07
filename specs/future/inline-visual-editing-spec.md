# True In-Line Visual Editing Spec

**Status:** Proposed / Future  
**Package:** `@dyrected/admin` (host), `@dyrected/live-preview` / `@dyrected/sdk` (client frame)  
**Inspiration:** Directus Visual Builder, Vercel Visual Editing, Storyblok Bridge, Sanity Overlays  

---

## 1. Overview & Problem Statement

Dyrected currently supports live side-by-side preview with click-to-highlight/scroll-to-field. When an editor wants to update a title or blurb, they click an element in the preview frame, which opens and focuses the corresponding field in the sidebar form.

While powerful, non-technical editors, marketing teams, and business owners expect **true in-line editing**:
- Typing directly into the webpage canvas (like Notion or Medium).
- Rich-text formatting toolbar hovering right above the highlighted text.
- Image drag-and-drop replacement directly onto the rendered photo container.
- Instant, zero-friction editing with two-way synchronization back to the collection/document draft.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dyrected Admin Frame                                           [ Save Draft ] │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │  LIVE PREVIEW IFRAME                                                    │ │
│ │                                                                         │ │
│ │   ┌─ Floating Toolbar: [ B | I | U | Link | Global Var ⚡ ] ─────────┐ │ │
│ │   │                                                                 │ │ │
│ │   │  # The Next-Gen Headless CMS for Creators                       │ │ │
│ │   │    └─ [data-dyrected-field="title"] (contenteditable active)    │ │ │
│ │   └─────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                         │ │
│ │      [ Drag & Drop Image to Replace ]                                   │ │
│ │      ┌───────────────────────────────────┐                              │ │
│ │      │   [data-dyrected-field="cover"]   │                              │ │
│ │      │   (Hover action: Replace Image)   │                              │ │
│ │      └───────────────────────────────────┘                              │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Architecture: How In-Line Editing Works

The system operates via a secure bidirectional `postMessage` protocol between the **Admin Host Application** and the **Preview Webpage (Iframe)**.

### 2.1 The DOM Tagging Protocol (`data-dyrected-*`)

In the frontend application (Next.js, Nuxt, SvelteKit, etc.), developers annotate editable JSX/HTML elements using helper attributes or the `@dyrected/live-preview` SDK:

```tsx
// React / Next.js Example
import { useDyrectedField } from '@dyrected/live-preview/react'

export function Hero({ post }) {
  return (
    <section>
      <h1 {...useDyrectedField(post, 'title')}>
        {post.title}
      </h1>
      <div {...useDyrectedField(post, 'content')} />
    </section>
  )
}
```

This compiles to standard HTML data attributes in preview mode:
```html
<h1 
  data-dyrected-id="post_123" 
  data-dyrected-collection="posts" 
  data-dyrected-field="title"
  data-dyrected-type="text"
>
  The Next-Gen Headless CMS for Creators
</h1>
```

### 2.2 In-Context Activation & Selection Bridge

When the Admin detects that an iframe is in *Edit Mode*:
1. The iframe listener injects an overlay layer and attaches event listeners to elements tagged with `data-dyrected-field`.
2. When the editor clicks a text/textarea element:
   - The element receives `contenteditable="true"` dynamically.
   - An in-frame floating toolbar renders directly adjacent to the bounding box of the active element.
   - Keystrokes are captured via `input` events and debounced.
3. When the editor interacts with an image or relationship block:
   - A quick-action menu opens (e.g. *Choose from Media Library*, *Upload New*, *Crop*).

### 2.3 Real-Time State Synchronization (`postMessage`)

```
[ Preview Iframe (User Types Text) ]
                │
                │  1. postMessage('DYRECTED_FIELD_INPUT', {
                │       documentId: 'post_123',
                │       field: 'title',
                │       value: 'New Title Value'
                │     })
                ▼
[ Admin Host State Manager ]
                │
                │  2. Updates local form draft store
                │  3. Marks document as "dirty / unsaved changes"
                │  4. Emits back to other reactive components
                ▼
[ Optional Auto-Save / Snapshot Timer ]
```

---

## 3. Supported In-Line Field Types

| Field Type | In-Line Interaction | Behavior |
| :--- | :--- | :--- |
| **`text` / `textarea`** | Inline typing (`contenteditable`) | Updates string value directly, strips forbidden rich markup. |
| **`richText` / `markdown`** | Floating ProseMirror/TipTap Bubble Menu | Allows bold, italics, lists, links, and global variable insertion directly in place. |
| **`upload` / `media`** | Drag-over dropzone & click-to-replace | Opens asset picker modal or uploads dropped file instantly. |
| **`select` / `status`** | Inline floating dropdown menu | Change status (e.g. *Draft* $\rightarrow$ *Published*) right on the badge. |
| **`dynamicBlocks` / `repeater`** | Hover block controls & re-order handles | Add new block above/below, drag handle to reorder, delete block. |

---

## 4. Key Engineering Challenges & Solutions

1. **Hydration & SSR Safety:**  
   The helper `useDyrectedField` only injects data attributes when preview mode is active (`process.env.NODE_ENV !== 'production'` or when preview token is verified in cookies/headers), resulting in zero runtime overhead in production.
2. **Preventing Broken HTML Structure:**  
   When editing `contenteditable` plain text, the editor intercepts Enter keys to prevent creating unwanted `<div>` or `<br>` tags unless the field specifically permits multiline content.
3. **Undo / Redo Buffer:**  
   All keystrokes feed into the Admin host's central Undo/Redo stack, allowing editors to press `Cmd+Z` / `Ctrl+Z` to revert visual changes seamlessly.
