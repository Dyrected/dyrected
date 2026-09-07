---
"@dyrected/admin": minor
"@dyrected/core": minor
"@dyrected/storage-cloudinary": minor
"@dyrected/sdk": patch
"@dyrected/knowledge": patch
---

- **Digital Asset Management (DAM)**: Added folder hierarchy tree with desktop sticky sidebar and mobile pill carousel, Move to Folder modal, in-place asset replacement, MIME type filter chips, and full-width `MediaLibraryDialog`.
- **Focal Point & Smart Cropping**: Integrated focal point picker in Media Inspector with automatic CSS `object-position` calculations in `<DyrectedMedia>` and dynamic CDN crop parameters in Cloudinary/API transformations.
- **Spreadsheet Grid Cell Editors**: Added full in-cell editing for select, multi-select, link, date/datetime, media/image, and relationship pickers.
- **Action Dialog & Form Engine Parity**: Added async hook support, `setValue(fieldName, value)` sibling mutation support, and unified document context across action dialog modals and collection forms.
