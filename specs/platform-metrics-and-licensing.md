# Dyrected Platform — Metrics & License Management

This document covers:
1. **What to track** — the key metrics for a headless CMS platform like Dyrected.
2. **How to track it** — lightweight instrumentation strategy.
3. **The License Server** — what it is, what it does, and where it lives.
4. **Architecture Decision** — where to host the dashboard.

---

## Part 1 — Key Metrics for Dyrected

### Business / Growth Metrics

| Metric | Why It Matters | How to Measure |
|---|---|---|
| **MRR (Monthly Recurring Revenue)** | Core health of the SaaS business | Paystack subscription data |
| **New workspaces / month** | Top-of-funnel growth | `workspaces` table, `created_at` |
| **Trial → Paid conversion rate** | Validates pricing + onboarding | Compare trial signups to first payment |
| **Churn rate** | Revenue retention | Subscriptions moved to `cancelled` |
| **ARR by plan** | Revenue distribution | Group subscriptions by `plan` field |
| **Active license count** | Cloud + enterprise health | License server DB |

### Product / Usage Metrics

| Metric | Why It Matters | How to Measure |
|---|---|---|
| **Active sites / workspace** | Indicates customer growth & expansion | Count `sites` per `workspaceId` |
| **API requests / site / day** | Usage depth, scaling signals | Request logs (Hono middleware) |
| **Content writes / site / week** | Engagement — are people actually using it? | `afterCreate` / `afterUpdate` hooks |
| **Media storage used / workspace** | Billing driver, plan enforcement | Already tracked in Redis: `usage:storage:{workspaceId}` |
| **Webhook delivery rate** | System reliability | BullMQ job success/failure ratio |
| **SDK version distribution** | Tells you which package versions are in the wild | `user-agent` header from SDK |

### Operational / Health Metrics

| Metric | Why It Matters | How to Measure |
|---|---|---|
| **API error rate (4xx / 5xx)** | Bugs, bad integrations | Hono error handler, request logs |
| **License key validation latency** | If the license server is slow, boots slow | Instrumented `validateLicenseKey()` |
| **P50 / P95 response time** | API performance | Hono timing middleware |
| **Queue depth (BullMQ)** | Backlog of undelivered webhooks / image jobs | BullMQ metrics API |
| **DB query count / request** | N+1 problems | Drizzle query events or pg_stat |

---

## Part 2 — How to Collect Metrics

### Simple Approach — Start Here

Use **Posthog** (open source, self-hostable) or **Plausible** for product analytics, combined with a simple `events` table in your existing Postgres database for usage telemetry.

**Instrumentation points in `apps/cloud`:**

```ts
// src/analytics.ts
export async function track(event: string, properties: Record<string, any>) {
  await db.create({
    collection: 'platform_events',
    data: {
      event,           // e.g. 'workspace.created', 'site.created', 'api.request'
      properties,      // e.g. { workspaceId, plan, siteCount }
      timestamp: new Date().toISOString(),
    }
  })
}
```

Call it from:
- `workspaces.ts` route — on workspace create, update, delete.
- `invitations.ts` route — on invitation accept (user activated).
- `billing.ts` — on Paystack subscription events.
- The Hono request middleware — for API call counts (sample at 10% to reduce volume).

### License Server Metrics

The license server tracks:
- Total issued keys
- Active / revoked / expired keys
- Validation request counts per key (detect abuse / unexpected multiple instances)
- Keys approaching expiry (for renewal reminders)

---

## Part 3 — License Key Management

### What the License Server Does

The license server is a separate, simple backend that:

1. **Issues keys** — generates a unique key tied to a customer, plan, and optional instance limit.
2. **Validates keys** — `apps/cloud` calls `POST /validate` at boot with the key + instance fingerprint. The server replies `200 OK` (valid) or `403` (invalid/revoked/expired).
3. **Revokes keys** — you can revoke a key via the dashboard (e.g., if a customer churns).
4. **Tracks usage** — logs every validation ping so you know how many instances are running per key.

### Architecture

The license server is intentionally **completely separate** from `apps/cloud`. It must be available 24/7 since cloud instances ping it at boot. It should have its own database, its own deploy, and no runtime dependency on the CMS codebase.

```
┌─────────────────────────┐        boot ping (HTTPS)      ┌─────────────────────┐
│  apps/cloud instance    │ ─────────────────────────────▶ │  License Server      │
│  (customer's server)    │                                 │  (license.dyrected.com) │
└─────────────────────────┘ ◀───────────────────────────── └─────────────────────┘
                              200 OK / 403 Forbidden
```

### Recommended Stack

Given your preference for simple + easy to track:

| Concern | Choice | Reason |
|---|---|---|
| **Backend** | Hono on Node (same as cloud) | Keeps the stack consistent, you already know it |
| **Database** | Postgres (same instance or separate schema) | Simple, no extra infra |
| **Frontend Dashboard** | Next.js (standalone app) | Fast to build, deploy to Vercel/Railway |
| **Auth** | Simple email + password (NextAuth or custom JWT) | You don't need OAuth complexity for an internal tool |
| **Hosting** | Railway or Fly.io | Easy deploys, no k8s overhead |

> **Don't merge this into `apps/cloud`.**  
> The license server needs to be available even when no cloud customer is running. If you embed it in `apps/cloud`, you've created a circular dependency — cloud needs the license server, and the license server is cloud.

### What It Does NOT Need

- It does not need to be multi-tenant.
- It does not need BullMQ or Redis.
- It does not need a CMS. It's a CRUD app with one important endpoint.

---

## Part 4 — Architecture Decision: Where to Put the Dashboard

### Options Considered

| Option | Pros | Cons |
|---|---|---|
| **Merge into `apps/cloud`** | One codebase | Circular dependency; mixes platform admin with license management |
| **Separate Hono backend + separate React/Next.js frontend** | Clean separation, fully typed RPC | Two repos, two deploys, more overhead to set up |
| **Single Next.js app** (full-stack) | One repo, one deploy, fast to iterate | API and UI in one — fine for internal tooling |

### Recommendation — Single Next.js App

For an **internal operations tool** (not customer-facing), a single Next.js app is the right call:

- Next.js API routes handle all CRUD and the `/validate` endpoint.
- The React frontend renders the dashboard.
- Deploy to Vercel or Railway in minutes.
- One repo, one `DATABASE_URL`, easy to maintain.

**Name it:** `apps/platform` (or `apps/license-server` if you want to be explicit).

```
dyrected/
  apps/
    cloud/     ← CMS platform (existing)
    platform/  ← Internal ops: license management + metrics dashboard  ← NEW
    dev/       ← local sandbox
    docs/      ← public docs site
```

### What Goes in `apps/platform`

```
apps/platform/
  app/
    page.tsx                  ← Dashboard home — key metrics summary
    licenses/
      page.tsx                ← License key list + issue / revoke
      [id]/page.tsx           ← Single license detail (validation history, instance count)
    metrics/
      page.tsx                ← Usage charts: MRR, active workspaces, API calls, storage
    workspaces/
      page.tsx                ← Browse all workspaces, subscription status
    api/
      validate/route.ts       ← POST /api/validate — called by apps/cloud at boot
      licenses/route.ts       ← CRUD for license keys
      metrics/route.ts        ← Aggregated metric queries
  lib/
    db.ts                     ← Postgres client (Drizzle or Prisma)
    auth.ts                   ← Simple admin auth (NextAuth)
```

---

## Part 5 — Implementation Checklist

### License Server (Phase 1 — must ship before cloud goes live)

- [ ] Create `apps/platform` Next.js app
- [ ] Schema: `license_keys` table (key, customerId, plan, status, expiresAt, instanceLimit)
- [ ] Schema: `license_validations` table (keyId, instanceId, timestamp, ip)
- [ ] `POST /api/validate` — the endpoint `apps/cloud/src/boot.ts` calls
- [ ] Admin UI: issue a new key, revoke a key, view validation history
- [ ] Protect all admin pages behind simple email/password auth
- [ ] Update `apps/cloud/src/boot.ts` to call the real URL (replace `license.dyrected.com/validate` placeholder)
- [ ] Deploy to Railway/Vercel at `license.dyrected.com`

### Metrics Dashboard (Phase 2)

- [ ] Add `platform_events` table to cloud Postgres (or a separate analytics DB)
- [ ] Instrument the 5 highest-value events: workspace.created, site.created, account.activated, subscription.started, subscription.cancelled
- [ ] Build metrics page: MRR chart, active workspace count, top sites by API usage
- [ ] Pull BullMQ queue depth from Redis for operational health

---

## Table Naming — Core Improvement

> This section captures a required improvement to `@dyrected/core` for multi-tenant correctness.

### Problem

Currently, all sites share the same physical SQL tables, isolated only by `siteId`/`workspaceId` columns injected by the `QueryInterceptor`. A bug in the interceptor = data leak.

### Solution — Prefix Tables with IDs

When the database adapter creates or queries a collection's table, it should prefix the table name with the workspace and site IDs:

```
{workspaceId}_{siteId}_{collectionSlug}

Examples:
  ws_abc123_site_xyz789_posts
  ws_abc123_site_xyz789_media
  ws_abc123_site_xyz789_users
```

### Implementation

The `onSchemaFetch` hook in `apps/cloud/src/config.ts` already stamps `siteId` onto every returned collection. Extend it to also pass a `tablePrefix`:

```ts
onSchemaFetch: async (siteId) => {
  const site = await baseDb.findOne({ collection: 'sites', id: siteId })
  if (!site?.schema) return { collections: [], globals: [] }

  const prefix = `ws_${site.workspaceId}_site_${siteId}`

  return {
    collections: site.schema.collections.map(c => ({
      ...c,
      siteId,
      tablePrefix: prefix,  // ← NEW
    })),
    globals: site.schema.globals.map(g => ({
      ...g,
      siteId,
      tablePrefix: prefix,
    })),
  }
}
```

The database adapters (`@dyrected/db-postgres`, `@dyrected/db-sqlite`, etc.) then resolve the physical table name as:

```ts
function tableName(collection: CollectionConfig): string {
  if (collection.tablePrefix) {
    return `${collection.tablePrefix}_${collection.slug}`
  }
  return collection.slug  // self-hosted default
}
```

This gives physical isolation per site with zero change to the HTTP layer or the `QueryInterceptor`.  
The `QueryInterceptor` can then be simplified — it still stamps `siteId`/`workspaceId` as columns, but it is no longer the **only** isolation mechanism.

> [!IMPORTANT]
> Self-hosted installations are unaffected. When `tablePrefix` is absent (self-hosted), adapters fall back to the plain `slug` as the table name — the existing behavior.

---

*Last updated: May 2026.*
