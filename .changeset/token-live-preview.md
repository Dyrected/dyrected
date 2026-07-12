---
"@dyrected/sdk": patch
"@dyrected/admin": patch
"@dyrected/react": patch
"@dyrected/vue": patch
"@dyrected/nuxt": patch
"@dyrected/core": patch
---

Server-side (token) live preview now works end to end

`previewMode: "token"` was previously a config value with backend endpoints but no admin integration. It's now wired up for server-rendered and statically generated frontends that can't receive `postMessage`.

- `@dyrected/admin`: in `token` mode the live-preview pane mints a short-lived token from the current draft (debounced) and loads the frontend iframe at `previewUrl?dyPreview=<token>`, reloading on change. Click-to-edit and live-as-you-type remain `postMessage`-only.
- `@dyrected/sdk`: new `createPreviewToken({ collectionSlug, documentId?, data })` to mint a token, plus `getPreviewToken(search)` and `PREVIEW_TOKEN_PARAM` helpers for reading the `dyPreview` token from a request's query string. `@dyrected/react` and `@dyrected/vue` re-export the helpers; `@dyrected/nuxt` auto-imports `getPreviewToken`.
- `@dyrected/core`: the server now logs a startup warning when `DYRECTED_JWT_SECRET` is unset, since token-mode preview signs with it.

Token mode is refresh-based (a mint + iframe reload per change) and embeds the draft in the signed token — see the Live Preview → Server-side docs for the security notes (set `DYRECTED_JWT_SECRET`) and the large-document URL-length caveat.
