# Application Audit Report

Date: 2026-07-15
Scope: Security, reliability, concurrency, accessibility, performance, and UI consistency across `@dyrected/core`, `@dyrected/nuxt`, the admin UI, and `apps/example-saas-nuxt`
Audit mode: Read-only code audit
Release recommendation: `Do not ship`

## Executive Summary

The audit found multiple ship-blocking issues:

- A path traversal flaw in local media storage can allow arbitrary file read, write, and delete outside the upload directory.
- The runtime defaults collection and global access to allow when no rule is defined, and static CRUD routes are mounted without route-level auth. In the example app this likely allows anonymous creation of an `admin` user and CMS access.
- Public globals such as navigation and footer can be modified anonymously because they lack update access rules.
- Preview tokens fall back to a hard-coded secret when `DYRECTED_JWT_SECRET` is missing.

In addition to those critical issues, the audit found weaker auth/session handling, public seed routes, replayable reset tokens, upload authorization ordering problems, N+1 data population, inaccessible UI patterns, and demo contact forms that never submit real data.

## Findings

### Critical

#### 1. Arbitrary file read/write/delete via local storage path traversal

- Severity: `Critical`
- Category: `Security`
- Location:
  - [packages/storage-local/src/index.ts](/Users/busola/Work/dyrected/packages/storage-local/src/index.ts:15)
  - [packages/core/src/controllers/media.controller.ts](/Users/busola/Work/dyrected/packages/core/src/controllers/media.controller.ts:187)
- Issue:
  The local storage adapter joins untrusted filenames directly onto filesystem paths for upload, delete, and resolve operations. The media controller passes route params and uploaded filenames through without normalization or containment checks.
- Impact:
  An attacker can potentially read arbitrary local files through media serving, write outside the upload directory during upload, or delete arbitrary files through media deletion when local storage is enabled.
- Evidence:
  - `path.join(this.config.uploadDir, args.filename)` is used in `upload`, `delete`, and `resolve`.
  - `MediaController.serve()` passes `c.req.param("filename")` straight into `storage.resolve(...)`.
  - `MediaController.upload()` passes `file.name` straight into `storage.upload(...)`.
- Reproduction:
  1. Configure the app to use `LocalStorageAdapter`.
  2. Request a media URL with traversal segments such as `/media/../../../../some/file`.
  3. Or upload a multipart file whose filename contains `../`.
  4. Observe filesystem access outside the intended upload root if the underlying path exists.
- Recommended fix:
  Normalize and validate every filename before filesystem use. Reject path separators, `..`, absolute paths, and any resolved path that escapes `uploadDir`. Prefer generated server-side filenames instead of user-provided names.
- Confidence: `Confirmed`

#### 2. Allow-by-default access plus unauthenticated CRUD enables CMS takeover path

- Severity: `Critical`
- Category: `Security`
- Location:
  - [packages/core/src/router.ts](/Users/busola/Work/dyrected/packages/core/src/router.ts:664)
  - [packages/core/src/utils/access-control.ts](/Users/busola/Work/dyrected/packages/core/src/utils/access-control.ts:60)
  - [packages/core/src/router.ts](/Users/busola/Work/dyrected/packages/core/src/router.ts:33)
  - [apps/example-saas-nuxt/dyrected/collections/admin.ts](/Users/busola/Work/dyrected/apps/example-saas-nuxt/dyrected/collections/admin.ts:3)
  - [packages/admin/src/components/auth/auth-gate.tsx](/Users/busola/Work/dyrected/packages/admin/src/components/auth/auth-gate.tsx:161)
  - [packages/admin/src/providers/admin-auth.ts](/Users/busola/Work/dyrected/packages/admin/src/providers/admin-auth.ts:6)
- Issue:
  Static collection/global CRUD routes are mounted without route-level auth. The access-control layer treats undefined access rules as allowed. The example `admin` collection has `auth: true` but no collection-level create/read/update/delete rules.
- Impact:
  An anonymous caller can likely create an `admin` collection record, then authenticate into the admin UI because the admin shell accepts any successful login against the selected auth collection. This is effectively a CMS takeover path.
- Evidence:
  - Static collection routes call `controller.create/find/update/delete` directly.
  - `resolveCollectionAccess()` returns `{ allowed: true }` when access is undefined.
  - `accessGate()` also allows missing rules.
  - The example `admin` collection defines field-level restrictions on `roles` but no collection-level access restrictions.
  - The admin auth gate picks the first auth collection and renders the login page when unauthenticated.
- Reproduction:
  1. Send `POST /api/collections/admin` with `email`, `password`, and profile fields.
  2. Receive a created document if the environment uses the example config as-is.
  3. Log into `/admin` using that credential.
  4. Observe admin-shell access as an authenticated member of the admin auth collection.
- Recommended fix:
  Move to deny-by-default authorization semantics. Require explicit public access declarations. Add mandatory server-side authorization for the admin shell and sensitive collections independent of client UI behavior.
- Confidence: `Confirmed`

#### 3. Public globals can be modified anonymously

- Severity: `Critical`
- Category: `Security`
- Location:
  - [packages/core/src/router.ts](/Users/busola/Work/dyrected/packages/core/src/router.ts:697)
  - [packages/core/src/controllers/global.controller.ts](/Users/busola/Work/dyrected/packages/core/src/controllers/global.controller.ts:100)
  - [apps/example-saas-nuxt/dyrected/globals/navigation.ts](/Users/busola/Work/dyrected/apps/example-saas-nuxt/dyrected/globals/navigation.ts:4)
  - [apps/example-saas-nuxt/dyrected/globals/footer.ts](/Users/busola/Work/dyrected/apps/example-saas-nuxt/dyrected/globals/footer.ts:3)
- Issue:
  `navigation` and `footer` globals do not define `update` access. Because global update defaults to allowed, anonymous callers can patch them.
- Impact:
  A public attacker can deface navigation, insert phishing or malware links, or rewrite footer/legal copy without authentication.
- Evidence:
  - Global patch routes are mounted without auth middleware.
  - `GlobalController.update()` only blocks when `resolveBooleanAccess()` returns `false`.
  - `navigation` and `footer` have no access config.
- Reproduction:
  1. Send `PATCH /api/globals/navigation` with attacker-controlled links.
  2. Refresh the site and observe changed nav items.
  3. Repeat with `footer`.
- Recommended fix:
  Require authenticated admin/editor access for every mutable global. Consider making missing `update` rules deny by default.
- Confidence: `Confirmed`

### High

#### 4. Preview tokens use a hard-coded fallback secret

- Severity: `High`
- Category: `Security`
- Location: [packages/core/src/controllers/preview.controller.ts](/Users/busola/Work/dyrected/packages/core/src/controllers/preview.controller.ts:7)
- Issue:
  Preview token signing falls back to `'dyrected-preview-secret-change-me'` when `DYRECTED_JWT_SECRET` is unset.
- Impact:
  Anyone who knows the fallback can forge preview tokens and fetch arbitrary draft payloads from `/api/preview-data`.
- Evidence:
  `getSecret()` returns the fallback literal instead of failing closed.
- Reproduction:
  1. Deploy without `DYRECTED_JWT_SECRET`.
  2. Sign a JWT with the fallback secret containing preview-shaped payload data.
  3. Request `/api/preview-data?token=...`.
- Recommended fix:
  Remove the fallback and hard-fail preview token mode when the secret is absent.
- Confidence: `Confirmed`

#### 5. Upload authorization runs after persistence

- Severity: `High`
- Category: `Security`
- Location:
  - [packages/core/src/controllers/collection.controller.ts](/Users/busola/Work/dyrected/packages/core/src/controllers/collection.controller.ts:345)
  - [packages/core/src/controllers/collection.controller.ts](/Users/busola/Work/dyrected/packages/core/src/controllers/collection.controller.ts:465)
- Issue:
  Upload-backed collection creates buffer and upload the file before `createAccess` is checked.
- Impact:
  Unauthorized clients can still consume storage, bandwidth, and image-processing resources. Depending on adapter behavior, this can leave orphaned blobs even when the request ends in `403`.
- Evidence:
  `storage.upload(...)` runs before `evaluateAccess(c, 'create', { data })`.
- Reproduction:
  1. Configure an upload collection with restricted create access.
  2. Submit a multipart upload as an unauthorized user.
  3. Observe file persistence or storage-side side effects before the request is rejected.
- Recommended fix:
  Evaluate authentication and collection access before storage writes, or stage uploads temporarily until authorization succeeds.
- Confidence: `Confirmed`

#### 6. Password reset tokens are replayable until expiry

- Severity: `High`
- Category: `Security`
- Location:
  - [packages/core/src/controllers/auth.controller.ts](/Users/busola/Work/dyrected/packages/core/src/controllers/auth.controller.ts:215)
  - [packages/core/src/controllers/auth.controller.ts](/Users/busola/Work/dyrected/packages/core/src/controllers/auth.controller.ts:255)
- Issue:
  Reset tokens are stateless JWTs with no one-time-use tracking, nonce invalidation, or password-version binding.
- Impact:
  A stolen reset link can be replayed multiple times until expiry, even after the password has already been changed once.
- Evidence:
  `resetPassword()` only verifies the token and updates the password; nothing marks the token as spent.
- Reproduction:
  1. Request a reset token.
  2. Use it successfully once.
  3. Reuse the same token before expiry.
  4. Observe that verification still passes.
- Recommended fix:
  Store a reset nonce/version in the user record and embed it in the token, invalidating prior tokens after successful reset.
- Confidence: `High Confidence`

#### 7. Public seed routes can initialize empty environments with attacker data

- Severity: `High`
- Category: `Security`
- Location:
  - [packages/core/src/router.ts](/Users/busola/Work/dyrected/packages/core/src/router.ts:677)
  - [packages/core/src/router.ts](/Users/busola/Work/dyrected/packages/core/src/router.ts:704)
  - [packages/core/src/controllers/collection.controller.ts](/Users/busola/Work/dyrected/packages/core/src/controllers/collection.controller.ts:979)
  - [packages/core/src/controllers/global.controller.ts](/Users/busola/Work/dyrected/packages/core/src/controllers/global.controller.ts:161)
- Issue:
  Seed endpoints are public and only prevent reseeding after the target is non-empty.
- Impact:
  On a fresh environment, a first external caller can populate collections/globals with attacker-chosen data before legitimate initialization occurs.
- Evidence:
  The routes are unauthenticated and `seed()` only checks emptiness.
- Reproduction:
  1. Start from an empty DB.
  2. Call `POST /api/collections/:slug/seed` or `POST /api/globals/:slug/seed`.
  3. Observe persisted attacker-controlled initial content.
- Recommended fix:
  Remove or disable public seed routes in production, or require privileged server-side auth.
- Confidence: `Confirmed`

### Medium

#### 8. Raw internal error messages leak to clients

- Severity: `Medium`
- Category: `Security`
- Location: [packages/core/src/app.ts](/Users/busola/Work/dyrected/packages/core/src/app.ts:72)
- Issue:
  The global error handler returns `err.message` in all environments.
- Impact:
  Database failures, config errors, and internal implementation details can leak to clients and aid attackers or confuse users.
- Evidence:
  The `500` response includes `message: err.message`.
- Reproduction:
  Trigger a server-side exception and inspect the response body.
- Recommended fix:
  Return a generic production-safe error message and log the detailed error only server-side.
- Confidence: `Confirmed`

#### 9. Auth tokens and API key are exposed to browser JavaScript

- Severity: `Medium`
- Category: `Security`
- Location:
  - [packages/nuxt/src/runtime/composables/useDyrectedAuth.ts](/Users/busola/Work/dyrected/packages/nuxt/src/runtime/composables/useDyrectedAuth.ts:11)
  - [packages/vue/src/composables/useDyrectedAuth.ts](/Users/busola/Work/dyrected/packages/vue/src/composables/useDyrectedAuth.ts:28)
  - [packages/nuxt/src/module.ts](/Users/busola/Work/dyrected/packages/nuxt/src/module.ts:281)
- Issue:
  Browser clients store bearer tokens in JS-readable cookie/localStorage, and the module copies `DYRECTED_API_KEY` into public runtime config.
- Impact:
  Any XSS can exfiltrate session tokens. A server-only API key can be unintentionally exposed client-side.
- Evidence:
  - Vue auth defaults to `window.localStorage`.
  - Nuxt auth uses `useCookie(...)` without `httpOnly`.
  - Public runtime config includes `apiKey` from `DYRECTED_API_KEY`.
- Reproduction:
  Inspect browser storage/runtime config in a running app.
- Recommended fix:
  Move to `HttpOnly` secure cookies or a server session boundary. Do not mirror server secrets into `public` runtime config.
- Confidence: `Confirmed`

#### 10. Recursive relationship population is N+1 and will degrade on real datasets

- Severity: `Medium`
- Category: `Performance`
- Location:
  - [packages/core/src/services/population.service.ts](/Users/busola/Work/dyrected/packages/core/src/services/population.service.ts:70)
  - [apps/example-saas-nuxt/app/pages/blog/index.vue](/Users/busola/Work/dyrected/apps/example-saas-nuxt/app/pages/blog/index.vue:1)
- Issue:
  Relationship population fetches related records one-by-one rather than batching by collection and id.
- Impact:
  List pages and admin screens will slow down sharply as content volume grows.
- Evidence:
  The population loop calls `db.findOne(...)` for each related id.
- Reproduction:
  Query a list with `depth: 1` and many related records; observe query count growth proportional to result size.
- Recommended fix:
  Batch relationship IDs per collection and hydrate them in bulk.
- Confidence: `Confirmed`

#### 11. Contact forms simulate success and drop user submissions

- Severity: `Medium`
- Category: `Reliability`
- Location:
  - [apps/example-saas-nuxt/app/components/blocks/ContactForm.vue](/Users/busola/Work/dyrected/apps/example-saas-nuxt/app/components/blocks/ContactForm.vue:30)
  - [apps/example-saas-nuxt/app/pages/contact-us.vue](/Users/busola/Work/dyrected/apps/example-saas-nuxt/app/pages/contact-us.vue:30)
- Issue:
  Both contact forms wait 1.2 seconds and show a success state without sending data anywhere.
- Impact:
  Users believe they contacted the business when no message was actually delivered.
- Evidence:
  `handleSubmit()` only toggles local state after `setTimeout`.
- Reproduction:
  Submit either form and inspect network activity; no backend request is made.
- Recommended fix:
  Wire a real endpoint, handle errors explicitly, and only show success after confirmed delivery.
- Confidence: `Confirmed`

#### 12. Rich text is rendered unsanitized

- Severity: `Medium`
- Category: `Security`
- Location:
  - [apps/example-saas-nuxt/app/pages/blog/[...slug].vue](/Users/busola/Work/dyrected/apps/example-saas-nuxt/app/pages/blog/[...slug].vue:77)
  - [apps/example-saas-nuxt/app/components/blocks/RichText.vue](/Users/busola/Work/dyrected/apps/example-saas-nuxt/app/components/blocks/RichText.vue:11)
  - [packages/vue/src/components/DyrectedRichText.vue](/Users/busola/Work/dyrected/packages/vue/src/components/DyrectedRichText.vue:2)
  - [packages/react/src/components/DyrectedRichText.tsx](/Users/busola/Work/dyrected/packages/react/src/components/DyrectedRichText.tsx:24)
- Issue:
  Rich text HTML is rendered directly with `v-html` / `dangerouslySetInnerHTML` and the codebase relies on authors being trusted.
- Impact:
  If any untrusted or compromised author can write rich text, stored XSS is possible.
- Evidence:
  No sanitization layer was found before render; component comments explicitly tell consumers to sanitize upstream.
- Reproduction:
  Store HTML with scriptable payloads through a rich text field in a trust boundary that allows hostile content.
- Recommended fix:
  Define and enforce a sanitization policy server-side or in the rendering layer whenever untrusted authors exist.
- Confidence: `High Confidence`

#### 13. Form and navigation patterns miss key WCAG support

- Severity: `Medium`
- Category: `Accessibility`
- Location:
  - [apps/example-saas-nuxt/app/components/blocks/ContactForm.vue](/Users/busola/Work/dyrected/apps/example-saas-nuxt/app/components/blocks/ContactForm.vue:69)
  - [apps/example-saas-nuxt/app/components/ThemeToggle.vue](/Users/busola/Work/dyrected/apps/example-saas-nuxt/app/components/ThemeToggle.vue:53)
  - [apps/example-saas-nuxt/app/components/AppNavbar.vue](/Users/busola/Work/dyrected/apps/example-saas-nuxt/app/components/AppNavbar.vue:96)
- Issue:
  The forms do not connect errors to controls with `aria-describedby` / `aria-invalid` and do not announce submission state changes. The theme menu and mobile nav do not manage focus or keyboard escape behavior.
- Impact:
  Screen-reader and keyboard-only users receive incomplete feedback and can lose navigation context.
- Evidence:
  Errors are visual-only paragraphs. Menu/nav state changes are not paired with focus management or live announcement.
- Reproduction:
  Navigate and submit using keyboard/screen reader only.
- Recommended fix:
  Add programmatic error associations, live regions, `aria-expanded`/`aria-controls`, escape handling, and focus restoration/trapping as appropriate.
- Confidence: `Confirmed`

### Low

#### 14. “Log in” CTA points to the contact page

- Severity: `Low`
- Category: `Visual Consistency`
- Location: [apps/example-saas-nuxt/app/components/AppNavbar.vue](/Users/busola/Work/dyrected/apps/example-saas-nuxt/app/components/AppNavbar.vue:81)
- Issue:
  The visible “Log in” action links to `/contact`.
- Impact:
  Misleading navigation and inconsistent user expectations.
- Evidence:
  The navbar label is “Log in” but the target is `to="/contact"`.
- Reproduction:
  Click the desktop navbar “Log in” link.
- Recommended fix:
  Point it to the real auth/admin entrypoint or relabel it to match the destination.
- Confidence: `Confirmed`

## Prioritized Remediation Plan

1. Fix ship blockers first:
   - local-storage path traversal
   - allow-by-default authorization
   - anonymous global mutation
   - admin-shell/server-side authorization hardening
2. Remove insecure production fallbacks and public initialization paths:
   - preview secret fallback
   - public seed routes
   - upload-before-auth behavior
3. Strengthen auth/session integrity:
   - move away from JS-readable bearer storage
   - remove public API key exposure
   - add one-time reset token invalidation
4. Address reliability and scale:
   - batch relationship population
   - wire real contact-form submission/error handling
5. Address accessibility and UI consistency:
   - form semantics and live feedback
   - menu/mobile-nav keyboard behavior
   - misleading labels/targets

## Quick Wins

- Change missing collection/global access rules from allow to deny.
- Add explicit `create`, `update`, and `delete` access rules to `admin`, `media`, `navigation`, and `footer`.
- Remove or lock down `/seed` routes.
- Fail closed when `DYRECTED_JWT_SECRET` is missing for preview token mode.
- Return generic `500` error messages in production.
- Add `aria-invalid`, `aria-describedby`, and live success/error messaging to forms.
- Correct the misleading “Log in” link target.

## Issues Requiring Deeper Architectural Change or Follow-up

- Replace client-stored bearer-token auth with a server-managed session model for admin access.
- Establish a safe filename/object-key contract across storage adapters and media routes.
- Decide whether rich text is always trusted; if not, implement a shared sanitization policy.
- Redesign relationship population to batch and cache reads.
- Review the broader trust model around public schema exposure, dynamic options, and admin capability enforcement.

## Release Recommendation

Recommendation: `Do not ship`

Justification:

- The current implementation contains multiple confirmed security flaws with direct production impact.
- At least one issue can likely lead to unauthorized CMS access in the example app.
- Local storage deployments are exposed to filesystem traversal risk.
- Public-facing site content can be modified anonymously in the example configuration.

## Audit Notes

- This was a read-only repository audit.
- No code was modified as part of the audit itself.
- Findings are based on static review of the checked-out codebase and should be validated against any deployment-specific middleware or infrastructure not present in this repository.
