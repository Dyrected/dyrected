---
"@dyrected/core": patch
"@dyrected/admin": patch
"@dyrected/react": patch
"@dyrected/vue": patch
"@dyrected/next": patch
"@dyrected/nuxt": patch
"@dyrected/knowledge": patch
"dyrected": patch
---

Improve dynamic select options, frontend rendering components, and field ergonomics.

- **Server-side search for dynamic `select`/`multiSelect` options.** The Admin now forwards the editor's typed query to the options resolver as `req.query.search` (debounced) and renders whatever the resolver returns, instead of loading the entire list into the browser and filtering client-side. Push the filter into your query (`where: { name: { contains: search } }`, capped `limit`) so large and growing lists stay fast. Previously-typed results are kept visible while the next page loads.
- **Cached option resolvers.** `options` objects that set `cacheTTL` (seconds) are now actually cached on the server, keyed by field, query parameters, and requesting user, and reused until the TTL elapses. The value was previously accepted but ignored.
- **`DyrectedRichText` component** added to `@dyrected/react` and `@dyrected/vue`, re-exported from `@dyrected/next`, and auto-imported in `@dyrected/nuxt`. It renders the HTML string a `richText` field stores.
- **`DyrectedIcon` is now re-exported from `@dyrected/next`** — Next.js apps no longer need to import it from `@dyrected/react`.
- **Nuxt renders images with `<NuxtImg>`.** `DyrectedImage` is now registered as an auto-imported component, and both it and the image branch of `DyrectedMedia` use `@nuxt/image`, which the module installs automatically.
- **`RichTextField` now types its value as `string`** (an HTML string) rather than `Record<string, unknown>`, matching what the editor stores.
- **`UrlField` value type widened** to `string | UrlLinkValue` to reflect the structured link object it returns.
- **Number fields accept advisory `min`/`max`**, surfaced to editors and client tooling (not enforced as server-side validation), mirroring `maxLength`.
- **`defineTab` helper** groups a set of fields under a shared Admin tab label.
- **Auth collections re-assert `email`/`password` integrity.** A developer-defined `email` field can no longer silently drop the injected `unique`/`required` constraints.
- **Relationship read depth defaults to `1`** across the REST controllers, matching the SDK.
- Field type reference contracts now carry per-type descriptions, and the `checkbox`/`group`/`upload`/`radio-group` field docs pages were renamed to `boolean`/`object`/`image`/`radio` to match their helper names.
