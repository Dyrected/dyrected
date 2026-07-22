# Admin Hooks Docs Batch

## Files

- `apps/docs/content/docs/features/admin/react-hooks.mdx`
- `apps/docs/content/docs/features/admin/media-hooks.mdx`
- `apps/docs/content/docs/features/admin/form-and-field-hooks.mdx`
- `apps/docs/content/docs/features/admin/theme-hooks.mdx`

## Payload equivalents

- `react-hooks.mdx`
  - Closest Payload references: Payload admin React hooks docs, custom components overview, and admin overview.
  - Structural takeaway: start with the mental model, explain what the extension surface is for, then branch into specific APIs and boundaries.
- `media-hooks.mdx`
  - No single clean Payload page for Dyrected's media hook surface.
  - Nearest structural references: Payload upload/admin feature docs plus React hooks docs.
- `form-and-field-hooks.mdx`
  - Closest Payload reference: Payload admin React hooks docs.
  - Structural takeaway: explain document state first, then narrow to field state, then show provider/context setup.
- `theme-hooks.mdx`
  - No strong one-to-one Payload equivalent.
  - Nearest structural reference: Payload admin overview style pages that teach configuration first, then escape hatches.

## Source inventory

Primary code sources:

- `packages/admin/src/public/contracts.ts`
- `packages/admin/src/public/index.ts`
- `packages/react/src/index.ts`
- `packages/react/src/hooks/useAdminSchemas.ts`
- `packages/react/src/hooks/useMediaUpload.ts`
- `packages/react/src/hooks/useMediaLibrary.ts`
- `packages/react/src/hooks/useMediaURL.ts`
- `packages/vue/src/index.ts`
- `packages/vue/src/composables/useAdminSchemas.ts`
- `packages/vue/src/composables/useMediaUpload.ts`
- `packages/vue/src/composables/useMediaLibrary.ts`
- `packages/vue/src/composables/useMediaURL.ts`
- `packages/vue/src/composables/useDyrectedForm.ts`
- `packages/vue/src/composables/useField.ts`
- `packages/vue/src/composables/useAdminTheme.ts`
- `packages/admin/src/controllers/form.ts`
- `packages/admin/src/controllers/theme.ts`

Supporting docs sources:

- `apps/docs/content/docs/features/admin/overview.mdx`
- `apps/docs/content/docs/features/custom-components/overview.mdx`
- `apps/docs/content/docs/features/admin/react-hooks.mdx` (previous version)

## Factual notes

- Media is the cleanest framework-first surface today.
- Form and theme still require one-time controller/provider setup at the boundary.
- Vue state fields are refs; React state fields are plain values.
- The shared contract in `packages/admin/src/public/contracts.ts` is now the documentation source of truth for API shape.
- Vue client provisioning is not re-explained here beyond the documented assumption that a Dyrected client already exists in context.

## Open review points

- The form and theme pages are intentionally honest about the current boundary setup. If the product goal is "no visible controller usage at all," that still needs additional implementation before docs can promise it.
- `react-hooks.mdx` remains under its existing slug for compatibility, but the title is now `Hooks & Composables`.
