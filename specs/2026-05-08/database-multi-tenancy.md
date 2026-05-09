# Dyrected Cloud — Database Multi-Tenancy Architecture

This document captures the **architecture decision** for how `apps/cloud` isolates tenant data at the database level, the rationale for choosing schema-per-tenant over alternative approaches, and the full implementation plan.

> [!IMPORTANT]
> This spec **supersedes** the "Table Naming — Core Improvement" sections in `specs/platform-metrics-and-licensing.md` and `apps/cloud-backend-internals.md`. Those sections proposed a table-prefix approach (`wsId_siteId_collectionSlug`). This document adopts **schema-per-workspace** as the definitive strategy.

---

## Background — The Problem

In Dyrected Cloud, every workspace creates its own sites, and every site defines its own collections (e.g., `posts`, `media`, `products`). This means the database will naturally accumulate thousands of tables as the platform grows.

The initial implementation isolated tenants using shared tables with `siteId`/`workspaceId` column filters injected by the `QueryInterceptor`. This is **fragile**:

- A missing filter = data leak across tenants.
- All sites share the same physical `posts` table — schema drift between sites is impossible.
- With thousands of collections across hundreds of workspaces, a single Postgres namespace becomes unmanageable.

The next planned evolution was **table-prefixing** (`ws_abc_site_xyz_posts`). While better than shared tables, it still dumps all tenant tables into a single `public` schema namespace, causing `pg_class` bloat, difficult migrations, and poor ORM integration.

---

## Architecture Decision — Schema-Per-Workspace

### Decision

Each **workspace** gets its own dedicated **Postgres schema**. All sites belonging to that workspace store their collections inside that schema. The global `public` schema is reserved exclusively for cloud-level system tables.

### Why Not Cross-Tenant Queries?

Dyrected's main product does **not** require cross-tenant queries. Every request is scoped to a single site within a single workspace. The only cross-workspace data access happens in the `public` schema for cloud-level operations (billing, licensing, workspace management) — which are handled separately through the cloud-internal routes, not through the tenant content API.

This makes schema-per-workspace a clean fit.

### Why Schema-Per-Workspace (Not Schema-Per-Site)?

| Granularity | Schemas Created | Table Names |
|---|---|---|
| Per site | 1 schema per site | `media`, `posts` |
| **Per workspace** ✅ | 1 schema per workspace | `siteId_media`, `siteId_posts` |
| Per tenant (flat prefix) | 0 extra schemas | `wsId_siteId_posts` |

Schema-per-workspace is the right level because:
- Workspaces are the **billing and team boundary** — natural isolation unit.
- A workspace may have many sites; keeping them in one schema allows workspace-level admin queries when needed (e.g., storage aggregation).
- Fewer schemas to create/manage than schema-per-site.
- Table names within the schema stay short: `{siteId}_{slug}` (e.g., `xyz789_posts`).

---

## Schema Layout

```
Database: dyrected_cloud
│
├── Schema: public                        ← Cloud system tables (never touched by tenant API)
│   ├── workspaces
│   ├── sites
│   ├── accounts
│   ├── workspace_members
│   ├── subscriptions
│   ├── invitations
│   └── platform_events
│
├── Schema: ws_abc123                     ← Workspace A
│   ├── xyz789_posts                      ← Site xyz789, collection: posts
│   ├── xyz789_media                      ← Site xyz789, collection: media
│   ├── xyz789_users
│   ├── mno456_posts                      ← Site mno456, collection: posts
│   └── mno456_media
│
├── Schema: ws_def456                     ← Workspace B
│   ├── stu111_posts
│   ├── stu111_products
│   └── stu111_media
│
└── Schema: ws_ghi789                     ← Workspace C
    ├── vwx222_articles
    └── vwx222_media
```

### Table Name Convention Within a Schema

```
{siteId}_{collectionSlug}

Examples:
  xyz789_posts
  xyz789_media
  mno456_products
```

This is short, human-readable, and avoids the `pg_class` bloat of a flat global namespace.

---

## Benefits Over Previous Approaches

| Concern | Shared Tables (current) | Table Prefix (abandoned) | Schema-Per-Workspace ✅ |
|---|---|---|---|
| **Data isolation** | ❌ Filter-only | ✅ Physical | ✅ Physical |
| **Schema drift between sites** | ❌ Impossible | ✅ Possible | ✅ Possible |
| **Migration complexity** | Low (one table) | High (loop all prefixed tables) | Medium (loop schemas) |
| **ORM integration** | Easy | Hard | Good (`search_path`) |
| **`pg_class` bloat** | Moderate | High | Low (scoped per schema) |
| **Tenant offboarding** | Complex (`DELETE WHERE`) | Complex (`DROP TABLE` loop) | Simple (`DROP SCHEMA CASCADE`) |
| **Cross-tenant query** | Easy | Easy | Hard — not needed ✅ |
| **Postgres limits** | ⚠️ All in one namespace | ⚠️ All in one namespace | ✅ Distributed across schemas |

---

## Implementation Plan

### Phase 1 — Schema Provisioning

**Where:** `apps/cloud/src/db/provisioner.ts` (new file)

When a workspace is created, provision its Postgres schema:

```ts
// apps/cloud/src/db/provisioner.ts

import { db } from './adapter'

export async function provisionWorkspaceSchema(workspaceId: string): Promise<void> {
  const schema = sanitizeSchemaName(workspaceId)
  await db.execute(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
}

export async function deprovisionWorkspaceSchema(workspaceId: string): Promise<void> {
  const schema = sanitizeSchemaName(workspaceId)
  // Drops schema and ALL tables inside it — clean offboarding
  await db.execute(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
}

export function workspaceSchemaName(workspaceId: string): string {
  return sanitizeSchemaName(workspaceId)
}

// Ensures the schema name is safe to interpolate into SQL
function sanitizeSchemaName(id: string): string {
  // Only allow alphanumeric and underscores; prefix with ws_ for clarity
  const safe = id.replace(/[^a-z0-9_]/gi, '_').toLowerCase()
  return `ws_${safe}`
}
```

**Hook into workspace creation** in `apps/cloud/src/routes/workspaces.ts`:

```ts
// After inserting the workspace record:
await provisionWorkspaceSchema(workspace.id)
```

**Hook into workspace deletion:**

```ts
// Before or after deleting the workspace record:
await deprovisionWorkspaceSchema(workspace.id)
```

---

### Phase 2 — Schema-Aware DB Connection

The `QueryInterceptor` must scope each query to the correct Postgres schema by setting `search_path` on the connection.

**Option A — Per-request `search_path` (recommended for PgBouncer compatibility):**

Since `SET search_path` is session-scoped and PgBouncer transaction mode resets sessions, use the explicit schema prefix on every query instead:

```ts
// apps/cloud/src/db/interceptor.ts

function resolveTableName(collection: CollectionConfig, siteId: string): string {
  const schemaName = workspaceSchemaName(collection.workspaceId)
  const tableName = `${siteId}_${collection.slug}`
  return `"${schemaName}"."${tableName}"`
  // → "ws_abc123"."xyz789_posts"
}
```

**Option B — Connection-string `search_path` (simpler, without PgBouncer):**

```ts
// Construct a tenant-scoped connection
const schema = workspaceSchemaName(workspaceId)
const tenantPool = new Pool({
  connectionString: `${process.env.DATABASE_URL}?options=--search_path%3D${schema},public`
})
```

> [!NOTE]
> Option A (explicit schema prefix in every query) is recommended because it is fully compatible with PgBouncer in transaction mode and doesn't rely on session state.

---

### Phase 3 — Collection Table Provisioning

When a site's schema changes (new collection added), create the corresponding table inside the workspace schema:

```ts
// apps/cloud/src/db/provisioner.ts (extended)

export async function provisionCollectionTable(
  workspaceId: string,
  siteId: string,
  collection: CollectionConfig
): Promise<void> {
  const schema = workspaceSchemaName(workspaceId)
  const table = `${siteId}_${collection.slug}`
  const columns = buildColumnDefinitions(collection.fields)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "${schema}"."${table}" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ${columns},
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

export async function deprovisionCollectionTable(
  workspaceId: string,
  siteId: string,
  slug: string
): Promise<void> {
  const schema = workspaceSchemaName(workspaceId)
  await db.execute(`DROP TABLE IF EXISTS "${schema}"."${siteId}_${slug}"`)
}
```

**Trigger:** Call `provisionCollectionTable` from the `onSchemaFetch` hook or from the schema-update endpoint when a user adds a new collection in the Admin UI.

---

### Phase 4 — Update `onSchemaFetch`

Replace the `tablePrefix` approach with a `schemaName` property:

```ts
// apps/cloud/src/config.ts

onSchemaFetch: async (siteId) => {
  const site = await baseDb.findOne({ collection: 'sites', id: siteId })
  if (!site?.schema) return { collections: [], globals: [] }

  const schemaName = workspaceSchemaName(site.workspaceId)

  return {
    collections: site.schema.collections.map(c => ({
      ...c,
      siteId,
      workspaceId: site.workspaceId,
      schemaName,                          // ← replaces tablePrefix
      dbTableName: `"${schemaName}"."${siteId}_${c.slug}"`,  // resolved name
    })),
    globals: site.schema.globals.map(g => ({
      ...g,
      siteId,
      workspaceId: site.workspaceId,
      schemaName,
      dbTableName: `"${schemaName}"."${siteId}_${g.slug}"`,
    })),
  }
}
```

The database adapters (`@dyrected/db-postgres`) then use `collection.dbTableName` directly instead of constructing a name from `slug`:

```ts
// packages/db-postgres/src/adapter.ts

function resolveTable(collection: CollectionConfig): string {
  // Cloud mode: fully qualified schema.table name provided
  if (collection.dbTableName) return collection.dbTableName
  // Self-hosted fallback: plain slug
  return collection.slug
}
```

> [!IMPORTANT]
> Self-hosted installations are completely unaffected. When `dbTableName` is absent (no `onSchemaFetch` hook set), adapters fall back to the plain `slug` as the table name — identical to the existing behavior.

---

### Phase 5 — Migrations for Existing Tenants

For any workspaces already provisioned with the old shared-table or prefixed-table approach:

```ts
// apps/cloud/src/scripts/migrate-to-schemas.ts

async function migrateAllWorkspaces() {
  const workspaces = await baseDb.find({ collection: 'workspaces' })

  for (const ws of workspaces) {
    // 1. Create schema
    await provisionWorkspaceSchema(ws.id)

    // 2. Get all sites for this workspace
    const sites = await baseDb.find({
      collection: 'sites',
      where: { workspaceId: ws.id }
    })

    for (const site of sites) {
      const schema = site.schema
      if (!schema) continue

      for (const collection of schema.collections ?? []) {
        // 3. Create new scoped table
        await provisionCollectionTable(ws.id, site.id, collection)

        // 4. Copy data from old shared table (if applicable)
        const oldTable = `ws_${ws.id}_site_${site.id}_${collection.slug}`
        const newTable = `"ws_${ws.id}"."${site.id}_${collection.slug}"`
        await db.execute(`
          INSERT INTO ${newTable}
          SELECT * FROM "${oldTable}"
          ON CONFLICT DO NOTHING
        `)
      }
    }
  }
}
```

Run this as a one-time migration script before switching the query resolver to the new approach.

---

## Connection Pooling

Use **PgBouncer** in **transaction mode** between `apps/cloud` and Postgres.

Because schema selection is handled via **explicit schema-qualified table names** (Option A above) rather than `SET search_path`, PgBouncer transaction mode is fully compatible — no session state needs to persist between transactions.

```
apps/cloud → PgBouncer (transaction mode) → Postgres
              ↑ pool of 20–50 real connections
              shared across all tenant requests
```

Set `max_client_conn = 1000` in PgBouncer to handle concurrent API traffic.

---

## Redis Caching

Schema resolution can be cached to avoid a `sites` table lookup on every request:

```ts
// Already exists in the codebase — extend to cache resolved schema names too
const cacheKey = `schema:${siteId}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

// ... resolve from DB ...

await redis.setex(cacheKey, 300, JSON.stringify(resolved)) // 5-minute TTL
```

Invalidate on schema update:

```ts
await redis.del(`schema:${siteId}`)
```

---

## Tenant Offboarding

Deleting a workspace is now a single SQL statement:

```sql
DROP SCHEMA "ws_abc123" CASCADE;
```

This atomically removes all tables (all sites, all collections) for that workspace. No loops, no orphaned rows.

---

## Checklist

### Phase 1 — Schema Provisioning
- [ ] Create `apps/cloud/src/db/provisioner.ts` with `provisionWorkspaceSchema` and `deprovisionWorkspaceSchema`
- [ ] Call `provisionWorkspaceSchema` on workspace creation in `routes/workspaces.ts`
- [ ] Call `deprovisionWorkspaceSchema` on workspace deletion in `routes/workspaces.ts`

### Phase 2 — Query Layer
- [ ] Update `QueryInterceptor` to use explicit `"schema"."table"` qualified names
- [ ] Remove `workspaceId`/`siteId` column filters as the primary isolation mechanism (keep as belt-and-suspenders)
- [ ] Verify PgBouncer transaction mode compatibility

### Phase 3 — Collection Provisioning
- [ ] Add `provisionCollectionTable` and `deprovisionCollectionTable` to `provisioner.ts`
- [ ] Trigger table creation when a collection is added via the Admin UI (schema update endpoint)
- [ ] Trigger table deletion when a collection is removed

### Phase 4 — `onSchemaFetch` & Adapters
- [ ] Update `onSchemaFetch` in `apps/cloud/src/config.ts` to return `schemaName` and `dbTableName`
- [ ] Update `@dyrected/db-postgres` adapter to use `collection.dbTableName` when present
- [ ] Verify self-hosted (no `dbTableName`) still resolves to plain `slug` — no regression

### Phase 5 — Data Migration
- [ ] Write `apps/cloud/src/scripts/migrate-to-schemas.ts`
- [ ] Test migration on staging with a representative set of workspaces
- [ ] Run migration on production with a maintenance window
- [ ] Drop old prefixed tables after validation

### Operational
- [ ] Configure PgBouncer in transaction mode in production
- [ ] Add schema existence check to workspace health endpoint
- [ ] Document schema naming convention in internal runbook

---

*Last updated: May 2026. Supersedes table-prefix approach documented in `platform-metrics-and-licensing.md` and `cloud-backend-internals.md`.*
