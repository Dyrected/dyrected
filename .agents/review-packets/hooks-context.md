# Review Packet

## Review summary

- Document: `apps/docs/content/new-docs/basics/hooks/context.mdx`
- Goal: Turn the stub into the canonical page for the real hook arguments Dyrected exposes today, especially `HookRequestContext`.
- Audience: Developers who understand hooks conceptually but need to know what data they can actually inspect inside each hook.
- Scope: `req`, `user`, `data`, `doc`, `previousDoc`, `operation`, `db`, and read-only versus writable DB phases.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/DOCS_PHILOSOPHY.md` | Docs guidance | High | Voice and structure |
| `apps/docs/content/docs/reference/fields.mdx` | Existing docs | High | Existing generated `HookRequestContext` reference text |
| `packages/core/src/types/request.ts` | Source code | High | Canonical `HookRequestContext` definition |
| `packages/core/src/types/hooks.ts` | Source code | High | Collection/global hook argument surfaces |
| `packages/core/src/types/schema-core.ts` | Source code | High | Field/admin hook argument surfaces |
| `packages/core/src/types/adapters.ts` | Source code | High | Read-only versus writable adapter contract |
| `packages/core/src/utils/access-control.ts` | Source code | High | `toHookRequestContext` implementation |
| `packages/core/src/__tests__/hooks.test.ts` | Tests | High | Validates read-only and writable DB boundaries |
| `https://payloadcms.com/docs/hooks/context` | External comparison | High | Structural cue only; behavior diverges from Dyrected |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Structural equivalence to Payload | Dyrected page uses Payload's "context" slot for hook arguments rather than mutable shared state | This is intentional because Dyrected does not expose the same hook context concept | Confirm naming approach |
| `beforeRead` global bullets | Lists `query` for global `beforeRead` because it aliases collection `beforeRead` in code | Accurate in types, but uncommon in examples | Confirm if worth keeping explicit |

## Reviewer questions

1. Is `context.mdx` the right place to define the canonical meaning of `req`, `doc`, and `data` for all hook families?
2. Confirmed direction: the page now explicitly says Dyrected does not describe a Payload-style mutable shared hook context here, and instead documents the actual hook arguments it exposes.
3. Confirmed direction: the read-only versus writable `db` section now includes a concrete example.

## High-risk areas

- Naming and positioning of "context" compared with Payload's separate concept
- Avoiding claims about shared mutable state that Dyrected does not expose

## Suggested status

- `ready-for-sme-review`
