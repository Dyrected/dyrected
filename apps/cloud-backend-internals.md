# Dyrected Cloud — Backend Internals

This document is a technical reference for anyone working on or debugging `apps/cloud`.  
It explains how the cloud backend boots, how multi-tenancy works, how the database layer is scoped, and the role of each key file.

> [!NOTE]
> `apps/cloud` is **closed source** and never published to npm. It wraps `@dyrected/core` with workspace management, multi-tenancy, billing, and license-gate logic. See `specs/dyrected-core-vs-cloud.md` for a high-level comparison.

---

## Directory Layout

```
apps/cloud/
  src/
    boot.ts          ← Entry point — wires everything together and starts the server
    config.ts        ← Cloud-specific Dyrected config (collections + schema fetch hook)
    env.ts           ← Zod-validated environment variables
    redis.ts         ← Shared Redis client (ioredis)
    queue.ts         ← BullMQ queues (webhook delivery, image processing)
    worker.ts        ← BullMQ worker process
    auth/            ← (reserved for cloud auth helpers)
    billing/         ← (reserved for billing helpers)
    db/
      adapter.ts     ← Instantiates the base database adapter (postgres)
      interceptor.ts ← QueryInterceptor — auto-scopes every DB query to (siteId, workspaceId)
    middleware/
      tenant.ts      ← resolveSite() — reads x-api-key, sets siteId + workspaceId on Context
      usage.ts       ← checkSiteLimit(), checkStorageLimit() — enforces plan quotas
    routes/
      auth.ts        ← /cloud/auth/* — cloud account registration, login, JWT
      invitations.ts ← /cloud/invitations/* — workspace invite flow
      workspaces.ts  ← /cloud/workspaces/* — CRUD for workspaces + sites
      billing.ts     ← /cloud/billing/* — Paystack webhooks + subscription status
      webhooks.ts    ← /cloud/webhooks/* — outbound webhook delivery status
```

---

## Boot Sequence (`src/boot.ts`)

The boot process runs once at startup in this order:

```
1. Load environment  (env.ts via side-effect import)
2. Start BullMQ worker (worker.ts via side-effect import)
3. Create a bare Hono app (cloudApp)
4. Register global error handler
5. Register CORS middleware
6. Register AsyncLocalStorage middleware  ← threads Hono Context through the DB layer
7. Mount cloud IAM routes  (/cloud/auth, /cloud/workspaces, /cloud/billing, etc.)
8. Register tenant resolution middleware  (/api/* routes require x-api-key)
9. Mount the @dyrected/core CMS engine at /
10. Start the HTTP server
```

### License Key

The boot file reads `DYRECTED_LICENSE_KEY` from the environment.  
If it is missing the process exits immediately with a fatal error — there is no fallback to self-hosted mode inside `apps/cloud`. The self-hosted experience lives in `@dyrected/core` standalone.

---

## Environment Variables (`src/env.ts`)

| Variable | Required | Description |
|---|---|---|
| `DYRECTED_LICENSE_KEY` | ✅ | Issued license key. Process will not start without this. |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string (required for queues, rate limiting, session sync) |
| `JWT_SECRET` | ✅ | Secret for signing access tokens |
| `PORT` | — | HTTP port (default: `3000`) |
| `NODE_ENV` | — | `development` \| `production` |
| `CLOUD_DASHBOARD_URL` | — | Origin of the admin dashboard (used for CORS allow-list in production) |
| `PAYSTACK_SECRET_KEY` | — | Required if billing routes are active |

---

## Multi-Tenancy — How It Works

Every request that touches CMS content goes through two layers before reaching the database.

### Layer 1 — Tenant Resolution (`src/middleware/tenant.ts`)

The `resolveSite()` middleware reads the `x-api-key` header, looks up the matching site in the `sites` table, and stores two values on the Hono Context:

```ts
c.set('siteId', site.id)
c.set('workspaceId', site.workspaceId)
```

If the header is missing or invalid, the middleware returns `401 Unauthorized` immediately — no request reaches the CMS engine without a resolved site.

**Routes that bypass tenant resolution:**
- `/cloud/auth/*` — cloud account login/registration
- `/cloud/workspaces/*` — workspace and site management
- `/cloud/billing/*` — Paystack webhook receiver
- `/api/docs` and `/api/openapi.json` — public spec endpoints

### Layer 2 — Query Interceptor (`src/db/interceptor.ts`)

The `QueryInterceptor` wraps the real database adapter and intercepts every read and write call. It reads `siteId` and `workspaceId` from the `AsyncLocalStorage` context (which mirrors the Hono Context) and silently injects them into every query.

```
find()       → adds WHERE siteId = ? AND workspaceId = ?
findOne()    → adds WHERE siteId = ? AND workspaceId = ?
create()     → adds siteId and workspaceId to the INSERT data
update()     → adds siteId and workspaceId to the UPDATE data
delete()     → adds WHERE siteId = ? AND workspaceId = ?
getGlobal()  → adds WHERE siteId = ? AND workspaceId = ?
updateGlobal() → adds siteId and workspaceId to the UPDATE data
```

**Why AsyncLocalStorage?**  
`@dyrected/core` calls the `DatabaseAdapter` interface directly — it has no knowledge of HTTP context. `AsyncLocalStorage` threads the current Hono request context through the call stack invisibly, so the interceptor can read it without any changes to core.

**Side-effects in `create()`:**
- When creating a `sites` document, `checkSiteLimit()` is called to enforce the workspace's plan quota.
- When creating a `media` document, `checkStorageLimit()` is called and the storage usage cache key is invalidated afterwards.

---

## Cloud Config (`src/config.ts`)

The cloud config is a standard `defineConfig()` call with two additions specific to the platform:

### 1. Cloud System Collections

These collections are declared in `config.ts` and are **hidden from the CMS admin UI** (`admin: { hidden: true }`). They are managed exclusively through the `/cloud/*` API routes.

| Collection | Purpose |
|---|---|
| `workspaces` | Billing and team boundary |
| `sites` | Content boundary — holds `apiKey` and `schema` (JSON) |
| `accounts` | Cloud identity (workspace owners + members). Intentionally named `accounts` not `users` to avoid collision with site-level user collections managed by self-hosted instances |
| `workspaceMembers` | Join table: account ↔ workspace with role (`owner`, `admin`, `editor`) |
| `subscriptions` | Paystack subscription records tied to a workspace |
| `invitations` | Pending email invitations with time-limited tokens |

### 2. `onSchemaFetch` Hook

This is the critical hook that enables **schema-from-DB** (cloud mode).

```ts
onSchemaFetch: async (siteId) => {
  const res = await baseDb.findOne({ collection: 'sites', id: siteId })
  if (res?.schema) {
    const { collections = [], globals = [] } = res.schema
    return {
      collections: collections.map(c => ({ ...c, siteId })),
      globals:     globals.map(g => ({ ...g, siteId })),
    }
  }
  return { collections: [], globals: [] }
}
```

When a request arrives for a site, `@dyrected/core` calls `onSchemaFetch(siteId)` to get that site's collection and global definitions. In self-hosted mode this hook is never set — the schema comes from `dyrected.config.ts` at boot time. In cloud mode, the admin UI writes schema changes into the `sites.schema` JSON column and the hook reads it back on every request (with Redis caching in production).

> [!IMPORTANT]
> The `siteId` is stamped on every collection/global definition returned by this hook. This is how the Query Interceptor knows which SQL table prefix or row filter to apply when handling requests for that site's content.

---

## Table Naming — Architecture Decision

> [!IMPORTANT]
> The table naming strategy has been finalized. See **`specs/database-multi-tenancy.md`** for the complete architecture decision, rationale, and implementation plan.

### Summary

Each **workspace** gets its own dedicated **Postgres schema** (`ws_{workspaceId}`). Tables within that schema are named `{siteId}_{collectionSlug}`.

```
dyrected_cloud
├── public                    ← Cloud system tables (workspaces, sites, accounts, billing)
├── ws_abc123                 ← Workspace A's schema
│   ├── xyz789_posts
│   ├── xyz789_media
│   └── mno456_posts
└── ws_def456                 ← Workspace B's schema
    ├── stu111_products
    └── stu111_media
```

The `onSchemaFetch` hook resolves the fully qualified `"schemaName"."tableName"` for every collection and passes it to the database adapter as `dbTableName`. Adapters use this directly when present, and fall back to the plain `slug` for self-hosted installations.

---

## Routes Reference

All cloud management routes are mounted under `/cloud/`.

### Auth (`/cloud/auth`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/cloud/auth/register` | Create a new cloud account |
| `POST` | `/cloud/auth/login` | Login, returns access + refresh tokens |
| `POST` | `/cloud/auth/refresh` | Rotate refresh token |
| `GET` | `/cloud/auth/me` | Returns the authenticated account |

### Workspaces (`/cloud/workspaces`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/cloud/workspaces` | List workspaces for current account |
| `POST` | `/cloud/workspaces` | Create a new workspace |
| `GET` | `/cloud/workspaces/:id` | Get a specific workspace |
| `PATCH` | `/cloud/workspaces/:id` | Update workspace |
| `DELETE` | `/cloud/workspaces/:id` | Delete workspace |
| `GET` | `/cloud/workspaces/:id/sites` | List sites in a workspace |
| `POST` | `/cloud/workspaces/:id/sites` | Create a new site |
| `PATCH` | `/cloud/workspaces/:id/sites/:siteId` | Update a site |
| `DELETE` | `/cloud/workspaces/:id/sites/:siteId` | Delete a site |
| `GET` | `/cloud/workspaces/:id/members` | List workspace members |

### Invitations (`/cloud/invitations`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/cloud/invitations` | Send a workspace invitation email |
| `POST` | `/cloud/invitations/accept` | Accept an invitation via token |

### Billing (`/cloud/billing`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/cloud/billing/webhook` | Paystack event receiver |
| `GET` | `/cloud/billing/subscription` | Get current subscription status |

---

## Redis Usage

| Key Pattern | Purpose |
|---|---|
| `ratelimit:{ip}` | Global rate limiting |
| `preview:{token}` | Short-lived preview tokens (15 min TTL) |
| `usage:storage:{workspaceId}` | Cached storage usage in bytes — invalidated on media create/delete |
| `session:{accountId}` | Optional server-side session data |

---

## Queue Architecture

`apps/cloud` uses **BullMQ** for background tasks. The queue client is defined in `src/queue.ts` and the worker in `src/worker.ts`.

| Queue | Jobs |
|---|---|
| `webhooks` | Deliver outbound webhooks on collection events with retry backoff |
| `image-processing` | Generate `imageSizes` variants on upload for large images |

Jobs are enqueued from collection hooks defined in the `onSchemaFetch`-resolved collections. The worker runs in the same process in development and as a separate container in production.

---

## Self-Hosted vs Cloud Quick Reference

| Concern | Self-Hosted (`@dyrected/core`) | Cloud (`apps/cloud`) |
|---|---|---|
| Schema source | `dyrected.config.ts` at boot | `sites.schema` JSON column, via `onSchemaFetch` |
| Table naming | `{slug}` | `"ws_{workspaceId}"."siteId_slug"` — see `specs/database-multi-tenancy.md` |
| Tenant isolation | None (single site) | `resolveSite()` middleware + `QueryInterceptor` |
| License | Not required | `DYRECTED_LICENSE_KEY` required at boot |
| Redis | Optional | Required |
| Auth | `@dyrected/core` JWT per collection | Cloud accounts + per-site JWT |
| Billing | Not included | Paystack integration |

---

*Last updated: May 2026. Reflects `apps/cloud` as it exists in the current monorepo.*
