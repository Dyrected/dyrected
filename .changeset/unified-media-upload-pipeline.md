---
"@dyrected/admin": patch
---

Overhaul media library upload experience with a unified media ingestion pipeline:
- Add multi-file drag-and-drop dropzone with live byte-level upload progress queue in `MediaLibraryDialog`.
- Unify file ingestion across `MediaLibraryDialog`, `MediaPicker`, and `MediaPage` using `useMediaUpload`.
- Add client-side Canvas API image compression (`compressImage`) capping long edges to 2048px before network transfer.
- Add safe upload collection resolution (`resolveActiveMediaCollection`) falling back to `"media"` for non-upload collections.
- Optimize URL media import pipeline with 0-byte bandwidth transfer for YouTube/Vimeo embeds and direct remote video CDN links, with client-side fetch and CORS fallbacks for direct images.
- Add semantic source classification and visual badges (`getMediaSourceInfo`) for internal vs external media items across grid, list, and detail views.
