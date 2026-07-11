# Review Packet — `features/authentication` batch

Status: **FINAL.** Approved by the repo maintainer on 2026-07-11. Every open factual
question was resolved with the maintainer (see the resolved sections below), and the pages
were accepted as final. Verification basis: package-source grounding + maintainer review
(no automated endpoint dry-run or docs build was run as part of sign-off — offered and
declined/not required).

Folder: `apps/docs/content/new-docs/features/authentication/`
Comparison source: Payload CMS authentication docs (structure only). Sanity was available
as a secondary comparison but Payload mapped 1:1, so it was not needed.

---

## What changed at the folder level

- **Unpublished 3 pages** by renaming with a `__` prefix (Fuma excludes `__`-prefixed
  files) and removing them from `meta.json`, per maintainer decision. They describe
  Payload features Dyrected does **not** implement. Each keeps a short in-file comment
  explaining why it is parked and what to build:
  - `__email-verification.mdx` — no verify route, no `_verified` field, no config. Zero implementation.
  - `__api-key-strategy.mdx` — no per-user API keys (no `useAPIKey`, no injected `apiKey` field).
  - `__custom-strategies.mdx` — no pluggable strategy API for collection users.
- **Published + rewritten** 5 pages: `overview`, `operations`, `jwt-strategy`,
  `cookie-strategy`, `token-data`.
- **Preserved** `handing-off-to-editors.mdx` (already review-ready; not in scope to rewrite).
- Final published nav order in `meta.json`: overview → handing-off-to-editors →
  operations → jwt-strategy → cookie-strategy → token-data.

---

## Source inventory (trust levels)

| Source | Why it matters | Trust |
| --- | --- | --- |
| `packages/core/src/controllers/auth.controller.ts` | Exact endpoints, request/response bodies, status codes | High (read directly) |
| `packages/core/src/controllers/admin-auth.controller.ts` | Dashboard SSO (`adminAuth`) routes and flow | High |
| `packages/core/src/auth/token.ts` | JWT lib (jose), HS256, claims, `DYRECTED_JWT_SECRET`, 7d default | High |
| `packages/core/src/middleware/auth.ts` | Bearer-only transport, per-request DB re-hydration | High |
| `packages/core/src/utils/config.ts` (106–156) | Injected `email`/`password`/`roles` fields + access rules | High |
| `packages/core/src/types/admin-auth.ts` | `AdminAuthConfig` shape (OIDC/custom providers) | High |
| `packages/sdk/src/index.ts` | `createClient`, `collection().*` auth methods, in-memory token | High |
| `packages/vue|nuxt` `useDyrectedAuth` | Token storage (localStorage vs cookie) | High |
| `packages/cli` init templates | Which env vars are actually scaffolded | High |
| `apps/docs/content/docs/concepts/auth-model.mdx`, `guides/adding-authentication.mdx`, `guides/separating-admin-auth.mdx` | Prior authored prose + framework patterns reused | Medium (one factual conflict — see below) |

---

## Doc-vs-code conflicts found (code wins; corrected in the new pages)

1. **Token contents.** `docs/concepts/auth-model.mdx` states the JWT payload contains
   `id`, `email`, `roles`, and `slug`. **Code:** the token carries only `sub`, `email`,
   `collection` (+ `iat`/`exp`, and optional `purpose`/`providerId`/`authSource`). Roles are
   **not** in the token — they come from per-request DB re-hydration. Corrected in
   `token-data.mdx` and `jwt-strategy.mdx`, with an explicit callout. **The old
   `docs/concepts/auth-model.mdx` should be corrected too** (out of this batch's scope).

2. **Roles field default.** Injected `roles` (config.ts) is a `select` with options
   `admin/editor/viewer`, default empty. The CLI `__admins` scaffold overrides this with
   its own `roles` select of `admin/editor` only (default `admin`) and no `viewer`. The
   `handing-off-to-editors.mdx` page already notes this discrepancy. New `overview.mdx`
   documents the injected default (admin/editor/viewer) — accurate for a generic auth
   collection. Flagged so reviewers keep the two intentionally distinct.

---

## Per-page notes

### overview.mdx (conceptual — canonical home)
- Reader outcome: understands `auth: true`, stateless JWT sessions, roles/access, multiple
  auth collections + `__admins`, dashboard SSO vs collection auth, and the API-key distinction.
- Payload equivalent: Authentication Overview (structure adapted, wording original).
- Absorbed adjacent real features per maintainer request: **Dashboard SSO** (`adminAuth`) and
  the **project `x-api-key`/`DYRECTED_API_KEY`** credential each get a short, accurate section
  rather than their own (currently non-existent) pages.
- `NEEDS-HUMAN-VERIFY`: the claim "auth collections throw at startup if `DYRECTED_JWT_SECRET`
  is missing." Verified true for the token module (`getSecret()` throws), but confirm the
  throw surfaces at app startup vs first-token-sign in your deployment.

### operations.mdx (reference-led)
- Every endpoint verified against `auth.controller.ts` + `router.ts`: paths, methods,
  auth requirement, request bodies, response bodies, and status codes (`first-user` 403 when
  seeded; `accept-invite` 201; `invite`/`accept-invite` 409 on duplicate; `forgot-password`
  always 200).
- SDK method names verified exactly: `isInitialized`, `registerFirstUser`, `login`, `logout`,
  `me`, `refreshToken`, `sendResetLink` (wraps `/forgot-password`), `resetPassword`,
  `changePassword`, `invite`, `acceptInvite`. No aliases invented.
- `me` returns the user object **directly** (not `{ user }`) — documented as such.
- `NEEDS-HUMAN-VERIFY`: reset-token lifetime stated as "one hour" (from controller signing a
  1h reset JWT) and invite-token "7 days" — confirm these are current.

### jwt-strategy.mdx (config/conceptual)
- jose + HS256, raw secret (UTF-8, **no** SHA-256 transform — unlike Payload), verified.
- 7-day expiry stated as a **fixed default with no env/config override today** — verified
  (`DEFAULT_EXPIRY = '7d'`, overridable only per-call internally). Flag if a config surface
  is planned so this wording can soften.
- External-verification snippet uses `jose` with the raw secret; matches signing.

### cookie-strategy.mdx (conceptual — reframed)
- Core point verified: **server sets/reads no cookies**; token travels only via
  `Authorization` header. So the page reframes "cookie strategy" as "where you store the token."
- Storage facts verified: SDK in-memory; Vue → `localStorage` key `dyrected_token_<slug>`;
  Nuxt → cookie `dyrected_token_<slug>`, 7d, `sameSite: 'lax'`, client-readable (not httpOnly);
  React has no auth hook.
- Next.js httpOnly pattern reused from `docs/guides/adding-authentication.mdx` (cookie name
  `dyrected-token` is illustrative, not a product default — confirm we are happy standardizing it).
- `NEEDS-HUMAN-VERIFY`: the CSRF reasoning ("classic cookie CSRF does not apply because the
  API authenticates from the header, not an auto-sent cookie"). Correct for the Dyrected API
  surface, but please sanity-check the framing before publishing security guidance.

### token-data.mdx (conceptual)
- Corrects the token-contents conflict (see above). Explains per-request DB re-hydration,
  the `AuthenticatedUser` shape, and the degraded paths (no DB / transient error → identity
  claims only; deleted user → 401). All verified against `middleware/auth.ts` +
  `types/request.ts`.
- Deliberately does **not** document Payload's `saveToJWT` — no such mechanism exists in
  Dyrected. Stated plainly that there is no way to add custom claims.

---

## High-risk claims — RESOLVED with maintainer (2026-07-11)

1. `DYRECTED_JWT_SECRET` throw timing → **confirmed: startup.** `overview.mdx`/`jwt-strategy.mdx`
   wording ("throw at startup") stands.
2. Reset-token (1h), invite-token (7d), and session (7d) lifetimes → **confirmed correct.**
   No change to `operations.mdx`/`jwt-strategy.mdx`.
3. Next.js example cookie name `dyrected-token` → **confirmed: keep** as the illustrative name.
4. CSRF framing in `cookie-strategy.mdx` → **softened per request.** The page now states the
   neutral fact (the token is not auto-sent; your code attaches the header) and no longer draws
   the stronger "protected from CSRF" conclusion.
5. Old `docs/concepts/auth-model.mdx` (wrong token claims) → **no action needed; that page is
   slated for deletion.** New pages already carry the correct token model.

## Open product/roadmap questions — RESOLVED (2026-07-11)

- Per-user API keys, email verification, collection-level custom strategies → **all planned.**
  The three `__`-prefixed stubs remain parked as placeholders to fill when those ship.
- `adminAuth` (dashboard SSO) → **approved for its own dedicated page** (future work). Enough
  real surface to justify one: OIDC + custom providers, JIT provisioning modes, `resolveAccess`,
  `/api/admin/auth/*` routes. Currently summarized in `overview.mdx` as an interim pointer.
- Project `x-api-key`/`DYRECTED_API_KEY` credential → candidate for full docs under
  `basics/configuration` or `managing-data/sdk-api` (future). Briefly mentioned in `overview.mdx`.
