## Document purpose

Review packet for `apps/docs/content/new-docs/quick-start-guides/coding-agents-and-ai-app-builders/using-the-dyrected-prompt.mdx`.

Goal: make the prompt page the canonical how-to for the staged AI-builder workflow, while also making it usable as direct instructions for the AI agent itself and absorbing the longer reusable workflow rules that should not live only inside the generated prompt.

Page type: conceptual guide with practical workflow steps and agent-facing instructions.

Reader outcome: the operator should understand why the prompt exists and how the staged approval loop works; the agent should understand the expected order of work, the non-negotiable constraints, the content architecture defaults, the approval gates, the local-separation rules, the code-versus-content boundary, the batching rules, and the final verification bar.

## Payload equivalent

Closest live Payload docs page: `https://payloadcms.com/docs/getting-started/installation`

Reason: the useful structural borrow is the way Payload opens with prerequisites and a recommended install path before dropping into concrete steps. There is no direct Payload equivalent for Dyrected's staged AI-builder prompt workflow.

## Sanity comparison

Useful live Sanity comparison pages:

- `https://www.sanity.io/docs/getting-started/ai-coding-agents`
- `https://www.sanity.io/docs/getting-started/ai-app-builder-quickstart`

What I borrowed structurally:

- direct audience framing
- a strong "use this when..." opening
- short, numbered setup flow
- explicit distinction between local coding-agent workflows and app-builder workflows

What I did not borrow:

- Sanity-specific connector, MCP, Studio, or dataset behavior

## Extracted template

- outcome-first opening
- define the audience and the recommended path early
- explain why this workflow exists before the steps
- walk through the sequence in the order the reader experiences it
- include the durable workflow rules that an agent should follow even if the launcher prompt becomes shorter
- include enough detail that the prompt can later shrink without this page feeling skeletal
- include intervention guidance for common failure modes
- end with success signals and next-page routing

## Source inventory

- `apps/docs/content/docs/getting-started/quickstart.mdx`
  - High
  - Existing Cloud prompt workflow and stage ordering.
- `apps/docs/content/docs/guides/ai-integration.mdx`
  - High
  - Dyrected-specific AI safety rules and modeling boundaries.
- `packages/admin/src/pages/setup/setup-prompt.tsx`
  - High
  - Confirms current prompt UI framing and user-facing step list.
- `packages/admin/src/pages/setup/utils.ts`
  - High
  - Confirms the prompt is credential-aware and generated from `@dyrected/knowledge`.
- `/Users/busola/Work/dyrected-pro/apps/www/src/app/guide/page.tsx`
  - Medium
  - Confirms current public-product framing for AI-built websites.
- `/Users/busola/Work/dyrected-pro/apps/www/src/app/blog/posts.ts`
  - Medium
  - Good source for repeat phrasing around scope control and handoff boundaries.

## Uncertainty register

- The page intentionally avoids describing the internal stage numbering from the generated prompt as a public contract, since the prompt template may change while the workflow stays the same.
- I did not enumerate every supported AI builder in the success criteria, only as examples.

## Specific review questions

1. Is the agent-facing instruction block strong enough, or should it become even more imperative?
2. Should the page show a sample AI checklist response block, or is that better kept for the public `dyrected-pro` guide?
3. Do you want a screenshot of the prompt card in docs, or is the `CopyPromptButton` enough for this stage?

## High-risk claims to verify

- The prompt-driven workflow should start with site inspection and plan approval before broad install work.
- The prompt is the recommended path for AI-built websites.
- The same AI tool that owns the website code should be the one that receives the prompt.

## Follow-on prompt change

If product wants the generated setup prompt to become materially shorter, that is a separate `@dyrected/knowledge` prompt-template change. The likely direction would be:

- keep the prompt as the short task launcher
- point the agent to this page for the longer operating instructions
- preserve any critical inline constraints that cannot safely rely on external docs retrieval

That change is not part of this MDX-only pass.

## Screenshot candidates

- `NEEDS-SCREENSHOT`: the prompt card as shown in the admin/setup UI.
- Optional: a screenshot of a plain-language checklist coming back from the AI, if product wants an example.

## Status

Review-ready draft. No JSDoc or generator changes required.
