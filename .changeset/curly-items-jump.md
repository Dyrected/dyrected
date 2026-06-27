---
"@dyrected/knowledge": patch
"@dyrected/admin": patch
"@dyrected/core": patch
"@dyrected/sdk": patch
"@dyrected/docs": patch
---

feat(admin): fix admin panel type safety, lint warnings, and external auth flow integration

Refactored the admin panel and core SDK interfaces to eliminate compiler errors and ESLint warnings (such as `any` usage, index signature mismatches, and regex escapes). This ensures full compatibility with the updated schema and SDK type definitions, allowing all 20 monorepo packages to build successfully.

Detailed Changes:

1. `@dyrected/admin` TypeScript & ESLint Fixes
   - components/media/media-library-dialog.tsx:
     * Replaced `any` in `MediaLibraryDialogProps` (`selectedValues`, `onSelect`, `onConfirm`) with proper typed interfaces (`string | Record<string, unknown>`).
     * Imported `Media` type from `@dyrected/sdk` and typed `selectedItem` state as `(Media & { id?: string }) | null` to resolve missing property compilation errors.
     * Cleaned up regex useless-escape warnings (`no-useless-escape`) in YouTube link detection pattern by removing backslashes on `&` and `?`.
     * Added type assertion to `client.collection(collection).upload(...)` returns and mapped list item elements in loop to define `mimeType?: string`.
     * Restored the original select-to-confirm highlight click logic in single-select mode.
   - pages/collections/edit-page.tsx:
     * Cast `client!.collection(slug!).findOne(id!)` return values to `Promise<Record<string, any> | null>` to resolve property accesses on `unknown`.
     * Replaced `schema.label` fallback checks with the new `schema.labels?.singular` / `schema.labels?.plural` structures.
     * Replaced generic `any` usage in collection schema iteration callbacks with `{ name?: string }` maps.
   - components/forms/field-renderer.tsx:
     * Cast `schema.admin` to resolve union-field layout property checking.
     * Renamed imported type `UrlField` to `UrlFieldSchema` to resolve naming collisions with `UrlFieldComponent`.
   - components/forms/fields/radio-field.tsx:
     * Correctly typed `RadioFieldProps` and cast the `RadioGroup` value to a string.
   - components/forms/fields/media-picker.tsx:
     * Added clean casting of file upload responses to `CachedMedia` type to satisfy the state updater.

2. Auth, Core, and Router Integration
   - specs/external-admin-auth-door.md & specs/admin-auth.test.ts:
     * Outlined, specified, and integrated the OIDC/Cloud provider handoff, callback, and JIT provisioning authorization contract.
   - packages/core/src/types/admin-auth.ts & packages/core/src/types/documents.ts:
     * Defined schema shapes, request parameters, and controllers for JWT-scoped identity handoff.
   - packages/admin/src/providers/dyrected-context.ts:
     * Extracted provider states into a centralized context to decouple core workspace bindings.

3. Documentation & Schema Sync
   - Updated MDX docs (`apps/docs/content/docs/*`) to reflect database, storage, and field-rendering layouts.
   - Synchronized knowledge base inventories (`packages/knowledge/generated/*`) and LLM mappings to index new API parameters.

