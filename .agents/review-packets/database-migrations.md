# Review Packet — basics/database/migrations.mdx

## Review summary

- Document: Migrations (conceptual + workflow guide, reframed for Dyrected)
- Goal: Reader understands Dyrected has no migration-file workflow — schema sync is automatic, and content changes use `renameTo`/`defaultValue`; Cloud uses `sync:schema`.
- Audience: Developers evolving a schema over time; anyone expecting a Payload/Rails-style `migrate` command.
- Scope: Full page written from stub. Intentionally does **not** mirror Payload's migration-file model.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/cli/src/index.ts` | code | high | Registered commands: `init`, `upgrade`, `generate:types`, `generate:ai-rules`, `sync:schema`. **No `migrate`/`create`/`down`/`status` commands.** |
| `packages/cli/src/commands/sync-schema.ts` | code | high | `sync:schema` POSTs collections/globals/admin to Cloud; uses `DYRECTED_API_KEY`/`DYRECTED_SITE_ID`; `--skip-types`, `--skip-on-error`; regenerates types after success. |
| `packages/core/src/services/defaults.service.ts` | code | high | `renameTo`: when the new `name` is empty, read `result[field.renameTo]` (legacy key) and write it under the new name — lazy read-time migration. `defaultValue` + type defaults (boolean→false, array→[]). |
| `packages/db-*/src/index.ts` (`sync`/`ensureTable`) | code | high | Startup sync creates missing tables + adds promoted columns; additive only (no drop/rename/retype). Mongo has no `sync`. |
| `packages/knowledge/.../recipes` (safe-field-rename) | code | high | Canonical `Customers` `fullName`/`renameTo: 'name'`/`defaultValue: ''` example. |
| `apps/docs/content/docs/adapters/databases.mdx` | old docs | high | Pre-prod checklist (backup, staging, dual-shape rollout). |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Promoting a field on an existing collection | Draft says existing rows are **not** backfilled into the new promoted column automatically | Inferred from code: `ALTER TABLE ADD COLUMN` adds the column; create/update populate it only on write; no backfill routine exists. Not covered by a test. | **YES — confirm backfill behavior** |
| Renaming a field safely | `renameTo` = the **previous** key (fallback source), `name` = new key | Property name `renameTo` reads like the destination, but code + JSDoc + old docs all treat it as the legacy/source key. Draft states the direction explicitly to prevent misuse. Confirm this is the intended semantic (and not a naming bug to fix instead). | **YES — confirm semantics/naming** |
| sync:schema | Cloud-only; self-hosted uses startup sync | Accurate to code. Confirm the mental split (Cloud = explicit push, self-host = automatic) is how we want to teach it. | Docs owner |

## Placeholder sweep

One intentional placeholder remains:

- `NEEDS-HUMAN-VERIFY` (MDX comment in "Promoting a field on an existing collection") — exact backfill behavior when promoting a populated table. Rendered prose already states the conservative/safe interpretation.

## Reviewer questions

1. Is the `renameTo` direction (holds the **old** key; `name` is the **new** key) correct and intended? The property name is easy to misread — should docs also flag it, or should the API be renamed?
2. When a field is newly promoted on an existing table, are historical rows backfilled, or only new writes? Do we recommend a specific backfill procedure?
3. Is `sync:schema` the only schema-to-Cloud path, and are `DYRECTED_API_KEY`/`DYRECTED_SITE_ID` the canonical env var names?
4. Do we ever expect to add a first-class migrations/CLI workflow? If so, this page's framing will need a forward-reference.

## Example consistency

- Uses the `Customers` `fullName`/`name` rename example (from knowledge recipes) for renames, and `posts`-style fields for defaults/promotion. Slight scenario switch between sections; acceptable since each illustrates a distinct mechanic, but reviewer may prefer one domain throughout.

## High-risk areas

- **Deprecations/migrations** — this page IS the migration guidance; a wrong `renameTo` direction would actively cause data to look lost. Highest-priority correctness check after uniqueness.
- Destructive-change guidance (additive-only sync) must stay accurate.

## Dry-run check

Recommended: have a teammate follow the "Renaming a field safely" steps end-to-end on a seeded database and confirm old values surface under the new name and disappear if `renameTo` is removed too early.

## Verification update (code-checked)

Both blocking questions were verified against the code:

- **`renameTo` semantics — confirmed and corrected.** The only consumer is `DefaultsService.apply` (`packages/core/src/services/defaults.service.ts:20-24`), and both call sites (`collection.controller.ts:172` and `:236`) are on the **read path** (afterRead). So `renameTo` is a **read-time alias**: when the new field is empty, the old key's value is surfaced under the new name in the response. It is **not** a schema-sync rename and is **not** written back on read. A document is physically rewritten under the new key only when it is next saved with the new field present (e.g. edited in the admin panel). Direction confirmed: `name` = new key, `renameTo` = previous key. The page's "migrate on their own / read and written" wording was corrected to reflect this. This is intended behavior (dedicated `safe-field-rename` knowledge recipe), **not** a naming bug — but see the JSDoc note below.
- **Promotion backfill — confirmed.** No backfill routine exists in any adapter. `ALTER TABLE ADD COLUMN` adds the column; only new writes populate it. Reads return from the JSON body (so values look correct), but column-based filtering/sorting only sees rows written since promotion. `NEEDS-HUMAN-VERIFY` marker removed; page firmed up.

**Recommended JSDoc fix (systematic).** `packages/core/src/types/schema-core.ts:132` documents `renameTo` as *"Previous storage key to migrate from during schema sync."* The "during schema sync" part is inaccurate — the fallback happens during read materialization in `DefaultsService`, not in adapter `sync()`. This JSDoc also flows into the generated field reference via `@dyrected/knowledge` (`packages/knowledge/src/generated/references.ts`). Suggest updating it to something like: *"Previous storage key. When this field is empty, its value is read from `renameTo` at read time so renamed fields keep working; the value is rewritten under the new key on the next save."* This is a core-package + regeneration change, left for owner approval rather than applied in this docs pass.

## Suggested status label

`ready-for-sme-review` (rename semantics and backfill verified in code; JSDoc correction recommended as a separate follow-up)
