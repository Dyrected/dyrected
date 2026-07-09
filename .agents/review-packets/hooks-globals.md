# Review Packet

## Review summary

- Document: `apps/docs/content/new-docs/basics/hooks/globals.mdx`
- Goal: Turn the stub into a global-hook guide that teaches the singleton lifecycle clearly and practically.
- Audience: Developers working with site settings, navigation, feature flags, or other single-document config.
- Scope: The four global hook phases, how globals differ from collections, and common post-update use cases.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/DOCS_PHILOSOPHY.md` | Docs guidance | High | Voice and structure |
| `apps/docs/content/docs/concepts/hooks.mdx` | Existing docs | Medium | Legacy global hook framing |
| `apps/docs/content/docs/reference/configuration.mdx` | Existing docs | High | Global hook option descriptions |
| `packages/core/src/types/hooks.ts` | Source code | High | Global hook signatures |
| `packages/core/src/types/schema-config.ts` | Source code | High | Global `hooks` JSDoc and operation semantics |
| `packages/core/src/__tests__/hooks.test.ts` | Tests | High | Confirmed global hook execution on get/update |
| `https://payloadcms.com/docs/hooks/globals` | External comparison | High | Section order and lifecycle-by-hook structure |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| `beforeRead` teaching | "Most useful when you want to inspect req, user, or query parameters consistently across reads." | Signature matches collection `beforeRead`, but current docs/examples for globals rarely use it | Confirm emphasis |

## Reviewer questions

1. Does the page make the singleton difference clear enough without repeating the collection page too heavily?
2. Confirmed direction: the page now uses a more concrete frontend revalidation example.
3. Confirmed direction: the "configuration changes rather than content churn" framing was removed as too editorial.

## High-risk areas

- Avoiding overstatement around `beforeRead` on globals
- Keeping the page distinct from collections while still familiar

## Suggested status

- `ready-for-sme-review`
