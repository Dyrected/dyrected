---
"@dyrected/admin": patch
---

Add a reusable public form and field API foundation to `@dyrected/admin`:

- Introduce framework-agnostic form and field controllers:
  - `createDyrectedFormController`
  - `createDyrectedFieldController`
- Add React adapters for the shared controller layer:
  - `DyrectedFormProvider`
  - `DyrectedFieldPathProvider`
  - `useDyrectedForm`
  - `useField`
- Publish custom field component prop/context types so host apps can build `admin.component` field overrides against a stable contract.
- Export form utility helpers (`buildSchemaShape`, `buildDefaultValues`, `getFlatErrors`, `formatPath`, `resolveContainerPath`) for advanced custom form surfaces.
- Keep the existing admin form engine on `react-hook-form` internally while syncing its state into the shared controller layer so public consumers and built-in forms use the same source of truth.
