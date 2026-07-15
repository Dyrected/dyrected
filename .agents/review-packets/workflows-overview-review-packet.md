# Review Packet — `features/workflows/overview.mdx`

**Deliverable type:** Conceptual + configuration guide (the canonical home for the workflow/drafts concept), ending in a generated reference block.
**Reader outcome:** After this page a reader knows what a workflow is, when to use `drafts: true` vs a full workflow, how to enable each, how to perform a transition (with concurrency and comments), who can see drafts and who can publish, how to react to transitions, and where the full type reference lives.
**Status:** Review-ready, not final.

## Payload equivalent + extracted template

Payload has no "workflows" feature; its closest docs are **Versions → Drafts**. Extracted structure (structure only, no wording reused): mental model of document states → enable/options → API → *who can see drafts* → *who can publish* → task subsections (unpublish, revert) → escape hatches. This page follows that arc: concept → `drafts: true` (simple path) → full workflow → transition API → visibility/capabilities → lifecycle → reference.

## Source inventory

| Source | Why it matters | Trust | Notes |
|---|---|---|---|
| `packages/core/src/workflows.ts:18-57` | Built-in `publishingWorkflow()` / `simplePublishingWorkflow()` shapes | High | states/transitions/roles verified |
| `packages/core/src/workflows.ts:299-379` | `transitionWorkflow` enforcement | High | capability 403, revision 409, comment 400 all verified |
| `packages/core/src/types/workflows.ts` | Type shapes | High | JSDoc added this pass (see below) |
| `packages/core/src/utils/config.ts:240` | `drafts:true` → `simplePublishingWorkflow()` | High | verified |
| `packages/sdk/src/index.ts:460-472` | `client.collection(slug).transition(id, name, opts)` | High | signature verified |
| `apps/docs/content/docs/concepts/workflows.mdx` + guides | Old-doc prose/structure | Medium | predate `drafts:true`; omit the `admin` role |

## What changed vs the previous draft

- **Fixed a real bug:** the example passed `workflow: publishingWorkflow` (bare reference). `publishingWorkflow` is a function returning `WorkflowConfig` — it must be **called**: `workflow: publishingWorkflow()`. Added an explicit "remember the parentheses" note. (Verified against `workflows.ts:18` and every old-doc/recipe usage.)
- **Described what `publishingWorkflow()` actually gives** — three states (draft → in review → published), four transitions, and the `editor` / `publisher` / `admin` role→capability mapping (the `admin` role is in code but was omitted by the old docs).
- **Rewrote "How transitions work" into "Performing a transition"** with runnable SDK examples, `expectedRevision` concurrency, and `requireComment` — previously prose-only with no code (violated "prose before code, then show the code").
- **Added "Who can see drafts, and who can publish"** — the capability/role model, with the verified fact that enforcement is server-side (`403` on a disallowed transition, `workflows.ts:327-329`).
- **Added "Reacting to a transition"** — lifecycle events + `beforeTransition`/`afterTransition` hooks.
- Preserved the accurate `drafts: true` section and the generated reference block.

## Generated reference block — JSDoc fix (systematic)

The `GENERATED:REFERENCE-WORKFLOWS` block rendered **empty description cells** for members lacking JSDoc: `WorkflowMetadata` (state, revision, publishedRevision, publishedAt, publishedBy), all of `WorkflowTransitionContext`, and all of `LifecycleEvent`. Per the "fix the source, not the rendered MDX" rule, I added JSDoc to those members in `packages/core/src/types/workflows.ts`.

**Follow-up required:** regenerate the new-docs reference block so the new descriptions render. The block is produced by the `@dyrected/knowledge` generator (not `apps/docs/scripts/generate-workflow-reference.mjs`, which only writes the old `/docs/reference/generated-workflows.mdx` export list). Regenerate after a `@dyrected/core` rebuild. I did **not** hand-edit the rendered block.

## Review questions (need a human / SME)

1. **Transition auth vs. collection access.** The transition route uses `requireAuth` + workflow capability checks. It does **not** appear to also run the collection's `update` access rule. Confirm capability gating alone is the intended authorization for transitions (the page implies capabilities are the gate).
2. **`admin` role in `publishingWorkflow()`.** ~~Confirm the `admin` role is intended to ship in the built-in workflow.~~ **Resolved / superseded:** role names are no longer hardcoded assumptions. Added `definePublishingWorkflow({ editors, publishers })` so projects map their own role names onto the two capability tiers; `publishingWorkflow()` is now a shorthand with defaults `editors: ["editor"]`, `publishers: ["publisher", "admin"]` (output byte-identical to before — tests unchanged). The page documents both. Confirm the two-tier model (editors = edit+submit; publishers = +publish+unpublish) is the right shape, and whether the tier *capabilities* (not just the role names) should also be configurable later.
3. **`post._workflow.revision` in the `expectedRevision` example.** I read the revision off the materialized doc's `_workflow`. Confirm that's the field name consumers should use (vs. a top-level `revision`).
4. **Lifecycle event delivery.** I describe events as "durable" and processable. Confirm the intended consumer surface (a registered handler / the dispatch worker) so a future deeper page can document it — this page only names the capability.

## Verified by evidence vs. needs human
- Verified in code: `publishingWorkflow()` shape, `simplePublishingWorkflow()` (no roles), server-side capability `403`, `expectedRevision` `409`, `requireComment` `400`, published-snapshot write/clear, transition SDK signature, drafts visibility.
- Needs human: the four questions above (all authorization/intent, not mechanics).
