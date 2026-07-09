# Review Packet

## Review summary

- Document: `apps/docs/content/new-docs/basics/hooks/collections.mdx`
- Goal: Turn the stub into a practical collection-hook lifecycle guide grounded in current Dyrected behavior.
- Audience: Developers implementing cross-field validation, derived data, read shaping, or post-write side effects on collections.
- Scope: All six collection hook phases, safe capabilities by phase, and recommended usage patterns.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/DOCS_PHILOSOPHY.md` | Docs guidance | High | Voice and structure |
| `apps/docs/content/docs/concepts/hooks.mdx` | Existing docs | Medium | Legacy hook explanations and examples |
| `apps/docs/content/docs/reference/configuration.mdx` | Existing docs | High | Collection hook option descriptions |
| `packages/core/src/types/hooks.ts` | Source code | High | Collection hook signatures |
| `packages/core/src/types/schema-config.ts` | Source code | High | Collection `hooks` JSDoc, especially isolated `after*` behavior |
| `packages/core/src/utils/hooks.ts` | Source code | High | Chaining and isolated error handling |
| `packages/core/src/__tests__/hooks.test.ts` | Tests | High | Before/after behavior, read-only vs writable DB |
| `https://payloadcms.com/docs/hooks/collections` | External comparison | High | Section ordering and per-hook reference cadence |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| `beforeRead` guidance | Suggested use for narrowing reads at the hook layer | Behavior is correct, but access control may still be the preferred teaching recommendation for some cases | Confirm pedagogical emphasis |
| `afterDelete` example | Writing an audit log from `afterDelete` | Supported by writable DB surface, but not yet shown in existing docs | Confirm example choice |

## Reviewer questions

1. Confirmed direction: this page now explicitly steers auth and visibility questions toward access control before `beforeRead`.
2. Confirmed direction: `beforeRead` remains the first lifecycle example alongside `beforeChange` / `afterChange`.
3. Confirmed direction: the safe-capabilities table now explicitly says list `afterRead` runs once per document.

## High-risk areas

- Distinguishing hook-based query shaping from access control
- Explaining isolated `afterChange` and `afterDelete` behavior without implying retries or durability guarantees

## Suggested status

- `ready-for-sme-review`
