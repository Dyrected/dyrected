# Docs Audit — Internal Reference
*Not published. For dev use only. Last updated: 2026-05-11*

---

## Completed since last audit

These were previously listed as missing or broken and are now done:

| File | Status |
|---|---|
| `admin/live-preview.md` | ✅ Written — postMessage mode, token mode, React hook, Vue composable |
| `core/auth.md` | ✅ Written — all endpoints including invite/accept-invite, passwordChanged |
| `core/upload.md` | ✅ Written — UploadConfig options, imageSizes, storage URL resolution |
| `api-reference/rest-api.md` | ✅ Written — full endpoint reference, filtering, error codes |
| `api-reference/sdk.md` | ✅ Written — all methods including invite/acceptInvite |
| `adapters/storage.md` | ✅ Expanded — imageSizes, mimeTypes, maxFileSize, URL resolution table |
| `core/configuration.md` | ✅ Expanded — email config summary + link to email.md |
| `core/email.md` | ✅ Written — Ethereal dev fallback, all 4 templates with arg reference, provider examples, custom hooks pattern |
| `adapters/databases.md` | ✅ Factual fix — `SQLiteAdapter` → `SqliteAdapter`, `path` → `filename` |
| `core/fields.md` | ✅ Factual fix — relationship field `collection` → `relationTo` |
| `integrations/nuxt.md` | ✅ Factual fix — `useDyrectedAuth(collection)` required arg, `useDyrectedDoc` destructuring |
| `admin/live-preview.md` | ✅ Factual fix — `useDyrected()` usage, removed non-existent `getPreviewData` |
| `admin/overview.md` | ✅ Factual fix — missing opening code fence on Next.js embedding example |

---

## Still needs work

### Files that exist but are thin or stale

| File | Problem |
|---|---|
| `adapters/databases.md` | No MySQL adapter (`@dyrected/db-mysql` package exists, zero docs). No `DatabaseAdapter` interface definition. No migration guidance. No connection pool config. |
| `deployment/docker.md` | Uses stale `dyrected/vault` image name (no official image published yet). No health check. No Redis config. No volume mount examples. |
| `deployment/vercel.md` | Only 19 lines. No ISR/edge config. No full env var list. No serverless function size limit notes. |
| `api-reference/introduction.md` | Sparse overview — endpoint structure, query params, and error codes are now in `rest-api.md`. This file should link there or be merged. |
| `core/schema.md` | Mostly duplicates `configuration.md`. Should be refocused on auth collections and upload collections specifically, since those have schema-level behaviour. |
| `cloud/workspaces.md` | No site vs workspace distinction. No schema sync via CLI. No license key explanation. |
| `cloud/billing.md` | No plan comparison table. No quota numbers. No overage policy. |
| `core/configuration.md` | `redis` config option is listed in the table but has no example or explanation. |

---

## Still missing entirely

| Missing file | What it should cover |
|---|---|
| ~~`integrations/sdk.md`~~ | ✅ Written — SvelteKit, Astro, Node.js, browser, auth, TypeScript generics |
| `cloud/sites.md` | Site API Keys, Site ID, multi-site per workspace |
| `cloud/schema-sync.md` | CLI `dyrected push` / `dyrected pull` workflow |
| `deployment/railway.md` | Railway one-click deploy |

### Intentionally deferred

| File | Reason |
|---|---|
| `core/locals-and-i18n.md` | Locale/i18n not yet implemented |
