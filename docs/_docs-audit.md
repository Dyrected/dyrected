# Docs Audit — Internal Reference
*Not published. For dev use only.*

## Files that need full rewrites or significant expansion

| File | Current size | Problem |
|---|---|---|
| `integrations/nextjs.md` | 1.3 KB | No SDK usage, no auth collection setup, no PATCH for ISR cache clearing, no live preview hook |
| `integrations/nuxt.md` | 925 B | No runtimeConfig setup, no all composables listed, no SSR vs client-only guidance |
| `adapters/databases.md` | 1.4 KB | No migration info, no connection pool config, no multi-tenancy note, no DatabaseAdapter interface |
| `adapters/storage.md` | 1.3 KB | No upload config (`imageSizes`, `mimeTypes`, `maxFileSize`), no public URL explanation, no multi-provider note |
| `cloud/workspaces.md` | 1 KB | No site vs workspace distinction, no schema sync via CLI, no license key explanation |
| `cloud/billing.md` | 1.2 KB | No plan comparison table, no quota numbers, no overage policy detail |
| `deployment/vercel.md` | 643 B | No ISR/edge config, no serverless function size limit workaround, no env var full list |
| `deployment/docker.md` | 767 B | Uses stale `dyrected/vault` image name, no health check, no Redis config, no volume mounts |
| `api-reference/introduction.md` | 1.1 KB | No endpoint structure, no where/sort/limit query params, no error codes |
| `core/schema.md` | 1.3 KB | Mostly duplicates configuration.md; should cover upload collections and auth collections specifically |
| `core/configuration.md` | 4.4 KB | Already decent but missing `email` config, `redis` config, and `shared` collections |

## Files missing entirely

| Missing file | What it should cover |
|---|---|
| `admin/live-preview.md` | Full guide: enabling, React hook, Vue composable, postMessage vs token mode |
| `core/auth.md` | Auth collections (`auth: true`), login/logout endpoints, JWT structure, `me` endpoint |
| `core/upload.md` | Upload collections (`upload: true`), `UploadConfig` options (`imageSizes`, `mimeTypes`), storage URL resolution |
| `core/email.md` | Email config, built-in auth emails, custom templates |
| `core/locals-and-i18n.md` | (future) Locale support if/when added |
| `api-reference/rest-api.md` | Full REST endpoint reference: collections, globals, auth, media, schemas |
| `api-reference/sdk.md` | `@dyrected/sdk` client methods: `find`, `findOne`, `create`, `update`, `delete`, `upload` |
| `integrations/sdk.md` | Framework-agnostic SDK usage (vanilla JS, SvelteKit, etc.) |
| `cloud/sites.md` | Site API Keys, Site ID, multi-site per workspace |
| `cloud/schema-sync.md` | CLI `dyrected push` / `dyrected pull` workflow |
| `deployment/railway.md` | Railway one-click deploy |
