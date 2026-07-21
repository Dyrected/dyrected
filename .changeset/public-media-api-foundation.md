---
"@dyrected/admin": patch
---

Add a reusable public media API foundation to `@dyrected/admin`:

- Introduce framework-agnostic media controllers for uploads, URL imports, and media library state:
  - `createMediaUploadController`
  - `createMediaURLController`
  - `createMediaLibraryController`
- Refactor the React media hooks to become adapters over the shared controller layer:
  - `useMediaUpload`
  - `useMediaURL`
  - `useMediaLibrary`
- Keep `useAddMediaFromUrl` as a backward-compatible alias while shifting the preferred public naming to `useMediaURL`.
- Export the new media controllers, React hooks, and supporting media utilities from `@dyrected/admin` so host apps can build custom media interfaces without reimplementing ingestion logic.
- Preserve the existing admin media experience by keeping `MediaLibraryDialog`, `MediaPicker`, and `MediaPage` on the same controller-backed upload and URL import pipeline.
