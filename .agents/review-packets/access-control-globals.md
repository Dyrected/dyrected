# Review Packet — basics/access-control/globals.mdx

## Review summary

- Document: Global Access Control (configuration guide).
- Goal: Reader knows globals have only `read`/`update`, that rules can inspect `doc`/`data`, and that global rules are boolean (no row-level filtering).
- Fresh rewrite against the completed implementation. Adds a `doc`/`data` example and the boolean-only note.
- Structure source: Payload `access-control/globals` (dropped Payload's `readVersions` — no equivalent key exists in Dyrected).

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/types/schema-config.ts` (global access) | code | high | Only `read` + `update`. |
| `packages/core/src/router.ts` L505-511 | code | high | `GET /api/globals/:slug` → read, `PATCH` → update. |
| `packages/core/src/controllers/global.controller.ts` | code | high | `get` passes `doc`; `update` passes `doc` + `data`; uses `resolveBooleanAccess` (object result → deny). |
| `packages/core/src/__tests__/access-parity.test.ts:215-303` | tests | high | Global access from function and Jexl against `doc`/`data`; denied vs allowed update. |

## Uncertainty register

| Section | Claim | Status |
| --- | --- | --- |
| Two operations | read/update only | VERIFIED. |
| doc/data example | `read` sees `doc`, `update` sees `doc`+`data` | VERIFIED (parity test + controller). |
| Boolean-only `<Note>` | object result → denial for globals | VERIFIED (`resolveBooleanAccess` coerces non-boolean → false). |

## Reviewer questions

1. Do versioned globals expose any access key like Payload's `readVersions`? None exists today; confirm before adding.
2. Confirm "public `read`, admin `update`" is the recommended default pattern to lead with.

## Placeholder sweep

No `NEEDS-*` markers.

## Suggested status label

`ready-for-review`
