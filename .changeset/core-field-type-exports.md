---
"@dyrected/core": patch
---

Expose the field-type contracts as public types. `Block`, `BlockVariant`, `TypedField`, `FieldBase`, the per-field admin option types (`BaseFieldAdmin`, `TextFieldAdmin`, `TextareaFieldAdmin`, `EmailFieldAdmin`, `UrlFieldAdmin`, `IconFieldAdmin`, `SelectFieldAdmin`, `RadioFieldAdmin`, `BooleanFieldAdmin`, `MultiSelectFieldAdmin`, `CharacterLimitFieldAdmin`, `WordLimitFieldAdmin`), and the field hook shapes (`FieldHooks`, `FieldAdminHooks`) are now exported from `@dyrected/core`. This lets consumers and generated documentation reference the full field type surface directly. Purely additive — no runtime or existing-type changes.
