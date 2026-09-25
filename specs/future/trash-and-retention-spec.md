# Trash & Retention Specification

**Document Version:** 0.1.0 (Draft)
**Status:** Proposed
**Scope:** `@dyrected/core` (config, controller, purge task), `@dyrected/sdk`, `@dyrected/admin`, `@dyrected/react`, `@dyrected/vue`, MCP/AI tools, CLI `doctor`
**Adapters:** no `DatabaseAdapter` interface changes

---

## 1. Context & Motivation

Deleting a document in Dyrected is permanent. `collection.controller.ts` runs access → `beforeDelete` → `db.delete()` → audit → `afterDelete` → RAG chunk removal, and the row is gone. The bulk path (`deleteMany`) and the admin's delete buttons work the same way. The docs even carry a recipe, "archive instead of delete", that tells developers to hand-roll soft delete with a status field.

That is the wrong default for editors, and it is a real risk for back-office and fintech apps. One mis-click on a guest list, an order, or a wishlist item destroys data with no recovery short of a database backup.

This spec adds a **trash**: deleting moves a document to a recoverable holding area, and an optional **retention period** (for example 30 or 60 days) permanently removes it automatically. Retention is configurable, and can be turned off entirely so items stay until someone empties the trash.

## 2. Goals & Non-Goals

**Goals**
1. Opt-in trash per collection, with an app-wide default.
2. Retention is a number of days, or **none**: items stay until manually purged.
3. Restore returns the document with its original `id`, so relationships pointing at it work again.
4. Works on all four adapters with no adapter changes and no schema changes to user collections.
5. No read path can leak a trashed document. That includes population, views, aggregates, badges, auth and AI tools.
6. Works on serverless, where there is no reliable in-process timer.

**Non-goals**
- Version history or point-in-time recovery of *edits*. Trash only covers deletion.
- Trashing globals (they cannot be deleted).
- Recovering a document after it has been purged. Purge is permanent by definition.
- Cross-document cascades on restore. See §9.

## 3. Configuration

```ts
// Per collection
defineCollection({
  slug: "guests",
  trash: true,                                   // enabled, inherits app retention
});

defineCollection({
  slug: "orders",
  trash: { retentionDays: 60 },                  // purge 60 days after trashing
});

defineCollection({
  slug: "invoices",
  trash: { retentionDays: null },                // explicit: never auto-purge
});

defineCollection({ slug: "logs", trash: false }); // hard delete (today's behavior)
```

```ts
// App-wide (defineConfig)
trash: {
  enabled: true,                 // every non-system collection defaults to trash
  retentionDays: 30,             // default; null or omitted = keep until manually purged
  purge: { cron: "0 3 * * *", batchSize: 200 },
}
```

```ts
interface TrashConfig {
  /** Days before automatic permanent deletion. `null` or omitted: never auto-purge. */
  retentionDays?: number | null;
  /** Show and allow "Delete forever" in API/UI. Default true. */
  allowPermanentDelete?: boolean;
}
// CollectionConfig.trash?: boolean | TrashConfig
```

### Resolution order

| Collection `trash` | App `trash.enabled` | Result |
|---|---|---|
| `false` | any | hard delete |
| `true` / object | any | trash enabled |
| omitted | `true` | trash enabled |
| omitted | omitted / `false` | hard delete (default, so existing apps are unchanged) |

Retention: `collection.trash.retentionDays` (including explicit `null`) → `app.trash.retentionDays` → none.

**Opt-in by default.** Existing apps keep hard delete until they enable trash. Scaffolds and the docs' getting-started config should enable it.

### Validation (config diagnostics)

- `retentionDays` must be an integer ≥ 1. `0` is rejected. Use `trash: false` for immediate hard delete.
- Values above ~3650 warn (likely a units mistake).
- System collections (`__*`), and the admin's own metadata collections, cannot enable trash.
- `retentionDays` set while `trash: false` → warning (ignored).

## 4. Storage Model: Move to `__trash`, Not a Flag

Two designs were considered.

| | **A. `deletedAt` flag in place** | **B. Move to `__trash` snapshot (chosen)** |
|---|---|---|
| Read-path safety | Every read must add `deletedAt is null`: `find`, `findOne`, population, aggregates, views, badges, auth lookup, AI tools, RAG. One missed path leaks deleted data. | Original table no longer contains the doc. **Every existing read path stays correct with no changes.** |
| Unique fields | Trashed row still owns its unique value (`email`, `slug`). Recreating one fails against a doc the user believes is gone. | Unique index is freed at trash time. |
| Adapter/schema impact | New promoted column plus index on every trash-enabled collection. Partial unique indexes are not portable across the four adapters. | Uses one internal collection, like `__task_locks`. No user-table changes. |
| Restore | Clear a flag. Trivial. | Re-insert with the original `id`. Needs a conflict path (§7). |
| Table bloat | Trashed rows slow every query. | Trash is separate. |

**Chosen: B.** Its cost is the restore-conflict path, which is explicit, testable and user-visible. Design A's cost is a silent data-leak risk that grows with every new read path added to the framework.

### The `__trash` collection

Follows the `__task_locks` precedent (internal collection, registered on demand via `db.sync`, `admin.hidden`, no user access):

```ts
export const TRASH_COLLECTION = "__trash";
export const TRASH_COLLECTION_CONFIG: CollectionConfig = {
  slug: "__trash",
  fields: [
    { name: "collection",   type: "text",   required: true, promoted: true },
    { name: "docId",        type: "text",   required: true, promoted: true },
    { name: "deletedAt",    type: "number", required: true, promoted: true },   // epoch ms
    { name: "purgeAt",      type: "number", promoted: true },                   // epoch ms, null = never
    { name: "deletedBy",    type: "text",   promoted: true },
    { name: "title",        type: "text" },                                     // resolved useAsTitle, for listing
    { name: "snapshot",     type: "json",   required: true },                   // the raw stored document
    { name: "createdAt",    type: "date" },                                     // original doc timestamps live in snapshot
  ],
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  admin: { hidden: true },
};
```

- **Numeric epoch fields** for `deletedAt`/`purgeAt`: same reason `__task_locks.lockedUntil` is numeric, so the purge comparison is a real indexed column compare on every adapter.
- **Deterministic entry id:** `` `${collection}:${docId}` ``. Trashing is idempotent, so a retry after a crash cannot create duplicates.
- **`snapshot` is the raw stored document** (read with `db.findOne` before any `afterRead`, population, or field-access stripping). Restore must be lossless. Field-level read access is applied when *serving* trash entries (§8), never when storing.
- **`purgeAt` is computed and stored at trash time** (`deletedAt + retentionDays`). Later config changes are not retroactive: shortening 60→30 days does not instantly purge everything aged 30–60. Lengthening does not rescue already-scheduled items either. Both are deliberate. An admin can adjust an individual entry with **Keep** (§8).

### Atomic move

Trash: (1) `db.transaction` when available: `create(__trash)` then `delete(original)`. Shipped adapters implement `transaction`. (2) Without a transaction: insert the `__trash` entry **first**, delete second. A crash between them leaves the doc live *and* an orphan trash entry. The next trash attempt is idempotent (deterministic id), and the purge task ignores entries whose live doc still exists. Never delete first.

Restore is the reverse: create the original (explicit `id`, `createdAt`), then delete the `__trash` entry.

## 5. API

Existing routes keep their shape. Behavior changes only for trash-enabled collections.

| Route | Behavior |
|---|---|
| `DELETE /api/collections/:slug/:id` | Trashes. Returns `{ message: "Trashed", trashId, purgeAt }`. |
| `DELETE /api/collections/:slug/:id?permanent=true` | Hard delete. Needs `delete` access and `allowPermanentDelete !== false`. |
| `DELETE /api/collections/:slug/delete-many` | Trashes each id. Response gains `trashed: string[]`. `permanent` supported. |
| `GET /api/collections/:slug/trash` | Paginated trash entries (`page`, `limit`, `sort`, `search` on title). |
| `GET /api/collections/:slug/trash/:id` | One entry with its snapshot. |
| `POST /api/collections/:slug/trash/:id/restore` | Restore. `409` on conflict (§7). |
| `POST /api/collections/:slug/trash/restore-many` | Body `{ ids }`. Per-id result list. |
| `PATCH /api/collections/:slug/trash/:id` | Body `{ purgeAt: <ISO> \| null }`: **Keep**, extend retention or exempt from auto-purge. |
| `DELETE /api/collections/:slug/trash/:id` | Purge one, permanently. |
| `DELETE /api/collections/:slug/trash` | **Empty trash** for this collection. Requires `?confirm=<slug>`. |
| `GET /api/trash` | Cross-collection listing for the admin Trash page. Only collections the user may see (§8). |

Route order: the `trash` routes register before the `/:id` wildcard, the same way `delete-many` and `aggregate` do in `router.ts`.

Upload collections: the media routes (`mediaController.delete`) follow the same rules. See §9.

### Access

Snapshots contain the full document, so trash reads must not become a bypass.

- **List / read a trash entry:** requires `delete` access on the collection. The rule is evaluated against the snapshot (`evaluateAccess(c, "delete", { id, doc: snapshot })`). Entries the user could not have deleted are omitted.
- **Restore:** `access.restore` if defined, else `delete`.
- **Permanent delete / empty:** `delete`, plus `allowPermanentDelete`.
- **Field-level `access.read`** is applied to the snapshot when it is returned, using the same serializer as normal reads.
- `deletedBy` is recorded from the authenticated user. Trashed entries include it.

Row-scoped access that returns a query constraint rather than a boolean cannot be pushed into a JSON snapshot query. v1 evaluates `delete` access per entry after fetching and post-filters. `total` is then an upper bound when scoping is active (Open Question 4).

## 6. Hooks

Trash changes what "delete" means, so hook semantics must be explicit. Cleanup hooks that cascade (delete child records, revoke access, cancel jobs) must **not** fire when the user can still undo the delete.

| Hook | Fires on | Notes |
|---|---|---|
| `beforeDelete` | trash **and** permanent delete | Guards keep working ("cannot delete a guest with an active RSVP"). Receives `mode: "trash" \| "permanent"`. |
| `afterDelete` | **permanent deletion only** (purge, "delete forever", or hard delete when trash is off) | Destructive cascades run when data is truly gone. |
| `beforeTrash` / `afterTrash` | trash only | Side effects such as "notify owner", "unpublish". Full db in `afterTrash`. |
| `beforeRestore` / `afterRestore` | restore only | `afterRestore` is where to re-publish or re-sync. |

`beforeChange`/`afterChange` do **not** run on restore, so create-time side effects (welcome emails, counters) do not fire a second time.

**Behavior change on enabling trash:** an existing `afterDelete` that previously ran at delete time now runs at purge. This is documented in the migration notes, and it is why trash is opt-in.

Purge runs hooks with `user: null` (system actor) and `context.mode = "permanent"`.

## 7. Restore

1. Load the entry and evaluate access (§5).
2. `beforeRestore` hooks (can veto).
3. Re-create the document from `snapshot`: original `id`, original `createdAt`, `updatedAt = now`.
4. Delete the trash entry, `afterRestore`, audit, RAG re-index (§9), return the document.

### Conflicts

| Conflict | Response |
|---|---|
| A unique field value is now held by another document | `409 { code: "restore-conflict", conflicts: [{ field, value }] }` |
| Same `id` already exists (the id was reused) | `409` as above with `field: "id"` |
| A required relationship target is gone | Restores anyway. Same dangling behavior as a hard-deleted target today. |

`POST …/restore` accepts an optional `{ overrides: { field: value } }` body so the UI can offer **"Restore with changes"**: the admin opens the (custom or default) create form prefilled from the snapshot, the editor changes the conflicting value, and the submit calls restore with overrides. Overrides are validated like a normal create and subject to normal field-level write access.

Adapter requirement: `create` must honor a provided `id`, `createdAt` and `updatedAt`. The SQLite adapter does. The others must be **verified and covered by a contract test** before this ships (§12).

## 8. Admin UI

- **Delete affordances** (edit page delete button, list row action, bulk "Delete selected"; see `system-actions.ts`) relabel to **Move to trash** with copy driven by config:
  - `retentionDays: 30` → "Recoverable for 30 days."
  - no retention → "Stays in the trash until someone empties it."
- **Undo toast** after trashing ("Moved to trash · Undo") for ~8 seconds, calling restore.
- **Per-collection Trash view** at `/collections/:slug/trash` (a toolbar toggle "Trash (n)" on the list). Columns: title, deleted by, deleted at, and **"Purges in 12 days"** or **"Kept until emptied"**. Row actions: **Restore**, **Keep** (extend or exempt), **Delete forever**. Bulk restore and bulk delete forever. **Empty trash** is admin-gated with a typed confirmation.
- **Global Trash page** at `/trash` for the cross-collection listing. Register it ahead of the `/:workspaceSlug` catch-all and reserve the slug `trash` (config diagnostic on conflict, same as `pages` in the custom-pages spec). It appears in navigation as a system item and honors the navigation customizer.
- **Preview** of a trashed document is read-only, rendered from the snapshot through the existing detail renderer (or a disabled form).
- **Restore conflicts** open the "Restore with changes" flow (§7).
- **Health:** `adminHealth` gains `trashPurgeOverdue` when retention is configured and entries are past `purgeAt` by more than two cron intervals (the runner is not running). The admin shows a dismissible warning.

## 9. Cross-Cutting Behavior

| Area | Behavior |
|---|---|
| **Uploads / media** | Trashing a media document does **not** delete the stored file or derived transforms. File and variants are removed at **purge** (`storage.delete`). Restore therefore finds the file intact. Folders: trashing a folder is out of scope for v1 (folders hard-delete only if empty, as today). |
| **Relationships** | References to a trashed document dangle the same way as after a hard delete (population returns null). Restore re-links them because the `id` is preserved. Nothing cascades. |
| **RAG / AI** | Vector chunks are removed at trash time, so trashed content cannot surface in AI answers. Restore re-indexes in the background. |
| **AI tools / MCP** | The `delete` tool trashes. Agents cannot permanently delete. A `restore` tool is exposed and gated by `restore` access. |
| **Audit log** | New operations `trash`, `restore`, `purge`, `trash-empty` alongside the existing `delete`. Purge entries record the system actor. |
| **Auth collections** | Trashing a user removes it from the auth collection, so tokens stop resolving because auth middleware re-hydrates the user from the DB on each request. Snapshot includes the password hash, so trash reads on auth collections require `delete` access and the hash is stripped when serving. |
| **Workflows / drafts** | The snapshot carries the document as stored. Where draft/version records live must be confirmed (Open Question 3). |
| **Metrics / aggregates / badges / views** | Unaffected: trashed docs are not in the collection (§4). |
| **Multi-tenancy** | `__trash` entries carry the source document's tenant/site scope. Scoping must match whatever the multi-tenancy design does for internal collections (Open Question 5). |

## 10. Purge

### Built-in task

When any collection resolves to a non-null retention, `createTaskRunner` automatically registers a task (no user wiring):

```ts
defineTask({
  name: "dyrected:trash-purge",
  cron: config.trash?.purge?.cron ?? "0 3 * * *",
  run: async ({ db, logger, signal }) => {
    // repeat until nothing is due or signal aborts:
    //   entries = find __trash where purgeAt <= now, limit batchSize
    //   per entry (isolated, failures logged and skipped):
    //     upload collection → storage.delete(file + variants)
    //     run afterDelete hooks (mode "permanent", user null)
    //     audit "purge"
    //     delete the __trash entry
  },
});
```

- **Idempotent and resumable.** Delete the trash entry last, so a crash mid-entry retries next run.
- **Bounded.** `batchSize` (default 200), stops on `signal` abort, and its lock uses the existing `__task_locks`, so multiple instances do not double-purge.
- Entries with `purgeAt: null` (**no retention**) are never selected. With **no retention configured anywhere**, the task is not registered at all. "No timer" is truly no timer.

### Running it

`createTaskRunner` does not start a timer; the host chooses. This spec keeps that model:

- **Long-lived Node server:** `runner.start()`.
- **Serverless (Vercel, Netlify):** call `runner.runDue()` from the platform cron.
- **Nuxt/Next modules:** should expose a documented, secret-protected cron endpoint wrapping `runDue()`.

There is deliberately **no** opportunistic purge on `GET`. Read requests must not perform destructive writes. Instead the health warning in §8 and a `dyrected doctor` check surface a runner that is not running, using `__task_locks.lastFinishedAt` for the purge task.

## 11. SDK, React & Vue

```ts
// SDK
client.delete("guests", id, { permanent?: boolean });          // trashes when enabled
client.trash("guests").list({ page, limit, search });
client.trash("guests").get(id);
client.trash("guests").restore(id, { overrides? });
client.trash("guests").restoreMany(ids);
client.trash("guests").keep(id, { purgeAt: Date | null });
client.trash("guests").purge(id);
client.trash("guests").empty({ confirm: "guests" });
```

Following the same parity rule as the custom-surfaces specs, the same names exist as a React hook and a Vue composable (useful for custom pages):

```ts
const { entries, total, isLoading, pagination, restore, keep, purge, empty } = useTrash("guests");
```

`useTrash` invalidates the collection list queries on restore so the restored document appears without a manual refetch.

## 12. Testing

- **Adapter contract tests** (`packages/adapter-contract-tests`, run on sqlite, postgres, mysql, mongodb): `create` honors provided `id`/`createdAt`/`updatedAt`; numeric `purgeAt <= now` query and index; deterministic-id idempotent create. **Gate the feature on all four passing.**
- Trash then restore round-trips a document byte-for-byte (nested, blocks, relationships, unique fields), keeps `id` and `createdAt`.
- Unique value is reusable after trash. Restore then returns `409` with the conflicting field, and `overrides` resolves it.
- Read paths: trashed document absent from `find`, `findOne`, population, aggregate, view badges, auth lookup.
- Access: user without `delete` cannot list, read or restore. Field-level read stripping applies to served snapshots.
- Hooks: `beforeDelete` fires on trash with `mode: "trash"`. `afterDelete` fires only on purge/permanent. `afterChange` does not fire on restore.
- Crash safety: simulate failure between insert and delete (no-transaction path). No data loss, and retry is idempotent.
- Purge: honors `purgeAt` (not current config), respects `batchSize` and `signal`, skips `null`, deletes media files, is not registered when no retention exists, does not double-run across two instances.
- Config: resolution table (§3), diagnostics for invalid `retentionDays`.
- Admin: labels and copy per retention mode, undo toast, per-collection and global trash views, "Keep", empty-trash confirmation, health warning.
- AI: agent `delete` trashes. Agent cannot pass `permanent`.

## 13. Implementation Plan

**Phase 1: core**
1. Types and config resolution, diagnostics, `TRASH_COLLECTION_CONFIG`.
2. Controller: trash path in `delete`/`deleteMany`, trash routes, restore with conflict handling, access evaluation.
3. New hooks and audit operations. Media deferral of file deletion.
4. Purge task and auto-registration. Contract tests on all adapters.

**Phase 2: admin**
5. Relabelled delete flows, undo toast, per-collection Trash view, global `/trash`, Keep/empty/restore-with-changes, health warning.

**Phase 3: ecosystem**
6. SDK methods, `useTrash` hook/composable, MCP tools, `dyrected doctor` check, docs (including migrating the "archive instead of delete" recipe), Nuxt/Next cron endpoint helpers.

## 14. Open Questions

1. **Hook semantics** (§6). `afterDelete` = permanent only is the safest for cascades but changes timing for apps that enable trash. Alternative: `afterDelete` on both with `mode`, leaving cascade safety to developers. Recommendation stands, but it is the decision most worth a second opinion.
2. **Admin-editable retention.** Should admins change retention at runtime (via the existing preferences mechanism) instead of only in config? Proposal: config-only in v1. Runtime override is a follow-up.
3. **Drafts and versions.** Where are workflow/draft version records stored, and do they need to move with the document (or be purged with it)? Must be answered before Phase 1 completes.
4. **Row-scoped access on trash listing.** Post-filter (v1) means inaccurate `total`. Is that acceptable, or should `deletedBy`/collection-level scoping columns be promoted for pushdown?
5. **Multi-tenancy.** How does `__trash` scope per site/tenant? Depends on the multi-tenancy design (`specs/TODO-2026-08-21/multitenancy.md`).
6. **Default.** Ship opt-in (this spec), or flip the default to "trash on, 30 days" in a major version?
7. **Trashing folders and their contents** in the media library. Deferred, but the model should not preclude it.
