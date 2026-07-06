# Guides Documentation — Review Packet & Uncertainty Register

Consolidated across three revision passes to `apps/docs/content/docs/guides/` (the 20-guide section).

**Status:** `reviewed-needs-revision` — factual pass verified against source; a few claims still need SME/product sign-off before `verified-final`.

---

## Review summary

- **Document:** The 20 guides under `apps/docs/content/docs/guides/`
- **Goal:** Align guides with `DOCS_PHILOSOPHY.md` + `writing-heuristics.md`, and correct factual inconsistencies against the real `@dyrected/*` API.
- **Audience:** Developers new to Dyrected — competent but unfamiliar with internals.
- **Passes:** (1) safe philosophy fixes, (2) codebase-verified factual corrections, (3) voice/heuristics fixes.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core` (router, controllers, types, auth, workflows) | code | High | Routes, access args, roles, field types, workflow, createdBy |
| `packages/sdk`, `next`, `react`, `nuxt`, `vue` | code | High | Client accessors, hooks, live-preview API, admin mounting |
| `packages/storage-*`, `db-*` | code | High | Adapter class names + constructor options |
| `packages/knowledge`, `cli` | code | High | Skill name (`dyrected`), CLI-generated files |
| `dyrected-pro/apps/cloud` | code | High | `x-api-key` / `x-site-id` semantics (cloud-only) |
| `apps/example-saas-nuxt` | code | High | Real usage reference (admin page, collections) |
| Original guide prose | docs | Medium | Some behavioral claims predate the edits and were NOT re-verified |

## Placeholder sweep

- No `NEEDS-HUMAN-VERIFY` / `NEEDS-SCREENSHOT` / `NEEDS-DIAGRAM` / `NEEDS-CODE` markers remain.
- `live-preview/snacktrack-demo.mp4` — **exists on disk** (823 KB), verified.

---

## Confirmed findings (verified AFTER the initial packet — these are doc BUGS to fix)

| # | File | Claim in the doc | Reality (verified) | Fix |
| --- | --- | --- | --- | --- |
| **F1** | building-a-blog.mdx §6, and nuxt-dynamic-pages.mdx | "The Admin UI **mounts automatically at `/admin`** when you add the `@dyrected/nuxt` module." | **FALSE.** `packages/nuxt/src/module.ts` auto-imports the `<DyrectedAdmin>` *component* (line 84) and CSS, but never registers a page route (no `extendPages`/`addTemplate` for admin). The `adminPath` option (default `"cms"`) is used only for a dev-server startup **log line** (line 231–233). The developer must create the page themselves — confirmed by `apps/example-saas-nuxt/app/pages/admin.vue`, which hand-writes `<DyrectedAdmin basename="/admin" />`. | Reword: adding the module auto-imports `<DyrectedAdmin>`; you create a page (e.g. `pages/admin.vue`) rendering `<DyrectedAdmin basename="/admin" />` to choose the route. Remove the "mounts automatically" claim and the self-contradiction. |

---

## Uncertainty register

Tier A = verified in code. Tier B = general-knowledge glosses inserted. Tier C = **open, needs SME/product decision.**

### Tier C — OPEN, needs SME or product decision

| # | Section / file | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- | --- |
| ~~C1~~ **RESOLVED** | RBAC, adding-auth, invite, hooks, forms — every `user.roles?.includes(...)` in **server-side `access` functions** | Docs teach reading `user.roles` inside access functions | **Closed (2026-07-06).** `core/src/middleware/auth.ts` now has `resolveUser(token, config)` which re-fetches the full user doc via `db.findOne({ collection, id: sub })`, strips `password`, and merges token claims — the same record `GET /me` returns. So `user.roles`, `user.id`, and any collection field now work in access functions **and** hooks. One DB read per authenticated request (cacheable). Purpose tokens (invite/reset) skip hydration; deleted users → 401. Test: `core/src/__tests__/auth-hydration.test.ts`. **The standardized docs are now correct at runtime — no doc change needed.** | None — resolved in code. Do NOT revert `resolveUser` to token-only; the docs depend on it. |
| C2 | migrating-to-workflows §4 migration script | Script writes `__workflow` and `__published` directly via `db.update({ data: {...} })` | Not verified that `db.update` accepts direct writes to reserved/internal keys. **Irreversible production migration.** | Confirm the write path is supported; if not, provide the supported migration. |
| C3 | separating-admin-auth (lines 6, 54–58) | "Admin UI logs in using the first collection with `auth: true`"; `__admins` fallback order | Pre-existing prose; "reserved slug" glossed but resolution order not verified in code. | Confirm Admin login resolution order + `__admins` as reserved default. |
| C4 | invite-only:75 | "Dyrected signs a **7-day** token marked `purpose: 'invite'`" | TTL + payload are pre-existing claims, not verified in code. | Confirm invite token TTL and payload shape. |
| C5 | editorial-approval §4 (authored during review) | `submit → publish → unpublish` sequence + capability names + reading current revision | `transition()` + `expectedRevision` verified (`workflows.ts`); capability names from original prose. | Confirm capability names + canonical revision-read pattern. |

### Tier B — Glosses inserted (general knowledge; a few Dyrected-specific)

| # | File:line | Inserted gloss | Confidence | Reviewer needed |
| --- | --- | --- | --- | --- |
| B1 | adding-auth:6, audit-trail:21 | "JWT is a JSON Web Token — a signed token the browser holds to prove who's logged in" | High (general) | Spot-check wording |
| B2 | ai-integration:48 | "Jexl is a small, safe expression language that travels as a string" | Med — Jexl general; "travels as string / stripped on cloud sync" is Dyrected-specific | Confirm cloud-sync stripping description |
| B3 | admin-sso:6 | "OIDC (OpenID Connect, the standard identity layer built on OAuth)" | High (general) | Spot-check |
| B4 | editorial-approval:72 | "the public snapshot — the published copy of the post that anonymous visitors see" | Med-High — matches `workflows.ts` (`__published` → `_workflow`) | Confirm snapshot = what anon users receive |
| B5 | separating-admin-auth:14 | "reserved slug `__admins` — a slug Dyrected treats specially, wiring it up as the dashboard's login" | Med (tied to C3) | Confirm with C3 |
| B6 | invite-only:75 | "Ethereal, a built-in dev mail catcher" | High — consistent with sending-email | Spot-check |
| B7 | enterprise-core:195 | "idempotent (safe to run more than once)" | High (general) | Spot-check |
| B8 | nuxt-dynamic-pages:6 | "headless CMS: the content API and the frontend stay separate" | High (general) | Spot-check |

### Tier A — Verified against code (low uncertainty; listed for transparency)

| # | Claim | Source (file:line) |
| --- | --- | --- |
| A1 | REST prefix `/api/collections/{slug}`, `/api/globals/{slug}` | `core/src/router.ts:450,514` |
| A2 | `getDyrectedClient()` exists in `@dyrected/next`; `getDyrectedAuth()` does NOT | `next/src/index.ts:9` |
| A3 | `useDyrected()` returns `{ client }` | `react` / `next` re-export |
| A4 | Nuxt exposes `useDyrectedCollection`, not `useDyrectedFind` | `nuxt/src/module.ts:112` |
| A5 | `S3StorageAdapter`, `LocalStorageAdapter` (uploadDir/staticUrlPrefix, no baseUrl), `PostgresAdapter({ url })` | `storage-s3:17`, `storage-local:10`, `db-postgres:9` |
| A6 | User role field is `roles` (array); core auto-injects it | `core/types/request.ts:31`, `utils/config.ts:137` |
| A7 | Access args are `({ user, doc, data, req })` — no `id`, no `req.user` | `core/types/access.ts:33` |
| A8 | `createdBy`/`updatedBy` auto-injected, stamped from `user.sub` on write | `core/controllers/collection.controller.ts:295` |
| A9 | Field type is `richText` (camelCase) | `core/types/schema-core.ts:6` |
| A10 | `x-api-key` = API auth (cloud), `x-site-id` = tenant select | `dyrected-pro/apps/cloud/src/middleware/tenant.ts:9` |
| A11 | `expectedRevision` (transition arg) vs `revision` (stored) — both correct | `core/workflows.ts:244`, `types/workflows.ts:58` |
| A12 | `useDyPath` is a hook (uses `useContext`) → must be called unconditionally | `react/src/hooks/useDyPath.ts:23` |
| A13 | Skill name is `dyrected` (not `dyrected-cms`) | `knowledge/generated/SKILL.md:1` |
| A14 | `<DyrectedAdmin>` is an auto-imported component; admin route is NOT auto-registered | `nuxt/src/module.ts:84`; example `app/pages/admin.vue` |

---

## Reviewer questions (ranked)

1. **(C1, top priority)** Do server-side `access` functions receive `user.roles`, or only `sub`/`email`/`collection`? If the latter, how should role checks be written?
2. **(C2)** Does `db.update` accept direct writes to `__workflow` / `__published`? Is the migration script safe in production?
3. **(C3/B5)** What is the Admin login collection resolution order, and is `__admins` the reserved default?
4. **(C4)** Invite token: 7-day TTL and `purpose: 'invite'` — correct?
5. **(C5)** Workflow capability names (`submit`/`publish`/`reject`/`unpublish`) and canonical revision read?
6. **(B2)** Is the Jexl / cloud-sync-stripping description accurate?

## Example consistency

- Each guide uses one running example (blog→`posts`, live-preview→SnackTrack, forms→`contact-requests`). The one mid-guide switch (`sermons` in file-uploads) was removed in Pass 3.
- All code placeholders explain substitutions (`yourFields`, `your-site-id`, env vars) — no bare `[...]` / `/* ... */` remain.

## High-risk areas

- **Auth / permissions:** C1 (roles in JWT), C3 (admin login resolution). Affect whether access control actually works.
- **Breaking / migration:** C2 (irreversible workflow migration).
- **Field semantics:** `createdBy` auto vs manual — resolved to auto (A8).
- **Framework examples:** F1 (Nuxt admin mounting) is a confirmed bug to fix; client accessors standardized (A2–A4) — worth a dry run in real Next + Nuxt apps.

## Dry-run recommendation

1. **adding-auth + RBAC** — does an admin-gated route actually block a non-admin? (surfaces C1)
2. **migrating-to-workflows** — run the script against a throwaway DB (surfaces C2)

## Not changed, still SME-unverified (out of edit scope)

admin-sso `resolveAccess`/`provisioningMode`; audit `__audit` schema; ai-integration component-registration API; enterprise-core `onSchemaFetch`/`events.handlers`. Flag for a separate reference-accuracy pass.
