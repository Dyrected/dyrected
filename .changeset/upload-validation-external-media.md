---
"@dyrected/core": patch
"@dyrected/admin": patch
"@dyrected/sdk": patch
---

Upload MIME/size validation and add-media-from-URL.

**Core (`@dyrected/core`)**

- New `upload-validation` utility: `isMimeAllowed` (supports `*`, `type/*`, and exact `type/subtype` patterns, case-insensitive) and payload validation that returns a typed error with the correct HTTP status (`415 Unsupported Media Type` or `413 Payload Too Large`).
- The media controller enforces a collection's `upload` config (`allowedMimeTypes`, `maxFileSize`) on upload and accepts external media references.

**Admin (`@dyrected/admin`)**

- Add media from a URL: `external-media` builder + `useAddMediaFromUrl` hook detect YouTube/Vimeo videos, direct image URLs, and generic files, and store them as reference-only media records (no file bytes). The media grid and preview components key off the resulting `mimeType` (`video/youtube`, `video/vimeo`, `image/external`, …) to render each asset correctly.
- Media picker, media card, media library dialog, and media page updated to support external media and surface upload validation errors.

**SDK (`@dyrected/sdk`)**

- Support for external media references and upload validation feedback.
