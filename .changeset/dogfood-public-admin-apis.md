---
"@dyrected/admin": patch
---

Dogfood the public admin controller APIs inside the built-in UI:

- Move `MediaLibraryDialog` onto `useMediaLibrary` for internal library loading, paging, and selection state.
- Use the public field/form APIs inside the built-in form renderer so nested field state flows through `useField` and `useDyrectedForm`.
- Replace manual nested path string building in array, block, form, and nested-editor internals with the exported path helpers.
- Align internal nested field targeting with full field paths, improving consistency with the public custom-field contract.
