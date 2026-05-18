---
"@dyrected/admin": patch
"@dyrected/docs": patch
"@dyrected/cli": patch
"@dyrected/core": patch
"@dyrected/db-mongodb": patch
"@dyrected/db-mysql": patch
"@dyrected/db-postgres": patch
"@dyrected/db-sqlite": patch
"@dyrected/next": patch
"@dyrected/nuxt": patch
"@dyrected/react": patch
"@dyrected/sdk": patch
"@dyrected/storage-b2": patch
"@dyrected/storage-cloudinary": patch
"@dyrected/storage-local": patch
"@dyrected/storage-s3": patch
"@dyrected/vue": patch
---

- **URL Field Evolution**: Implemented a modern dual-mode URL Field component featuring a direct toggle between external links and a dynamic internal page/document selector (complete with direct database slug binding and custom label fields).
- **Global Settings Configuration**: Added native Global Configuration support, with robust schema validation, configuration normalization, hydration mechanisms, and full type safety across standard field components.
- **Form Engine & Block Builder Revamp**:
  - Re-architected the Block Builder with interactive, collapsible block layout items, custom drag-and-drop sort handlers, and automatic field-value summary crawling for collapsed block previews.
  - Replaced the simple dropdown block selector with a visual center-aligned **Block Library Dialog Modal** featuring soft-indicator layer graphics.
  - Standardized external save triggers (header Save button & `⌘S` shortcut) using native HTML5 `form` attributes to bind seamlessly with the Hook Form submit engine.
  - Enlarged block titles and integrated center-aligned dashed "Add Block" buttons directly under the block lists for optimized edit flow.
