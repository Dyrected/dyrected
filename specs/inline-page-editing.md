# Inline Page Editing

A visual "point-and-click" editing experience directly within the Live Preview pane.

## Overview

Inline Page Editing bridges the gap between the structured data entry of the Admin UI and the visual reality of the frontend. It allows editors to click on elements in the preview window to instantly focus the corresponding fields in the sidebar, or edit text directly on the page.

## Core Concepts

### 1. The "Edit Mode" Overlay
When the Live Preview is active, an "Edit Mode" toggle is available. When enabled, the preview iframe receives an overlay that captures clicks and hovers.

### 2. Element Mapping
The frontend application uses a helper (e.g., `v-dyrected` directive in Nuxt/Vue or `data-dy-path` in React) to mark editable elements with their content path.

```html
<!-- Example in a Vue template -->
<h1 v-dyrected="'title'">{{ doc.title }}</h1>

<!-- Renders as -->
<h1 data-dy-path="title">My Title</h1>
```

### 3. Communication Protocol
The Admin UI and the Frontend communicate via `window.postMessage`.

- **Admin to Frontend**: "Enter Edit Mode", "Highlight Path: 'title'".
- **Frontend to Admin**: "Element Clicked: 'blocks.2.content'", "Content Updated: '...'", "Scroll to Path: 'footer'".

## Technical Implementation

### 1. The `LivePreview` Component
The existing Live Preview component in `packages/admin` will be upgraded to handle:
- Iframe mouse event interception.
- Synchronizing the sidebar state with the clicked element's path.

### 2. The Frontend SDK Integration
The `useDyrected` (Nuxt) and standard SDK will include a "Live Mode" plugin that:
1. Detects if it's running inside the Dyrected Admin iframe.
2. Listens for messages from the Admin.
3. Automatically adds `contenteditable` or click listeners to elements with `data-dy-path`.

### 3. Visual Feedback
- **Hover**: Subtle blue border around the editable block.
- **Active**: Stronger border with a "drag" handle for blocks.
- **Direct Text Entry**: Using `contenteditable` for simple text/textarea fields, syncing changes back to the Admin state in real-time.

## Workflow

1. Editor opens a Page document.
2. Clicks "Open Preview".
3. Clicks a heading on the previewed site.
4. The Admin sidebar automatically scrolls to and expands the "Title" field.
5. Editor types in the sidebar (or directly on the heading).
6. Changes are reflected instantly in both places.
