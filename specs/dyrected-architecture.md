# Dyrected — Architecture & Infrastructure Decisions

This document captures all architectural decisions made for the Dyrected project: monorepo setup, package structure, open core / commercial split, deployment modes, and the workspace/site hierarchy.

---

## Monorepo

### Tooling

**pnpm workspaces** with **Turborepo** for task orchestration.

- pnpm for package management — faster installs, leaner disk usage via global content-addressable store, strict dependency resolution (no phantom dependencies)
- Turborepo on top for build ordering, task caching, and parallel dev servers
- Start with pnpm workspaces alone if needed — add Turborepo the moment build order or CI times become friction

### Workspace Structure

```
dyrected/
  pnpm-workspace.yaml
  turbo.json
  package.json
  packages/
    core/               ← open source, published to npm
    db-postgres/        ← open source, published to npm
    db-mysql/           ← open source, published to npm
    db-mongodb/         ← open source, published to npm
    db-sqlite/          ← open source, published to npm
    storage-s3/         ← open source, published to npm
    storage-b2/         ← open source, published to npm
    storage-cloudinary/ ← open source, published to npm
    storage-local/      ← open source, published to npm
    sdk/                ← open source, published to npm
    next/               ← open source, published to npm
    nuxt/               ← open source, published to npm
    admin/              ← open source, published to npm
    cli/                ← open source, published to npm
  apps/
    cloud/              ← PRIVATE, never published, Docker only
    docs/               ← public documentation site
    dev/                ← local development sandbox
```

### Root Config Files

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

```json
// root package.json
{
  "name": "dyrected",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "latest"
  }
}
```

### Package Naming

All published packages are scoped under `@dyrected`:

```
@dyrected/core
@dyrected/db-postgres
@dyrected/db-mysql
@dyrected/db-mongodb
@dyrected/db-sqlite
@dyrected/storage-s3
@dyrected/storage-b2
@dyrected/storage-cloudinary
@dyrected/storage-local
@dyrected/sdk
@dyrected/next
@dyrected/nuxt
@dyrected/admin
@dyrected/cli
```

### Cross-Package References

Use the `workspace:*` protocol so pnpm resolves packages from the local monorepo during development and replaces them with real version numbers on publish.

```json
// packages/next/package.json
{
  "name": "@dyrected/next",
  "dependencies": {
    "@dyrected/core": "workspace:*"
  }
}
```

---

## Open Core / Commercial Split

### The Model

Dyrected follows an open core model:

- `@dyrected/core` and all `packages/*` are open source and published to npm
- `apps/cloud` is closed source, never published, and only ships inside the managed Docker image for cloud customers

This means there is no env flag to flip, no code to unlock, and nothing hidden inside the open source binary. Cloud features do not exist in `@dyrected/core` at all — they live in a completely separate private package.

### Package Responsibilities

```text
dyrected/
├── packages/
│   ├── core/           # Hono-based CMS engine
│   ├── sdk/            # Universal client library
│   ├── next/           # Next.js adapter
│   ├── nuxt/           # Nuxt adapter
│   ├── cli/            # Code generator and sync tool
│   ├── db-*/           # Database adapters (postgres, sqlite, etc)
│   └── storage-*/      # Storage adapters (s3, local, etc)
├── apps/
│   ├── admin/          # The shared dashboard (React/Shadcn)
│   └── cloud/          # Managed platform (Private/Closed Source)
├── examples/           # Starter templates (Next, Nuxt, React, Vue)
```

```
@dyrected/core  →  self-hosted engine
                   collections, globals, auth, access control
                   all database and storage adapters
                   all framework adapters
                   everything a self-hosted user needs

apps/cloud      →  cloud layer, wraps @dyrected/core
                   workspace management
                   multi-site resolution
                   billing routes
                   schema-from-DB system
                   license key validation
                   cloud admin features
```

### Why This Works

Someone who clones the open source repo and sets any env var they like still only has `@dyrected/core`. The workspace and multi-site code does not exist in that binary. There is no flag that bridges the gap — they would need the private `apps/cloud` package, which never ships publicly.

---

## License Key System

Cloud mode requires a valid license key. Without one, the app runs as self-hosted regardless of any other config.

### How It Works at Boot

```ts
// apps/cloud/src/boot.ts
async function resolveMode(): Promise<'cloud' | 'self-hosted'> {
  const key = process.env.DYRECTED_LICENSE_KEY
  if (!key) return 'self-hosted'

  const valid = await validateLicenseKey(key)
  if (!valid) {
    console.warn('[dyrected] Invalid or missing license key. Running in self-hosted mode.')
    return 'self-hosted'
  }

  return 'cloud'
}

async function validateLicenseKey(key: string): Promise<boolean> {
  const res = await fetch('https://license.dyrected.com/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key,
      product: 'dyrected-cloud',
      instanceId: getInstanceId(),
    }),
  })
  return res.ok
}
```

### What the License Controls

| Tier | License Key | What they get |
|---|---|---|
| Open source / self-hosted | None required | One site, schema from config file |
| Cloud (managed, paid) | Issued automatically | Full cloud — workspaces, multi-site, admin schema management |
| Enterprise self-hosted | Issued by you | `apps/cloud` Docker image + license key, self-managed infra |

### Self-Hosted Has No MODE Flag

`MODE` does not appear in the public docs or the self-hosted `.env`. Self-hosted is simply the default when no license key is present.

```env
# Self-hosted .env — no DYRECTED_LICENSE_KEY
JWT_SECRET=your-jwt-secret
DATABASE_URL=postgres://...
# REDIS_URL=redis://... (optional for self-hosted)
```

```env
# Cloud / enterprise .env
DYRECTED_LICENSE_KEY=your-issued-key
JWT_SECRET=your-jwt-secret
DATABASE_URL=postgres://...
REDIS_URL=redis://... (required for cloud)
```

---

## Deployment Modes

### How Modes Map to Packages

| Mode | Package | Schema source | Multi-site | Workspaces |
|---|---|---|---|---|
| Self-hosted | `@dyrected/core` | `dyrected.config.ts` | ❌ | ❌ |
| Embedded (Next/Nuxt) | `@dyrected/next` or `@dyrected/nuxt` | `dyrected.config.ts` | ❌ | ❌ |
| Cloud managed | `apps/cloud` (private) | Database, via admin UI | ✅ | ✅ |
| Enterprise self-hosted | `apps/cloud` (private, licensed) | Database, via admin UI | ✅ | ✅ |

### Self-Hosted and Embedded Are the Same Code Path

Embedded (Next.js / Nuxt) is self-hosted running inside a framework adapter. One installation, one site, schema from config file. The only difference is how the Hono app is mounted.

```ts
// self-hosted standalone
import { serve } from '@hono/node-server'
import { dyrected } from '@dyrected/core'

serve({ fetch: dyrected.fetch, port: 3000 })

// embedded Next.js — same core, different mount
import { handle } from 'hono/vercel'
import { dyrected } from '@dyrected/core'

export const { GET, POST, PUT, PATCH, DELETE } = handle(dyrected)
```

---

## Workspace and Site Hierarchy

### The Model

```
Workspace  →  Sites  →  Collections / Globals / Content
```

This hierarchy only exists in cloud mode. In self-hosted mode both layers are implicit singletons — they exist in the database schema but are pre-seeded at boot and never exposed in the API or admin UI.

### Definitions

**Workspace** — the billing and team boundary. An agency typically has one workspace. Manages: billing, team members, roles, workspace invites.

**Site** — the content boundary. One site = one website. Each site has its own collections, globals, schema, and API key. The SDK always points at a site, never at a workspace. Manages: content, schema, API keys, storage config.

### Agency Examples

```
Agency workspace
  ├── clientA.com          (site)
  ├── clientA-staging.com  (site)
  ├── clientB.com          (site)
  └── clientC.com          (site)
```

If a client wants separate billing and their own login:

```
ClientB workspace
  ├── main-site.com        (site)
  └── campaign-site.com    (site)
```

### Site Resolution Middleware

The `resolveSite()` middleware is the single point where cloud and self-hosted diverge at runtime.

```ts
// packages/core/src/middleware/resolveSite.ts
export const resolveSite = () => async (c: Context, next: Next) => {
  if (!config.isCloud) {
    // self-hosted: pre-resolved at boot, no DB lookup
    c.set('site', config._singletonSite)
    c.set('workspace', config._singletonWorkspace)
    return next()
  }

  // cloud: resolve from API key on every request
  const apiKey = c.req.header('x-api-key')
  if (!apiKey) return c.json({ error: true, code: 'MISSING_API_KEY' }, 401)

  const site = await db.findSiteByApiKey(apiKey)
  if (!site) return c.json({ error: true, code: 'INVALID_API_KEY' }, 401)

  c.set('site', site)
  c.set('workspace', site.workspace)
  return next()
}
```

---

## Application Entry Point

The entire backend is a single Hono application exported from `@dyrected/core`.

```ts
// packages/core/src/index.ts
import { Hono } from 'hono'
import { authRoutes } from './routes/auth'
import { collectionsRoutes } from './routes/collections'
import { globalsRoutes } from './routes/globals'
import { schemasRoutes } from './routes/schemas'
import { workspacesRoutes } from './routes/workspaces'

export const dyrected = new Hono()
  .route('/auth', authRoutes)
  .route('/workspaces', workspacesRoutes)
  .route('/collections', collectionsRoutes)
  .route('/globals', globalsRoutes)
  .route('/schemas', schemasRoutes)

export type DyrectedApp = typeof dyrected
```

Framework adapters mount this app — they do not wrap or extend it.

### Next.js Adapter

```ts
// packages/next/src/index.ts
import { handle } from 'hono/vercel'
import { dyrected } from '@dyrected/core'

export const { GET, POST, PUT, PATCH, DELETE } = handle(dyrected)
```

### Nuxt / Nitro Adapter

```ts
// packages/nuxt/src/runtime/plugin.ts
import { fromNodeMiddleware } from 'h3'
import { dyrected } from '@dyrected/core'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.h3App.use('/api/dyrected', fromNodeMiddleware(dyrected.fetch))
})
```

### Standalone

```ts
// apps/dev/src/index.ts
import { serve } from '@hono/node-server'
import { dyrected } from '@dyrected/core'

serve({ fetch: dyrected.fetch, port: 3000 })
```

---

## Middleware Stack

```ts
dyrected.use('*', cors())
dyrected.use('*', rateLimiter())
dyrected.use('*', requestId())
dyrected.use('*', logger())
dyrected.use('/collections/*', resolveSite())
dyrected.use('/globals/*',     resolveSite())
dyrected.use('/workspaces/*',  authenticate())
dyrected.use('/collections/*', authenticate({ optional: true }))
dyrected.use('/globals/*',     authenticate({ optional: true }))
```

`authenticate({ optional: true })` attaches the user to context if a valid token is present but never rejects unauthenticated requests — the collection's own access functions make that decision.

---

## CI Strategy

Two separate pipelines in the same monorepo.

### Open Source Pipeline

Runs on every push to `main`. Builds and tests all `packages/*`. Publishes to npm on version tag.

```yaml
# .github/workflows/packages.yml
- run: pnpm install
- run: turbo build --filter='./packages/*'
- run: turbo test --filter='./packages/*'
```

### Cloud Pipeline

Runs on pushes to `main` that touch `apps/cloud`. Builds the private Docker image and pushes to your private registry. Never publishes to npm.

```yaml
# .github/workflows/cloud.yml
- run: pnpm install
- run: turbo build --filter='./apps/cloud'
- run: docker build -t dyrected/cloud:latest .
- run: docker push your-private-registry/dyrected/cloud:latest
```

`apps/cloud/package.json` always has `"private": true`. An accidental `pnpm publish` from the root will never touch it.

---

## Decision Log

| Decision | Choice | Reason |
|---|---|---|
| Package manager | pnpm | Faster installs, strict deps, leaner disk via content store |
| Monorepo orchestration | Turborepo | Build ordering, caching, incremental CI — low config overhead |
| Open/closed split | `packages/` open, `apps/cloud` closed | No env flag to abuse — cloud code doesn't exist in the OSS binary |
| Cloud gate | License key, not MODE flag | Key must be issued by you — can't be self-generated |
| MODE env var | Removed from public surface | Presence of `DYRECTED_LICENSE_KEY` is the only signal |
| App instance name | `dyrected` | Avoids naming conflicts |
| Self-hosted scope | One site per installation | Matches embedded framework use case; multi-site is a cloud revenue feature |
| Site resolution | `x-api-key` header | Clean, stateless, works across runtimes |
| Schema source | Config file (self-hosted) / DB (cloud) | Self-hosted schema changes require deploy — intentional, matches developer workflow |

---

*This document reflects decisions made during initial architecture planning.*
