---
"@dyrected/vue": patch
"@dyrected/admin": patch
"dyrected": patch
---

Vue bridge shares the host app context, CLI sync respects DYRECTED_URL

- `@dyrected/vue`: custom Vue components in the admin (custom field inputs and dashboard/list slots) now share the host app's context instead of each mounting an isolated Vue app. They can use the host app's plugins, `provide`/`inject`, Pinia, and i18n, and many custom components no longer spin up one full Vue app per instance.
- `dyrected` (CLI): `sync:schema` now honors `DYRECTED_URL` (and the `NEXT_PUBLIC_` / `NUXT_PUBLIC_` / `VITE_` variants) from your environment. Previously the `--url` option's hardcoded default masked the env fallback, so it always synced to Dyrected Cloud regardless of your configured URL.
- `@dyrected/admin`: fix the admin browser-title helper resolving a collection's label — it read a non-existent `collection.label` (collections use `labels.singular` / `labels.plural`), which broke the package build. Also corrected the misleading `AdminComponents` JSDoc (`fields` is keyed by the field's `admin.component` string, not field type; `collectionList` injects list slots rather than replacing the list view).
