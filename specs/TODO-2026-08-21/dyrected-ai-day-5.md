# Dyrected AI — Day 5 Specification

This document details the complete Day 5 implementation specification for **Human-in-the-Loop (HITL) Content Mutations & Safe Action Approval** (Draft Proposals, Diff Previews, Permission Enforcement, Execution Lifecycle, and Audit Logging) in Dyrected AI.

---

## 1. Day 5 Goal & Core Architecture

The goal of Day 5 is to empower the Dyrected AI Assistant to **actively modify CMS content** (creating documents, patching fields, updating singleton globals, and soft/hard deleting entries) while enforcing strict **Human-in-the-Loop (HITL) safety boundaries**. The AI can propose mutations, generate visual diffs, and validate schema integrity, but destructive operations are **never executed without explicit user authorization**.

| Area | Day 5 Decision | Detail |
| :--- | :--- | :--- |
| **Mutation Execution Gate** | **2-Phase HITL Action Pattern** | Phase 1: Agent generates a structured `ProposedAction` with a before/after snapshot.<br>Phase 2: User clicks **Approve** in the UI (or confirms in chat), which calls the execution endpoint `POST /api/ai/actions/:actionId/execute`. |
| **Action Persistence** | **`_dyrected_ai_actions` Collection** | Proposed mutations are persisted in an internal table with a unique `actionId`, state machine (`pending` \| `approved` \| `rejected` \| `executed` \| `failed`), expiration timestamp, and payload snapshots. |
| **Interactive UI** | **Action & Diff Card (`ai-elements`)** | Chat interface renders interactive visual diff cards showing `Current Value` vs `Proposed Value`, field path, target collection/global, and one-click **[Approve & Apply]** / **[Reject]** buttons. |
| **Permission & Role Security** | **Dual-Gate Access Enforcement** | CMS collection access policies (`access.create`, `access.update`, `access.delete`) are validated twice: once when the proposal is generated, and again when the user executes the action with their active session token. |
| **Schema Pre-Validation** | **Dry-Run Validation** | Before presenting a proposal to the user, the core engine validates the proposed payload against the collection’s field types, required constraints, and Zod schemas to guarantee the mutation will not fail on save. |
| **Audit Trail & Rollback** | **`_dyrected_ai_audit` Logging** | Every executed AI mutation writes an immutable audit record containing `executedBy: userId`, `proposedBy: "dyrected-ai"`, `threadId`, `snapshotBefore`, `snapshotAfter`, and a rollback payload. |

---

## 2. 2-Phase Mutation & Approval Lifecycle

```text
========================================================================================
                              PHASE 1: PROPOSAL GENERATION
========================================================================================

 ┌────────────────────────────────────────────────────────┐
 │ User: "Change the homepage headline to 'Build better    │
 │        websites with Dyrected.'"                       │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 1. Gemini 2.5 Flash Agent analyzes intent:             │
 │    - Identifies target: Global `homepage`              │
 │    - Inspects current state: `hero.title` = "Build..." │
 │    - Emits Tool: `proposeUpdateGlobal({ ... })`        │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. Core AI Mutation Service                            │
 │    - Validates target field against schema constraints │
 │    - Verifies user has `access.update` permission       │
 │    - Captures `beforeSnapshot` from active database    │
 │    - Creates pending record in `_dyrected_ai_actions`  │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 3. Frontend Chat Panel (ai-elements)                   │
 │    Renders Interactive Action Card with Visual Diff:   │
 │    ┌───────────────────────────────────────────────┐   │
 │    │ 📝 Proposed Change: Global "homepage"         │   │
 │    │ Field: hero.title                             │   │
 │    │ - Current: "Build websites faster"            │   │
 │    │ + New:     "Build better websites with Dyr..."│   │
 │    │                                               │   │
 │    │ [ ✓ Approve & Apply ]     [ ✕ Discard ]       │   │
 │    └───────────────────────────────────────────────┘   │
 └────────────────────────────────────────────────────────┘

========================================================================================
                              PHASE 2: HUMAN APPROVAL & EXECUTION
========================================================================================

 ┌────────────────────────────────────────────────────────┐
 │ User clicks [ Approve & Apply ]                        │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼ POST /api/ai/actions/:actionId/execute
 ┌────────────────────────────────────────────────────────┐
 │ 4. Core Execution Handler                              │
 │    - Verifies action is in `pending` state             │
 │    - Re-checks user authorization token                │
 │    - Executes mutation via DatabaseAdapter             │
 │    - Writes immutable audit log to `_dyrected_ai_audit`│
 │    - Updates action status to `executed`               │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 5. Frontend Success State                              │
 │    - Card updates to green badge: [ ✓ Applied ]        │
 │    - Toast confirmation: "Homepage headline updated"   │
 │    - Real-time form / preview refreshes with new data  │
 └────────────────────────────────────────────────────────┘
```

---

## 3. Database Persistence Schemas

Day 5 introduces two internal collections for pending action tracking and audit logging.

### 3.1 `_dyrected_ai_actions` (Pending Action Queue)

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID / CUID) | Yes | Primary key (`act_${timestamp}_${rand}`) |
| `projectId` | `string` | Yes | Scoped to active project tenant |
| `threadId` | `string` (FK) | Yes | Associated AI chat thread |
| `userId` | `string` (FK) | Yes | Author user requesting the action |
| `type` | `string` | Yes | `createDocument` \| `updateDocument` \| `deleteDocument` \| `updateGlobal` |
| `targetCollection` | `string` | No | Collection slug (null if global) |
| `targetGlobal` | `string` | No | Global slug (null if collection) |
| `documentId` | `string` | No | Document primary key (for update/delete) |
| `summary` | `string` | Yes | Human-readable explanation of the change |
| `beforeSnapshot` | `json` | Yes | Current state of modified fields/document |
| `proposedData` | `json` | Yes | New field values to apply |
| `status` | `string` | Yes | `pending` \| `approved` \| `rejected` \| `executed` \| `failed` |
| `errorMessage` | `string` | No | Recorded error string if execution fails |
| `expiresAt` | `Date` | Yes | Expiration timestamp (default: 30 minutes from creation) |
| `createdAt` | `Date` | Yes | Creation timestamp |
| `executedAt` | `Date` | No | Timestamp of execution |

### 3.2 `_dyrected_ai_audit` (Immutable Audit Trail)

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID / CUID) | Yes | Primary key (`aud_${timestamp}_${rand}`) |
| `projectId` | `string` | Yes | Scoped to active project tenant |
| `actionId` | `string` (FK) | Yes | Reference to `_dyrected_ai_actions.id` |
| `executedBy` | `string` (FK) | Yes | User ID who clicked Approve |
| `actionType` | `string` | Yes | Mutation operation performed |
| `target` | `string` | Yes | Target identifier (e.g. `articles/art_101` or `globals/homepage`) |
| `snapshotBefore` | `json` | Yes | Exact database state prior to mutation |
| `snapshotAfter` | `json` | Yes | Exact database state post mutation |
| `rollbackPayload`| `json` | Yes | Data payload required to reverse the mutation |
| `createdAt` | `Date` | Yes | Timestamp of execution |

---

## 4. Built-in Mutation Proposal Tools

The assistant is equipped with 4 proposal tools. Each tool validates arguments, captures current state, registers a pending action, and returns an action payload for UI card rendering.

### 4.1 `proposeUpdateGlobal`

```ts
// packages/core/src/services/ai-tools.ts
proposeUpdateGlobal: tool({
  description:
    'Propose modifying fields on a singleton global configuration (e.g. site settings, homepage, navigation). Does NOT apply changes immediately; creates a proposal requiring human approval.',
  parameters: z.object({
    global: z.string().describe('Slug of the global configuration (e.g. "homepage", "site-settings")'),
    data: z.record(z.any()).describe('Key-value object of fields to update'),
    summary: z.string().describe('Short explanation of why this change is being made'),
  }),
  execute: async ({ global: globalSlug, data, summary }) => {
    // 1. Verify global exists
    const g = config.globals?.find((item) => item.slug === globalSlug);
    if (!g) return { error: `Global "${globalSlug}" not found.` };

    // 2. Check update permission
    const canUpdate = await isAccessAllowed(config, g.access?.update, { req: { user, siteId: projectId } as any, user });
    if (!canUpdate) return { error: `Access denied: you do not have permission to update global "${globalSlug}".` };

    // 3. Capture current values
    const currentData = (await db.getGlobal({ slug: globalSlug })) || {};
    const beforeSnapshot: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      beforeSnapshot[key] = currentData[key] ?? null;
    }

    // 4. Create pending action record
    const action = await actionService.createAction({
      projectId,
      threadId,
      userId: user.id,
      type: 'updateGlobal',
      targetGlobal: globalSlug,
      summary,
      beforeSnapshot,
      proposedData: data,
    });

    return {
      actionId: action.id,
      type: 'updateGlobal',
      target: globalSlug,
      summary,
      before: beforeSnapshot,
      after: data,
      status: 'pending',
    };
  },
})
```

### 4.2 `proposeUpdateDocument`

```ts
proposeUpdateDocument: tool({
  description:
    'Propose updating specific fields on an existing collection document. Creates a visual diff and pending action requiring user approval before execution.',
  parameters: z.object({
    collection: z.string().describe('Slug of the collection containing the document'),
    id: z.string().describe('Primary key ID of the document to modify'),
    data: z.record(z.any()).describe('Fields and values to update'),
    summary: z.string().describe('Summary of the proposed modification'),
  }),
  execute: async ({ collection, id, data, summary }) => { ... },
})
```

### 4.3 `proposeCreateDocument`

```ts
proposeCreateDocument: tool({
  description:
    'Propose creating a new document inside a collection (e.g. drafting a new article, product, or FAQ). Requires human approval before the document is saved to the database.',
  parameters: z.object({
    collection: z.string().describe('Slug of the target collection'),
    data: z.record(z.any()).describe('Field values for the new document'),
    summary: z.string().describe('Summary of the document being created'),
  }),
  execute: async ({ collection, data, summary }) => { ... },
})
```

### 4.4 `proposeDeleteDocument`

```ts
proposeDeleteDocument: tool({
  description:
    'Propose deleting an existing document from a collection. Creates a high-visibility danger confirmation card requiring explicit human approval.',
  parameters: z.object({
    collection: z.string().describe('Slug of the collection'),
    id: z.string().describe('Primary key ID of the document to delete'),
    summary: z.string().describe('Reason for proposing deletion'),
  }),
  execute: async ({ collection, id, summary }) => { ... },
})
```

---

## 5. Backend Execution & Rejection Endpoints

All action endpoints require active Dyrected user authentication and re-validate access policies.

### 5.1 `POST /api/ai/actions/:actionId/execute`

Executes an approved pending action against the database.

* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):**

  ```json
  {
    "success": true,
    "actionId": "act_8829102",
    "status": "executed",
    "executedAt": "2026-08-27T16:15:00.000Z",
    "result": {
      "id": "homepage",
      "updatedFields": ["hero.title"]
    }
  }
  ```

* **Execution Guard Rules:**
  1. Action must exist and have `status: 'pending'`.
  2. Action `expiresAt` must be in the future (rejects stale proposals older than 30 mins).
  3. Authenticated user must belong to the matching `projectId` tenant.
  4. User permissions for `access.update` / `access.create` / `access.delete` are re-evaluated against the live session.
  5. The mutation runs inside an atomic database transaction where supported.
  6. On success: Writes immutable audit record to `_dyrected_ai_audit` and marks action `executed`.

### 5.2 `POST /api/ai/actions/:actionId/reject`

Cancels and discards a pending action.

* **Response (200 OK):** `{ "success": true, "actionId": "act_8829102", "status": "rejected" }`

### 5.3 `POST /api/ai/actions/:actionId/rollback` (Admin Only)

Reverses a previously executed mutation using its recorded `rollbackPayload`.

* **Response (200 OK):** `{ "success": true, "actionId": "act_8829102", "status": "rolled_back" }`

---

## 6. Frontend Interactive Action & Diff Card (`ai-elements`)

The chat drawer renders proposal objects as rich interactive widgets:

### 6.1 Visual Card Structure

```text
┌──────────────────────────────────────────────────────────────────┐
│ ⚡ PROPOSED MUTATION: Global "homepage"                          │
│ Summary: Update hero title for higher conversion CTA             │
├──────────────────────────────────────────────────────────────────┤
│ Field: hero.title                                                │
│                                                                  │
│ - Current: "Build websites faster"                               │
│ + Proposed: "Build better websites with Dyrected."               │
├──────────────────────────────────────────────────────────────────┤
│ [ ✓ Approve & Apply ]                       [ ✕ Discard Proposal ]│
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 React Action Card Component (`packages/admin`)

```tsx
// packages/admin/src/components/ai/ActionCard.tsx
import React, { useState } from 'react';
import { Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface ActionCardProps {
  actionId: string;
  type: 'updateGlobal' | 'updateDocument' | 'createDocument' | 'deleteDocument';
  target: string;
  summary: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  status: 'pending' | 'executed' | 'rejected' | 'failed';
  onExecuted?: () => void;
}

export function ActionCard({ actionId, type, target, summary, before, after, status: initialStatus, onExecuted }: ActionCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/actions/${actionId}/execute`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Execution failed');

      setStatus('executed');
      toast.success(`Successfully applied changes to ${target}`);
      onExecuted?.();
    } catch (err: any) {
      toast.error(`Action failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      await fetch(`/api/ai/actions/${actionId}/reject`, { method: 'POST' });
      setStatus('rejected');
      toast.info('Proposal discarded');
    } catch (err: any) {
      toast.error('Failed to reject proposal');
    }
  };

  if (status === 'executed') {
    return (
      <div className="dy-p-3 dy-bg-emerald-500/10 dy-border dy-border-emerald-500/30 dy-rounded-xl dy-text-xs dy-space-y-1">
        <div className="dy-flex dy-items-center dy-gap-1.5 dy-font-semibold dy-text-emerald-700 dark:dy-text-emerald-400">
          <Check className="dy-w-4 dy-h-4" />
          <span>Change Applied to {target}</span>
        </div>
        <p className="dy-text-muted-foreground">{summary}</p>
      </div>
    );
  }

  return (
    <div className="dy-p-3.5 dy-bg-card dy-border dy-border-border dy-rounded-xl dy-space-y-3 dy-shadow-sm">
      <div className="dy-flex dy-items-center dy-justify-between">
        <span className="dy-text-[11px] dy-font-mono dy-font-semibold dy-uppercase dy-tracking-wider dy-text-primary">
          Proposed {type}
        </span>
        <span className="dy-text-[11px] dy-text-muted-foreground">{target}</span>
      </div>

      <p className="dy-text-xs dy-font-medium">{summary}</p>

      {/* Visual Diff Section */}
      {before && after && (
        <div className="dy-bg-muted/60 dy-p-2.5 dy-rounded-lg dy-space-y-1.5 dy-font-mono dy-text-[11px]">
          {Object.keys(after).map((field) => (
            <div key={field} className="dy-space-y-0.5">
              <span className="dy-text-muted-foreground dy-block">{field}:</span>
              {before[field] !== undefined && (
                <div className="dy-text-rose-600 dark:dy-text-rose-400 dy-bg-rose-500/10 dy-px-1.5 dy-py-0.5 dy-rounded">
                  - {JSON.stringify(before[field])}
                </div>
              )}
              <div className="dy-text-emerald-600 dark:dy-text-emerald-400 dy-bg-emerald-500/10 dy-px-1.5 dy-py-0.5 dy-rounded">
                + {JSON.stringify(after[field])}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="dy-flex dy-items-center dy-gap-2 dy-pt-1">
        <Button size="sm" onClick={handleApprove} disabled={isLoading} className="dy-h-8 dy-text-xs dy-gap-1.5">
          {isLoading ? <Loader2 className="dy-w-3.5 dy-h-3.5 dy-animate-spin" /> : <Check className="dy-w-3.5 dy-h-3.5" />}
          Approve & Apply
        </Button>
        <Button size="sm" variant="ghost" onClick={handleReject} disabled={isLoading} className="dy-h-8 dy-text-xs dy-gap-1.5">
          <X className="dy-w-3.5 dy-h-3.5" />
          Discard
        </Button>
      </div>
    </div>
  );
}
```

---

## 7. System Prompt Calibration for Safe Mutations

The system prompt is upgraded on Day 5 to instruct the assistant on proposal ethics and conversational formatting:

```markdown
### 10. CONTENT MUTATIONS & HUMAN APPROVAL RULES
When a user asks to create, modify, or delete CMS content:
1. **Never Claim Direct Mutation:** Do not say *"I have updated the headline."* Instead, say: *"I have prepared a proposal to update the headline on the homepage. Please review the diff below and approve to apply the change."*
2. **Call Proposal Tools:**
   - Use \`proposeUpdateGlobal\` for singleton configurations.
   - Use \`proposeUpdateDocument\` for existing collection documents.
   - Use \`proposeCreateDocument\` for drafting new entries.
   - Use \`proposeDeleteDocument\` for removals.
3. **Format Clear Diff Explanations:**
   - Always state the target collection/global and field names.
   - Provide a 1-sentence rationale explaining the editorial value of the proposed change.
4. **Destructive Safety Guard:**
   - For deletions or bulk replacements, warn the user clearly of the consequences before emitting the proposal.
```

---

## 8. Security, Isolation & Safety Rules

1. **Zero Unattended Writes:** The AI agent has **zero write permissions** to call `db.create()`, `db.update()`, or `db.delete()` directly during `streamText()`. It can only write to `_dyrected_ai_actions`.
2. **Dual-Gate Authorization:**
   - Gate 1: Proposal tool checks `isAccessAllowed()`.
   - Gate 2: Execution endpoint `POST /api/ai/actions/:id/execute` verifies the live session token of the approving user.
3. **Internal Schema Protection:** Proposals targeting system tables (`_dyrected_*`, passwords, auth tables) are blocked at the engine level.
4. **Action Expiration:** Pending proposals expire after 30 minutes to prevent stale, accidental clicks.
5. **Rollback Snapshots:** Every applied mutation stores a complete `beforeSnapshot` enabling single-click rollback from the audit log.

---

## 9. Day 5 Scope Boundaries

### ✅ What Day 5 INCLUDES

1. **4 Proposal Tools:** `proposeCreateDocument`, `proposeUpdateDocument`, `proposeDeleteDocument`, `proposeUpdateGlobal`.
2. **Action Queue Collection:** `_dyrected_ai_actions` with state machine and 30-minute expiration.
3. **Audit Trail Collection:** `_dyrected_ai_audit` with snapshots and rollback payloads.
4. **Execution Endpoints:** `POST /api/ai/actions/:id/execute`, `POST /api/ai/actions/:id/reject`, `POST /api/ai/actions/:id/rollback`.
5. **Interactive UI Card:** Visual diff preview with **[Approve & Apply]** and **[Discard]** buttons in `packages/admin`.
6. **Dual-Gate Permission Checking:** Verifies CMS permissions at proposal and execution time.

### ❌ What Day 5 EXCLUDES (Deferred to Future Work)

* ❌ Automated multi-document cascading batch mutations
* ❌ Autonomous Git commit / branch workflow integration
* ❌ Scheduled delayed mutations (cron-based auto-apply)

---

## 10. Day 5 Implementation Checklist

* [ ] **Database Layer & Schemas (`packages/core`):**
  * [ ] Define schemas for `_dyrected_ai_actions` and `_dyrected_ai_audit`.
  * [ ] Ensure database adapter initializes these tables during startup.
* [ ] **Core Mutation & Action Services (`packages/core`):**
  * [ ] Create `packages/core/src/services/ai-actions.service.ts` for managing action states and executing approved payloads.
  * [ ] Implement dry-run schema validation before proposal creation.
* [ ] **Proposal Tool Registry (`packages/core/src/services/ai-tools.ts`):**
  * [ ] Implement `proposeUpdateGlobal` tool.
  * [ ] Implement `proposeUpdateDocument` tool.
  * [ ] Implement `proposeCreateDocument` tool.
  * [ ] Implement `proposeDeleteDocument` tool.
* [ ] **API Endpoints (`packages/core`):**
  * [ ] Implement `POST /api/ai/actions/:actionId/execute`.
  * [ ] Implement `POST /api/ai/actions/:actionId/reject`.
  * [ ] Implement `POST /api/ai/actions/:actionId/rollback`.
* [ ] **Frontend Admin UI (`packages/admin`):**
  * [ ] Build `ActionCard` component with visual diffs and approval buttons.
  * [ ] Wire message tool rendering in `DyrectedAILipTrigger.tsx` to mount `ActionCard` when proposal tools execute.
  * [ ] Add toast feedback and live form refresh upon approval.
* [ ] **Verification & Testing:**
  * [ ] Ask: *"Change the homepage headline to 'Build better websites with Dyrected.'"*
  * [ ] Verify assistant returns proposal diff card without mutating database directly.
  * [ ] Click **Approve & Apply** ➔ Verify database updates and audit log entry is written.
  * [ ] Click **Discard** on a new proposal ➔ Verify action status updates to `rejected` and database remains unchanged.
  * [ ] Attempt proposal on a restricted collection as an unauthorized role ➔ Verify permission error.

---

## 11. Day 5 Acceptance Criteria

1. **No Unapproved Writes:** The assistant never updates or creates database records autonomously during chat turns.
2. **Visual Diff Fidelity:** Proposals accurately reflect the existing field value (`before`) and the proposed replacement (`after`).
3. **Execution Integrity:** Clicking **Approve & Apply** applies the exact proposed payload to the database, writes an audit record to `_dyrected_ai_audit`, and updates the UI in real-time.
4. **Permission Enforcement:** Users lacking `update` or `create` permissions on a collection or global cannot propose or execute mutations.
