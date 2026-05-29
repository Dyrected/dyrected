# Critical (break real-world use cases)

### Relationship & URL pickers — hardcoded document limits

relationship-picker.tsx fetches 20 docs max, url-field.tsx 50. No pagination. On any real collection with hundreds of entries, documents simply can't be found.

### Date field — no time support

date-picker.tsx is date-only. Any collection that needs publishedAt, scheduledFor, or expiresAt is stuck storing midnight UTC.

### Radio field — no dynamic options

radio-field.tsx only accepts a static options array. select supports async/dynamic options via hooks; radio doesn't, so they're not interchangeable even though they serve the same UX purpose.

### Rich text — window.prompt() for links

Link insertion uses a browser window.prompt(). No URL validation, no label, no ability to edit an existing link. This is the single worst UX in the entire system.

---

## High (meaningfully limits content editing quality)

### Block builder — no duplication, no search in type picker

Editors can't duplicate a block to use as a starting point, and if a collection has 15+ block types the picker modal has no search.

### JSON field — raw textarea only

No syntax highlighting, no tree view, no error location. Non-technical editors will break JSON and get a generic "Invalid JSON format" message with no hint of where the problem is.

### Media picker — no inline upload

You must open the MediaLibraryDialog to upload. Drag-and-drop directly onto the field or a paste-from-clipboard path doesn't exist.

### Rich text — no table support, no image alt-text editing

## Tables are a basic requirement for structured content. Image alt-text can't be set after insertion.

---

## Medium (polish / DX gaps)

### Icon picker —

hardcoded to 280 of Lucide's 1000+ icons, no categories, no scroll

### Character/word counts —

no warning state (e.g. turn orange at 80% of max, red at 100%)

### Array item deletion —

no confirmation dialog; one accidental click loses content permanently

### Select/multiSelect —

no "clear" button once a value is selected

### JEXL conditions —

re-evaluated on every keystroke with no memoization; silent console.warn on failure gives editors no feedback

---

## Architectural

### No custom field type registration —

FieldRenderer is a hardcoded switch. There's no plugin/extension point to add a new field type without modifying the core file.

### No server-side validation error mapping —

Zod runs client-side but API errors don't map back to specific fields in the form.

Which of these do you want to tackle first?
