# Review Packet — `features/workflows/custom-workflows.mdx` + `lifecycle-events.mdx`

Two new pages split out of the Workflows overview so it stays focused. **Review-ready, not final.**

## `custom-workflows.mdx` — a recipes gallery

**Type:** Task/recipe guide. **Reader outcome:** understand `WorkflowConfig` is a plain state machine and copy a real-world config for their process.

**Structure:** the four building blocks (`states`/`transitions`/`roles`/`initialState`) → five complete recipes → tips.

**The five recipes (all complete, copy-paste):**
1. Multi-stage approval (legal contract review)
2. Two-key approval — maker–checker (finance/regulated)
3. Scheduled / embargoed publishing (press embargo)
4. Translation gating (localized content)
5. Newsroom editorial pipeline (copy-edit → fact-check → publish)

**Grounding:** every recipe uses the verified `WorkflowConfig` shape (`packages/core/src/types/workflows.ts:14-56`). Capability names in the recipes (`entry.approve`, `entry.check`, `entry.factcheck`, `entry.translate`, `entry.copyedit`) are **invented** — verified safe because `workflowCapabilities`/`availableWorkflowTransitions` only string-match a transition's `requiredCapabilities` against the acting user's role-granted capabilities (`workflows.ts:62-90`). No fixed capability vocabulary exists.

## `lifecycle-events.mdx`

**Type:** Configuration guide with a reference lean. **Reader outcome:** know which events fire, how to register a handler, and the delivery guarantees.

**Verified facts (all cited):**
- **Event names:** `revision.created`, `workflow.transitioned`, `entry.published`, `entry.unpublished` (`types/workflows.ts:4-9`). `revision.created` fires on `saveWorkflowDraft` (`workflows.ts:291`); the other three on transitions (`workflows.ts:337-349`).
- **Registration:** `config.events.handlers: LifecycleEventHandler[]`, plus `maxAttempts` (default 8) and `retryDelayMs` (default 1000) (`types/app-config.ts:124-133`).
- **Handler type:** `(event: LifecycleEvent) => void | Promise<void>` (`types/workflows.ts`).
- **Delivery model:** immediate best-effort inline (`void dispatchLifecycleEvent(...)` at `workflows.ts:310,336,424`) **plus** durable retry via `dispatchPendingLifecycleEvents(config, limit=50)` (`workflows.ts:260`). Persisted to `__lifecycle_events` before delivery; status `pending → processing → delivered | failed`; exponential backoff `retryDelayMs * 2^(attempts-1)`; stops at `maxAttempts` (`workflows.ts:230-276`). **At-least-once** → page tells readers to make handlers idempotent off `event.id`.
- **Who drives it:** Cloud runs the dispatcher automatically (`dyrected-pro/apps/cloud/src/worker.ts:148`, every 30s). Self-hosted must schedule `dispatchPendingLifecycleEvents` — page says so.

## Overview changes (dedup)
- "Build your own workflow" trimmed to the building blocks + a link to `custom-workflows` (the full example + shapes moved there — document once).
- "Reacting to a transition" now links to `lifecycle-events` for depth.
- `meta.json`: overview → custom-workflows → lifecycle-events.

## Review questions
1. **Self-hosted dispatcher.** The page says self-hosted deployments must schedule `dispatchPendingLifecycleEvents` for retries (immediate attempt still happens inline). Confirm that's the intended operator guidance and there's no built-in scheduler in `@dyrected/core` itself.
2. **`revision.created` scope.** I state it fires when "a working draft is saved" (via `saveWorkflowDraft`). Confirm this is only on workflow/`drafts`-enabled collections and matches the intended semantics.
3. **Recipe realism.** The five custom-workflow scenarios are illustrative patterns, not shipped presets. Confirm none imply a built-in that doesn't exist (only `publishingWorkflow`/`definePublishingWorkflow`/`simplePublishingWorkflow` ship).
4. **`payload` contents.** I describe `event.payload` loosely as "event-specific data, e.g. the transition name and revision." Confirm the payload keys per event if you want them documented precisely.

## Verified by evidence vs. needs human
- Verified in code: event names + fire points, handler registration + retry config, delivery/retry/idempotency model, dispatcher call sites, `WorkflowConfig` shape, arbitrary capability strings.
- Needs human: the four questions above (operator guidance + payload precision).
