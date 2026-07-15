# Review Packet — `features/audit/overview.mdx`

**Deliverable type:** Configuration guide with a light reference lean (enable a flag, understand the entry shape, read it back).
**Reader outcome:** After this page a reader knows what audit logging captures, how to turn it on, what each entry contains, how to read the trail from the SDK and the admin, and how to control who can read it.
**Status:** Review-ready, not final.

## Payload equivalent + extracted template

**No clean Payload equivalent.** Payload has no first-class audit-log docs page — only an Enterprise **marketing** page (`/enterprise/audit-logs`, value-prop + CTA, no config/API) and its **Versions** feature as the tangential change-history story. So there was no Payload page to mirror. I borrowed the Versions/reference arc instead: concept → when to use → enable → what's recorded → read it → admin → access control. This gap is expected, not an oversight.

## Source inventory

| Source | Why it matters | Trust | Notes |
|---|---|---|---|
| Current `new-docs/.../audit/overview.mdx` | Base to build on | High | already accurate against real schema |
| `packages/core/src/services/audit.service.ts:19-38` | What's persisted | High | fire-and-forget; `console.error` on failure |
| `packages/core/src/utils/config.ts:34-47` | `__audit` shape + lockdown | High | fields + `access: () => false`, `admin.hidden` |
| `packages/core/src/controllers/audit.controller.ts:92` | `readAudit ?? read` access | High | verified |
| `packages/sdk/src/index.ts:85-93, 492, 604-616` | `AuditEntry`, `collection(slug).audit()`, `audit()` | High | signatures verified |
| `apps/docs/content/docs/guides/audit-trail.mdx` | Old doc | **Low** | **materially wrong** — do not reuse (see below) |

## What changed vs the previous draft

The previous new-docs page was already accurate (I'd corrected it earlier). This pass made it **complete and structurally sound**:

- **Added "Reading the log"** — the real gap. Documented the two verified SDK methods: `client.collection("orders").audit({ where })` (one collection) and `client.audit()` (across all audited collections the caller can read), plus the `AuditEntry` shape. Called out that `__audit` is locked down (`access: () => false`) so you read it through these methods, not as a normal collection.
- **Promoted access control to its own section** with a runnable `readAudit` Jexl example, and stated the fallback-to-`read` behavior.
- Tightened the intro to state the reader outcome, and clarified the admin History panel renders a **field-level diff derived client-side** from the stored before/after (not a stored diff).

## Old-doc conflicts (deliberately NOT carried over)

`apps/docs/content/docs/guides/audit-trail.mdx` is wrong against current code and was **not** used as a source:
- It lists fields `entity`, `entityId`, `action`, `userId`, `userCollection`, `userEmail`, a per-field `changes` diff, and a separate `snapshot`. **Real schema** (`AUDIT_COLLECTION` + `AuditService.log`): `collection`, `documentId`, `operation`, `user` (id only), `timestamp`, `changes` (JSON string of `{ before, after }` full snapshots). No `userEmail`/`userCollection`/`snapshot`; `changes` is not a stored diff.
- It shows reading via `client.collection('__audit').find(...)` — impossible, since `__audit` CRUD access is hard-`false`. Correct path is `collection(slug).audit()` / `client.audit()`.

## Review questions (need a human / SME)

1. **Cross-collection `client.audit()` scope.** I state it returns entries "across every audited collection the caller can read." Confirm the `GET /api/audit` route enforces per-collection `readAudit`/`read` when aggregating (the SDK JSDoc says "the current caller can read"; I took that at face value).
2. **`user` is an id only.** The entry stores the acting user's **id**, not email/collection. Confirm docs should not promise more (the old doc over-promised `userEmail`).
3. **`operation` typing.** `AuditEntry.operation` is typed `string` in the SDK though only `create`/`update`/`delete` occur. I documented the three real values in a comment. Fine as-is, or should the SDK type narrow to a union? (Minor, non-blocking.)

## Verified by evidence vs. needs human
- Verified in code: `audit: true` behavior, `__audit` fields + lockdown, fire-and-forget logging, `AuditEntry` shape, both SDK read methods + routes, `readAudit ?? read`, admin History panel gating.
- Needs human: `client.audit()` aggregation access enforcement (Q1); the rest are confirmations.
