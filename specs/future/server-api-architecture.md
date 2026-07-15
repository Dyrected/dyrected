# Server API (in-process data access) — Architecture Spec

**Status:** Proposed / future
**Package:** `@dyrected/core` (server-only)
**Working name:** Server API — `createServerClient(config)`

## Summary

Dyrected today has exactly two ways to read and write content, with nothing between them:

1. **`@dyrected/sdk`** — a remote HTTP client. Every call (`client.collection('posts').find()`) issues an HTTP request to `/api/...`. It runs the full pipeline (access control, hooks, workflow materialization, validation) but pays a network round-trip and can only talk over HTTP.
2. **`config.db`** — the raw `DatabaseAdapter`. In-process and fast, but it bypasses *everything*: no access control, no hooks, no validation, no workflow draft/published materialization.

Trusted server code — seed scripts, migrations, background jobs, React Server Components in the self-hosted app — is stuck choosing between a loopback HTTP request and raw SQL/Mongo with no safety rails.

This spec proposes a **Server API**: a third entry point that runs the *same pipeline as the HTTP controllers* but is called in-process with plain typed arguments instead of an HTTP request. It is the Dyrected equivalent of Payload's Local API.

```
  @dyrected/sdk (client.find)  ──HTTP──▶  Controller  ─┐
                                                        ├─▶  CollectionService  ──▶  db adapter
  createServerClient (server) ──in-process────────────┘        (access, hooks,
                                                                 workflow, validation)
  config.db (raw) ─────────────────────────────────────────────────────────────────▶  db adapter
                                                          (bypasses the pipeline)
```

## Motivation

- **Seeds & migrations** currently drop to raw `config.db`, so they skip `beforeChange` hooks and validation and can write documents the HTTP path would reject.
- **Background jobs** (the future "Automations") need to mutate content without issuing loopback HTTP calls to their own server.
- **RSC / server actions** in a self-hosted Next/Nuxt app fetch through `/api` today — an avoidable round-trip when the CMS runs in the same process.
- There is no supported "do this as user X, respecting their access rules, but without HTTP" primitive.

## Non-goals

- **Not** a client-side / SDK feature. This never ships in `@dyrected/sdk`; there is no `client.db`. The remote SDK stays HTTP-only, precisely so an access-bypassing API cannot be pulled into a browser bundle.
- **Not** a replacement for `config.db`. Raw adapter access remains for the lowest-level cases (system collections, adapter internals).
- **Not** a new transport or auth mechanism. It reuses the existing access resolver, hook runner, and configured adapter.

## Current architecture (the constraint)

The blocker is that controllers are coupled to Hono's `Context`. `CollectionController.find` reads query params off `c`, pulls `user`/`config`/`siteId` off `c`, and interleaves HTTP parsing with the actual logic (access evaluation, `beforeRead` hooks, workflow-draft filtering, depth resolution, `db.find`). See `packages/core/src/controllers/collection.controller.ts`.

Because the logic lives inside `Context`-shaped methods, it cannot be called from anywhere that doesn't have a Hono request. The Server API is therefore blocked on decoupling that logic from transport.

## Design

### Step 1 — Extract a Context-free service layer

Split each controller method into two:

- a **service** method that takes plain args + a request scope and performs the logic
- a thin **controller** method that parses HTTP → calls the service → serializes the result

```ts
// NEW: packages/core/src/services/collection.service.ts

export interface FindArgs {
  where?: Where
  limit?: number
  page?: number
  sort?: string
  depth?: number
}

export interface RequestScope {
  user?: AuthenticatedUser | null
  req: HookRequestContext        // synthesized, not a Hono request
  overrideAccess?: boolean       // trusted bypass of access control only
  siteId?: string                // for onSchemaFetch multi-tenant resolution
}

export class CollectionService {
  constructor(private config: DyrectedConfig, private collection: CollectionConfig) {}

  async find(args: FindArgs, scope: RequestScope): Promise<PaginatedResult> {
    const db = this.config.db!
    let where = sanitizeWhereClause(args.where, this.collection.fields)

    where = (await runCollectionHooks(this.collection.hooks?.beforeRead, {
      req: scope.req, query: where, user: scope.user, db: createReadonlyDb(db),
    })) ?? where

    if (this.collection.workflow && !canViewWorkflowDraft(this.collection.workflow, scope.user)) {
      where = and(where, { __published: { exists: true } })
    }

    if (!scope.overrideAccess) {
      const access = await resolveCollectionAccess(
        this.config, this.collection.slug, 'read',
        this.collection.access?.read,
        { user: scope.user, req: scope.req },
      )
      if (!access.allowed) throw new DyrectedError(403, 'Access denied')
      if (access.constraint) where = mergeWhereConstraint(where, access.constraint)
    }

    return db.find({ collection: this.collection.slug, where, limit: args.limit ?? 10, /* page, sort, depth */ })
  }
}
```

The controller collapses to a translator:

```ts
async find(c: Context<DyrectedContext>) {
  const result = await this.service.find(
    { where: parseWhere(c), limit: capLimit(c), page: pageOf(c), sort: c.req.query('sort'), depth: depthOf(c) },
    { user: c.get('user'), req: this.toHookRequestContext(c), siteId: c.get('siteId') },
  )
  return c.json(result)
}
```

This refactor is the bulk of the work and is independently valuable: it untangles logic from transport and makes controllers unit-testable without a synthetic HTTP context. It can be done one method at a time behind the existing controller tests, which should stay green throughout.

### Step 2 — The Server API surface

Once services exist, `createServerClient` is a thin, ergonomic wrapper deliberately shaped like `@dyrected/sdk` so knowledge transfers:

```ts
import { createServerClient } from '@dyrected/core'
import config from './dyrected.config'

const server = createServerClient(config)

// Mirrors the SDK's client.collection(...).find()
const { docs } = await server.collection('posts').find({
  where: { status: { equals: 'published' } },
  sort: '-createdAt',
})

// Act AS a specific user — full access rules apply
await server.collection('posts').create({ data }, { user: editor })

// Trusted bypass — seeds, migrations, admin jobs
await server.collection('posts').update(id, { data }, { overrideAccess: true })

// Globals
const settings = await server.global('settings').get()
```

`createServerClient` instantiates one `CollectionService` per collection, synthesizes a `HookRequestContext` marked `source: 'local'` (so hooks that branch on transport can detect it), and threads per-call `{ user, overrideAccess, siteId }` into the `RequestScope`.

### Step 3 — Access & hook semantics

| Call style | Access control | Hooks | Workflow drafts | Intended for |
| --- | --- | --- | --- | --- |
| default (no `user`) | runs as **unauthenticated** | ✅ run | published only | public-equivalent reads |
| `{ user }` | runs **as that user** | ✅ run | per that user's capabilities | "do this as Alice" |
| `{ overrideAccess: true }` | **skipped** | ✅ still run | all | seeds, migrations, cron |
| raw `config.db` (today) | skipped | ❌ skipped | raw | adapter-level last resort |

**Invariant:** `overrideAccess` skips access control **only** — never hooks, never validation. A seed with `overrideAccess: true` still runs `beforeChange`, so it cannot persist a document the HTTP path would have rejected. This is the line that keeps the bypass safe-ish and is the whole reason to prefer the Server API over raw `config.db`.

### Multi-tenant resolution

Deployments using `onSchemaFetch` resolve config per `siteId` at request time. The Server API must accept `siteId` per call and resolve the tenant's config (the same `mergeDynamicConfig` path the controllers use); otherwise it silently operates on the base config — a real footgun for tenant deployments. Open question: whether `siteId` is bound once at `createServerClient(config, { siteId })` construction or passed per call. Recommendation: allow both — a default at construction, overridable per call.

## Where it lives & safety model

- Exported from **`@dyrected/core`**, never `@dyrected/sdk`. Enforce with an entry-point boundary (e.g. a `@dyrected/core/server` subpath) so bundlers can't pull it client-side.
- No new access or auth code: it reuses `resolveCollectionAccess`, `runCollectionHooks`, `canViewWorkflowDraft`, and the configured `DatabaseAdapter`.
- The dangerous capability (`overrideAccess`) is opt-in per call and only reachable from code that already holds the server `config` — i.e. trusted code.

## Phasing

1. **Extract `CollectionService.find`** and reduce `CollectionController.find` to a translator. Keep tests green. Proves the seam.
2. Extract `findOne`, `create`, `update`, `delete` the same way.
3. Add `createServerClient` over those five methods + `global().get()/update()`. Ship.
4. (Later, only if needed) extend to `upload`, `transition`, `changePassword`, `deleteMany`. Resist doing this in v1.

Ship the CRUD core first and stop. The controller surface is large; regrowing all of it into the Server API is scope creep.

## Risks & trade-offs

- **Cost is Step 1, not Step 2.** The wrapper is trivial; extracting ~10 controller methods without behavioral regressions is the real work. Each method currently fuses HTTP parsing with logic, so each is careful, test-covered surgery.
- **Behavioral drift.** If the controller and service diverge over time, HTTP and in-process callers get different results. Mitigation: the controller must call the service — never reimplement logic — so there is one code path.
- **`source: 'local'` semantics.** Hooks that assume a real HTTP request (reading headers, IP) must tolerate a synthesized `req`. Audit existing hooks for `req` assumptions before shipping.
- **Scope creep** (see Phasing).

## Naming

Working name **Server API / `createServerClient`**, chosen over the original `createLocalClient`.

- `createLocalClient` — rejected: "local" reads as *localhost* or *local storage*, not "in-process."
- **`createServerClient`** — recommended: parallels the SDK's `createClient` (same model, opposite side of the wire) and states the one safety-relevant fact — it runs on the server, never a browser.
- `createDirectClient` — "direct" hints at raw-DB access, which this is not.
- `createInProcessClient` — accurate but clunky.
- `createInternalClient` — "internal" is overloaded.

Final name is not locked; if `createServerClient` is confused with "an SDK used on a server," reconsider `createInProcessClient`.

## Open questions

1. `siteId` binding — at construction, per call, or both? (Recommendation: both.)
2. Should the default (no `user`) run as unauthenticated, or should omitting `user` require an explicit `{ overrideAccess: true }` to avoid accidental public-scoped reads in server code?
3. Do we expose `transition` (workflow) in v1, given jobs are a likely early consumer for scheduled publishing?
4. Entry-point enforcement: separate `@dyrected/core/server` export, lint rule, or runtime guard?
