# Dyrected AI — Day 6 Specification

This document details the complete Day 6 implementation specification for **Production Engineering, Reliability, Observability & LLM Resilience** in Dyrected AI.

---

## 1. Day 6 Goal & Core Decisions

The goal of Day 6 is to transition Dyrected AI from a functional prototype into an **enterprise-grade, production-hardened system**. We stop adding new capabilities and focus entirely on fault tolerance, tenant isolation, error recovery, structured telemetry, rate limiting, and handling LLM non-determinism.

| Area | Day 6 Decision | Detail |
| :--- | :--- | :--- |
| **Telemetry & Tracing** | **Pino Structured Logging + Request IDs** | Every AI request generates or propagates an `X-Request-Id`. Logs record `requestId`, `projectId`, `userId`, `threadId`, duration, token consumption, and tool execution traces. |
| **Error Categorization** | **Typed `DyrectedAIError` Hierarchy** | Specific error codes with user-friendly messages and HTTP status mappings (`AI_RATE_LIMITED`, `AI_QUOTA_EXHAUSTED`, `AI_TIMEOUT`, `AI_TOOL_FAILED`, `AI_PERMISSION_DENIED`, `AI_UNCONFIGURED`). |
| **Transient Retries** | **Exponential Backoff with Jitter** | Automatic retries for transient 429 / 503 network hiccups with randomized jitter before failing. |
| **Tool Self-Healing** | **Structured Error Recovery** | When a tool encounters an error (e.g. non-existent collection, invalid filter), it returns a structured `{ error, suggestion }` object allowing Gemini to self-correct rather than crashing the SSE stream. |
| **Tenant Isolation** | **Zero Cross-Tenant Leakage Guarantee** | All database queries, vector chunks, and threads strictly enforce `where: { projectId }`. Automatic regression test suite to verify Project A cannot read Project B. |
| **Mutation Idempotency** | **Atomic Lock & Idempotency Key** | Prevents duplicate mutation execution on double-clicks or network retries via database state locking (`pending` $\to$ `executing` $\to$ `executed`). |
| **Timeouts & Abort Signals** | **Cascading Abort Controller** | Per-tool 10-second timeout, stream 45-second timeout, with full propagation of client `AbortSignal` to cancel downstream Gemini API calls when the user navigates away or closes the chat drawer. |
| **Rate Limiting** | **Token Bucket / Sliding Window** | In-memory / Redis rate limiting per user (e.g. 20 messages/min) and project quota limits. |

---

## 2. Failure Matrix & Resilience Blueprint

```text
┌───────────────────────────────────┬───────────────────────────────────┬────────────────────────────────────────────────────────┐
│ Failure Scenario                  │ Root Cause                        │ Production Defense & Behavior                          │
├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 1. LLM API Down / 503             │ Google AI API outage              │ Retry 2x with exponential backoff (500ms, 1500ms).      │
│                                   │                                   │ If still down: clean 503 with user-friendly retry CTA. │
├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 2. Rate Limit / Quota (429)       │ Free-tier / project quota ceiling │ UI displays customized Quota Banner with reset notice  │
│                                   │                                   │ and direct link to upgrade plan.                       │
├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 3. Database Adapter 500           │ DB connection timeout / crash     │ Tool returns `{ error: "Database temporarily unavail"}`│
│                                   │                                   │ Model explains failure politely to user.               │
├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 4. Invalid Tool Arguments         │ Model hallucinates wrong field    │ Tool returns Zod validation error + valid schema keys. │
│                                   │ or non-existent collection        │ Model self-corrects on next step within maxSteps loop. │
├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 5. Cross-Tenant Probe             │ Prompt injection: "Show Proj B"   │ Tenant guard forces `where: { projectId: reqSiteId }`. │
│                                   │                                   │ Zero records returned; audit alert logged.             │
├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 6. Duplicate Action Approval      │ Rapid double-click on Approve     │ Atomic state transition `pending` -> `executing`.      │
│                                   │                                   │ Second request receives 409 Conflict / cached result.  │
├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 7. Slow Model (> 20s latency)     │ Heavy prompt or high LLM load     │ SSE heartbeats every 5s prevent proxy gateway timeout. │
│                                   │                                   │ UI displays loading micro-animation with elapsed time. │
├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 8. User Closes Drawer Mid-Stream  │ Client disconnect                 │ AbortController cancels upstream Gemini API stream,    │
│                                   │                                   │ saving unused token billing.                           │
└───────────────────────────────────┴───────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 3. Structured Logging & Observability Pipeline

All AI operations utilize structured JSON logging via Pino to enable end-to-end distributed tracing.

### 3.1 Trace Context Metadata

Every log line and message record carries:
* `requestId`: Unique UUID per HTTP transaction (`x-request-id`).
* `projectId`: Current CMS site identifier.
* `userId`: Authenticated user ID.
* `threadId`: Conversation thread identifier.
* `model`: Model used (e.g. `gemini-2.5-flash`).
* `latencyMs`: Total execution time from request start to stream completion.
* `tokens`: Total tokens (`promptTokens`, `completionTokens`, `totalTokens`).
* `toolsCalled`: Array of tool names invoked and their individual execution durations.

### 3.2 Structured Logger Implementation

```ts
// packages/core/src/utils/ai-logger.ts
import pino from 'pino';

export const aiLogger = pino({
  name: 'dyrected-ai',
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export interface AILogContext {
  requestId: string;
  projectId: string;
  userId: string;
  threadId?: string;
}

export function createRequestLogger(ctx: AILogContext) {
  return aiLogger.child(ctx);
}
```

---

## 4. Error Categorization & User-Safe Error Codes

```ts
// packages/core/src/types/ai-errors.ts
export type AIErrorCode =
  | 'AI_UNCONFIGURED'          // 412: Missing API key
  | 'AI_RATE_LIMITED'          // 429: Too many requests
  | 'AI_QUOTA_EXHAUSTED'       // 429: Google Gemini token limit reached
  | 'AI_TIMEOUT'               // 504: Request or tool timed out
  | 'AI_TOOL_VALIDATION_ERROR' // 400: Zod parameter mismatch
  | 'AI_PERMISSION_DENIED'     // 403: User lacks collection read/write
  | 'AI_TENANT_VIOLATION'      // 403: Cross-project access attempt
  | 'AI_ACTION_EXPIRED'        // 410: Action approval link expired
  | 'AI_ACTION_ALREADY_EXECUTED'// 409: Duplicate mutation attempt
  | 'AI_INTERNAL_ERROR';       // 500: Unexpected core failure

export class DyrectedAIError extends Error {
  public readonly code: AIErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: AIErrorCode, message: string, status = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DyrectedAIError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
```

---

## 5. Tool Self-Healing & Graceful Error Recovery

When a tool fails during execution, throwing an unhandled exception terminates the whole SSE stream abruptly. Instead, tools return **structured error envelopes** that teach Gemini what went wrong and allow it to self-heal.

### 5.1 Self-Healing Tool Execution Pattern

```ts
// packages/core/src/services/ai-tools.ts
execute: async ({ collection, where, ...params }) => {
  // Check if collection exists
  const col = config.collections?.find((c) => c.slug === collection);
  if (!col) {
    const availableSlugs = config.collections?.map((c) => c.slug).filter((s) => !s.startsWith('_')).join(', ');
    return {
      error: `Collection "${collection}" does not exist.`,
      suggestion: `Available collections in this project are: [${availableSlugs}]. Please re-try your query with a valid collection slug.`,
      recoverable: true,
    };
  }

  // Check access permissions
  const canRead = await isAccessAllowed(config, col.access?.read, { req: { user, siteId: projectId } as any, user });
  if (!canRead) {
    return {
      error: `Access Denied: The user "${user?.name || user?.id}" does not have read permissions for collection "${collection}".`,
      recoverable: false,
    };
  }

  // Execute query with catch & recovery
  try {
    const result = await db.find({ collection, where, ...params });
    return { collection, docs: result.docs, totalDocs: result.totalDocs };
  } catch (err: any) {
    return {
      error: `Database query failed: ${err.message}`,
      suggestion: 'Verify field names match the collection schema using getCollectionSchema().',
      recoverable: true,
    };
  }
}
```

---

## 6. Strict Tenant Isolation & Multi-Project Security

Dyrected is a multi-tenant platform where separate projects share backend infrastructure. Tenant isolation must be strictly enforced at every access point.

### 6.1 Tenant Scoping Rules
1. **Request Header Verification:** `X-Site-Id` / `projectId` is extracted from the authenticated session context.
2. **Database Query Injection:** Every `db.find()`, `db.findOne()`, and `db.aggregate()` call made by AI tools unconditionally merges `{ projectId }` into the query filter.
3. **Vector Chunk Isolation:** `_dyrected_ai_chunks` queries strictly enforce `where: { projectId }`.
4. **Thread & Message Ownership:** A user cannot view, stream to, or delete threads belonging to another project or user.

### 6.2 Security Test Suite
Automated regression tests verify:
* Project A's assistant querying `searchContent("confidential")` returns **zero chunks** from Project B.
* `queryCollection` with an explicit `{ projectId: "proj_B" }` in the where payload is overridden and sanitized to `req.projectId` ("proj_A").

---

## 7. Action Idempotency & Duplicate Mutation Prevention

To prevent duplicate database mutations from rapid double-clicks on the **[Approve]** button:

```ts
// packages/core/src/services/ai-actions.service.ts
async executeAction(actionId: string, user: AuthenticatedUser): Promise<ActionResult> {
  // Atomic find and status transition: pending -> executing
  const action = await this.db.findOne({ collection: '_dyrected_ai_actions', id: actionId });
  
  if (!action) {
    throw new DyrectedAIError('AI_ACTION_EXPIRED', 'Action not found', 404);
  }

  if (action.status === 'executed') {
    // Idempotent return: Return previous successful result without re-executing
    return { success: true, actionId, status: 'executed', message: 'Action was already applied.' };
  }

  if (action.status !== 'pending') {
    throw new DyrectedAIError('AI_ACTION_ALREADY_EXECUTED', `Action cannot be executed in state "${action.status}".`, 409);
  }

  if (new Date(action.expiresAt) < new Date()) {
    await this.db.update({ collection: '_dyrected_ai_actions', id: actionId, data: { status: 'expired' } });
    throw new DyrectedAIError('AI_ACTION_EXPIRED', 'This proposal has expired (30 minute limit). Please ask the assistant to generate a fresh proposal.', 410);
  }

  // Lock action to executing
  await this.db.update({ collection: '_dyrected_ai_actions', id: actionId, data: { status: 'executing' } });

  try {
    const result = await this.applyMutation(action);
    
    // Mark executed and record audit
    await this.db.update({ collection: '_dyrected_ai_actions', id: actionId, data: { status: 'executed', executedAt: new Date() } });
    await this.auditLog(action, user, result);

    return { success: true, actionId, status: 'executed', result };
  } catch (err: any) {
    await this.db.update({ collection: '_dyrected_ai_actions', id: actionId, data: { status: 'failed', errorMessage: err.message } });
    throw new DyrectedAIError('AI_INTERNAL_ERROR', `Mutation execution failed: ${err.message}`, 500);
  }
}
```

---

## 8. Latency, Timeouts & Abort Controller Propagation

### 8.1 Timeout Hierarchy
* **Tool Call Execution:** 10,000 ms (10s) timeout per individual tool execution.
* **LLM Streaming Total:** 45,000 ms (45s) maximum stream duration before graceful termination.
* **SSE Heartbeats:** `comment: "ping"` transmitted every 5,000 ms to keep intermediate proxies (Cloudflare, Nginx, Vercel) from closing idle streaming sockets.

### 8.2 Client Disconnect Abort Propagation

```ts
// packages/core/src/controllers/ai.controller.ts
async chat(c: Context<DyrectedContext>) {
  const abortController = new AbortController();
  
  // Bind Hono request abort signal
  c.req.raw.signal.addEventListener('abort', () => {
    aiLogger.info({ requestId: c.get('requestId') }, 'Client aborted AI chat request');
    abortController.abort();
  });

  return agent.createStreamResponse(threadId, content, {
    signal: abortController.signal,
  });
}
```

---

## 9. User-Level & Project-Level Rate Limiting

To protect against token exhaustion and denial-of-service:

* **Default User Rate Limit:** 30 messages / minute per user session.
* **Default Project Burst Limit:** 60 requests / minute per project.
* **Header Response:** Standard rate limit headers returned on `/api/ai/*`:
  - `X-RateLimit-Limit: 30`
  - `X-RateLimit-Remaining: 28`
  - `X-RateLimit-Reset: 1724775400`

---

## 10. Day 6 Scope Boundaries

### ✅ What Day 6 INCLUDES

1. **Structured Logging (Pino):** Traceable log events with `requestId`, `tokens`, and `latencyMs`.
2. **Error Taxonomy & Friendly UI Banners:** Quota warnings, rate limits, and network reconnection notices.
3. **Transient Network Retries:** Exponential backoff with jitter on Gemini API calls.
4. **Tool Self-Healing:** Structured error envelopes allowing Gemini to fix mistaken parameters without crashing.
5. **Strict Tenant Scoping:** Automated regression tests for multi-project isolation.
6. **Mutation Idempotency:** State-locked execution preventing duplicate changes on double-clicks.
7. **Abort Controller & Timeouts:** Clean upstream stream cancellation on client disconnect.
8. **Rate Limiting:** Token-bucket protection against abuse.

### ❌ What Day 6 EXCLUDES

* ❌ Complex multi-region distributed vector clustering
* ❌ Self-hosted open-source LLM model weights
* ❌ External enterprise Datadog / OpenTelemetry exporter plugins (available as post-launch modules)

---

## 11. Day 6 Implementation Checklist

* [ ] **Logging & Observability (`packages/core`):**
  * [ ] Set up `packages/core/src/utils/ai-logger.ts` with Pino.
  * [ ] Add `X-Request-Id` middleware to AI router.
  * [ ] Record token usage, finishReason, and duration in `_dyrected_ai_messages.metadata`.
* [ ] **Error Classes & Mapping (`packages/core`):**
  * [ ] Implement `DyrectedAIError` and error code registry.
  * [ ] Add global Hono error handler for AI routes.
* [ ] **Tool Resilience & Self-Healing:**
  * [ ] Wrap all tool `execute` handlers with typed error envelopes (`{ error, suggestion, recoverable }`).
  * [ ] Implement 10-second timeout on tool promises.
* [ ] **Tenant Isolation Hardening:**
  * [ ] Add automated unit tests verifying project tenant isolation across DB tools and vector search.
  * [ ] Enforce `projectId` sanitization on all where filters.
* [ ] **Idempotency & Action State Machine:**
  * [ ] Implement `executing` lock in `ai-actions.service.ts`.
  * [ ] Add unit test for duplicate `executeAction` requests.
* [ ] **Abort Controller & Proxy Heartbeats:**
  * [ ] Wire `req.raw.signal` to `streamText({ abortSignal })`.
  * [ ] Add 5-second SSE keep-alive ping.
* [ ] **Rate Limiting:**
  * [ ] Add sliding-window in-memory rate limiter middleware for AI endpoints.
* [ ] **Frontend Error Banners (`packages/admin`):**
  * [ ] Render rate-limit / quota banners with retry counters and upgrade links in `DyrectedAILipTrigger.tsx`.

---

## 12. Day 6 Acceptance Criteria

1. **Clean Error Handling:** An invalid collection query returns a helpful self-healing explanation rather than a 500 error or broken stream.
2. **Quota & Rate Limit Feedback:** Hitting Gemini API limits renders a polite error banner with actionable instructions rather than an unhandled red screen.
3. **Zero Tenant Leaks:** Automated test verifies Project A's assistant cannot discover, query, or embed documents belonging to Project B.
4. **Idempotent Actions:** Clicking **[Approve & Apply]** twice in rapid succession executes the mutation exactly once and returns a clean 200/409 response.
5. **Observability:** Every chat completion outputs a structured JSON log line with duration, tokens, tool names, and request ID.
