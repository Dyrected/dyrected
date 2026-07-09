# Review Packet

## Review summary

- Document: `apps/docs/content/new-docs/basics/hooks/overview.mdx`
- Goal: Give hooks a clear Dyrected-first mental model, then hand readers to the right subpage for lifecycle-specific details.
- Audience: Developers who understand collections, globals, and fields but need to know where hook logic belongs.
- Scope: Hook families, recommended decision tree, runtime rules, and the generated reference block.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/DOCS_PHILOSOPHY.md` | Docs guidance | High | Voice, structure, and teaching style |
| `apps/docs/content/docs/concepts/hooks.mdx` | Existing docs | Medium | Legacy conceptual framing and examples |
| `apps/docs/content/docs/reference/configuration.mdx` | Existing docs | High | Collection and global hook option descriptions |
| `apps/docs/content/docs/reference/fields.mdx` | Existing docs | High | Field hook and `HookRequestContext` reference |
| `packages/core/src/types/hooks.ts` | Source code | High | Canonical collection/global hook signatures |
| `packages/core/src/types/schema-core.ts` | Source code | High | Field and admin hook signatures |
| `packages/core/src/utils/hooks.ts` | Source code | High | Hook chaining and isolated error behavior |
| `packages/core/src/__tests__/hooks.test.ts` | Tests | High | Behavior around chaining, read-only DB, and isolated after hooks |
| `https://payloadcms.com/docs/hooks/overview` | External comparison | High | Structural model only, not behavior |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Runtime rules | "A failed revalidation does not undo the saved document." | Based on isolated `afterChange` runner and config docs; worth confirming phrasing is acceptable for docs voice | Confirm wording |

## Reviewer questions

1. Does the overview strike the right balance between concept page and reference handoff?
2. Should the note about admin hooks not being a security boundary be even more explicit?
3. Is the example set aligned with the recommended teaching path for hooks in the rest of new-docs?

## High-risk areas

- Distinguishing server hooks from admin hooks without overstating parity
- Explaining isolated `after*` failures accurately but simply

## Suggested status

- `ready-for-sme-review`
