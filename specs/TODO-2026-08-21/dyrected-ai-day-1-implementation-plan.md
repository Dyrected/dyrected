# Dyrected AI — Day 1 Implementation Plan

This document breaks the Day 1 specification into phased, executable work packages. Each phase is independently verifiable and builds toward the final acceptance criteria.

---

## Phase Overview

| Phase | Focus | Duration | Key Deliverable |
|-------|-------|----------|-----------------|
| **0** | Database & Types | ~2 hrs | `_dyrected_ai_threads` & `_dyrected_ai_messages` tables + TypeScript types |
| **1** | Core AI Service | ~3 hrs | `AIAgent` class with system prompt builder + streaming logic |
| **2** | Backend API Routes | ~3 hrs | 4 REST endpoints (`POST/GET /ai/threads`, `GET /ai/threads/:id`, `POST /ai/threads/:id/messages`) |
| **3** | Frontend UI Components | ~4 hrs | `DyrectedAILipTrigger`, `DyrectedAIChatPanel`, `useChat` integration |
| **4** | Integration & Polish | ~2 hrs | Wire trigger into `AdminShell`, env validation, keyboard shortcut, error banner |
| **5** | Validation & Acceptance | ~1 hr | End-to-end test against acceptance criteria |

**Total Estimate: ~15 hours**

---

## Phase 0: Database & Types

### Goal
Create internal collections for threads and messages in both database adapters (Postgres, SQLite) with proper TypeScript types.

### Files to Create/Modify

| File | Action |
|------|--------|
| `packages/core/src/types/ai.ts` | **New** — Type definitions for `AIThread`, `AIMessage`, `DyrectedAIContext` |
| `packages/db-postgres/src/index.ts` | **Modify** — Add table creation in `ensureTable` / `sync` for AI collections |
| `packages/db-sqlite/src/index.ts` | **Modify** — Same for SQLite adapter |

### 0.1 Type Definitions (`packages/core/src/types/ai.ts`)

```typescript
export interface AIThread {
  id: string;
  projectId: string;
  userId: string;
  title?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AIMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date | string;
  metadata?: Record<string, unknown>;
}

export interface DyrectedAIContext {
  project: { name: string; id: string };
  collections: Array<{ slug: string; label?: string; fields?: Array<{ name: string; type: string; required?: boolean }> }>;
  globals: Array<{ slug: string; label?: string }>;
  user: { name?: string; email?: string; role?: string };
}
```

### 0.2 Postgres Adapter Changes

In `initInternalTables()`, add:
```sql
CREATE TABLE IF NOT EXISTS _dyrected_ai_threads (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS _dyrected_ai_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES _dyrected_ai_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_thread_id ON _dyrected_ai_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_threads_user_project ON _dyrected_ai_threads(user_id, project_id);
```

Also update `ensureTable()` to skip these internal collections (they don't use the standard `collection_` prefix).

### 0.3 SQLite Adapter Changes

Mirror the same schema in `packages/db-sqlite/src/index.ts`.

### Validation
- Run `pnpm test` in both db packages
- Verify tables created on app startup with a test config

---

## Phase 1: Core AI Service

### Goal
Build a reusable `AIAgent` class in `packages/core` that encapsulates:
- System prompt construction (from spec §4)
- Context resolution (project, collections, globals, user)
- Streaming with `streamText()` from Vercel AI SDK
- Persistence callbacks (`onFinish`)

### Files to Create/Modify

| File | Action |
|------|--------|
| `packages/core/package.json` | **Modify** — Add `ai`, `@ai-sdk/google` dependencies |
| `packages/core/src/services/ai.service.ts` | **New** — `AIAgent` class + `buildDyrectedSystemPrompt()` |
| `packages/core/src/index.ts` | **Modify** — Export AI service |

### 1.1 Dependencies

```bash
cd packages/core && pnpm add ai @ai-sdk/google
```

### 1.2 AI Service (`packages/core/src/services/ai.service.ts`)

Key responsibilities:
1. **`buildDyrectedSystemPrompt(context: DyrectedAIContext): string`** — Exact implementation from spec §4.2
2. **`resolveContext(c, threadId): Promise<DyrectedAIContext>`** — Load project, collections, globals, user from request context
3. **`streamReply(threadId, userMessage, context): Promise<ReadableStream>`** — Call `streamText()`, handle `onFinish` persistence
4. **`generateTitle(firstUserMessage): Promise<string>`** — Background call for auto-title

### 1.3 Persistence in `onFinish`

```typescript
const result = streamText({
  model: google('gemini-2.5-flash'),
  system: systemPrompt,
  messages: [...history, { role: 'user', content: userMessage }],
  onFinish: async ({ text, usage, finishReason }) => {
    await db.create({ collection: '_dyrected_ai_messages', data: {
      id: generateId(),
      threadId,
      role: 'assistant',
      content: text,
      createdAt: new Date(),
      metadata: { tokens: usage?.totalTokens, finishReason }
    }});
    await db.update({ collection: '_dyrected_ai_threads', id: threadId, data: { updatedAt: new Date() }});
  }
});
return result.toDataStreamResponse();
```

### Validation
- Unit test `buildDyrectedSystemPrompt` output contains project name, collections, globals
- Verify `streamText` integrates without TypeScript errors (`pnpm build`)

---

## Phase 2: Backend API Routes

### Goal
Register 4 REST endpoints under `/api/ai/` in `packages/core/src/router.ts`.

### Files to Modify

| File | Action |
|------|--------|
| `packages/core/src/router.ts` | **Modify** — Add AI route registration |
| `packages/core/src/controllers/ai.controller.ts` | **New** — Controller class for AI endpoints |

### 2.1 AI Controller (`packages/core/src/controllers/ai.controller.ts`)

Implement 4 methods:
- `createThread(c)` → `POST /api/ai/threads`
- `listThreads(c)` → `GET /api/ai/threads`
- `getThread(c)` → `GET /api/ai/threads/:threadId`
- `postMessage(c)` → `POST /api/ai/threads/:threadId/messages` (streaming)

All endpoints:
- Require auth via `requireAuth(config)`
- Scope to current project via `c.get('user')` + `siteId` header
- Return 412 if `GEMINI_API_KEY` not set (check at controller init)

### 2.2 Route Registration

In `registerRoutes()`, add before dynamic catch-all:
```typescript
const aiController = new AIController(config);

app.post('/api/ai/threads', requireAuth(config), (c) => aiController.createThread(c));
app.get('/api/ai/threads', requireAuth(config), (c) => aiController.listThreads(c));
app.get('/api/ai/threads/:threadId', requireAuth(config), (c) => aiController.getThread(c));
app.post('/api/ai/threads/:threadId/messages', requireAuth(config), (c) => aiController.postMessage(c));
```

### Validation
- `curl -X POST /api/ai/threads` → 201 with thread object
- `curl /api/ai/threads` → 200 with thread list
- `curl /api/ai/threads/:id` → 200 with messages
- `curl -X POST /api/ai/threads/:id/messages -d '{"content":"test"}'` → SSE stream
- Missing `GEMINI_API_KEY` → 412 `AI_NOT_CONFIGURED`

---

## Phase 3: Frontend UI Components

### Goal
Build the chat UI in `packages/admin` using `@ai-sdk/react` and `ai-elements` components.

### Files to Create/Modify

| File | Action |
|------|--------|
| `packages/admin/package.json` | **Modify** — Add `@ai-sdk/react`, `ai` dependencies |
| `packages/admin/src/components/ai/DyrectedAILipTrigger.tsx` | **New** — Right-side lip trigger + drawer (spec §6.2) |
| `packages/admin/src/components/ai/DyrectedAIChatPanel.tsx` | **New** — Chat panel with `useChat` (spec §6.3) |
| `packages/admin/src/components/ai/index.ts` | **New** — Barrel export |
| `packages/admin/src/components/ui/sheet.tsx` | **Verify** — Already exists (Radix Sheet) |
| `packages/admin/src/components/layout/admin-shell.tsx` | **Modify** — Add `<DyrectedAILipTrigger />` |

### 3.1 Dependencies

```bash
cd packages/admin && pnpm add @ai-sdk/react ai
```

### 3.2 ai-elements Components

The spec references components from `@/components/ai-elements/`. These need to be created or imported from the ai-elements library. Based on the skill, these are typically copied from the Vercel ai-elements library. Create local copies in `packages/admin/src/components/ai-elements/`:

- `conversation.tsx` — `Conversation`, `ConversationContent`, `ConversationScrollButton`
- `message.tsx` — `Message`, `MessageContent`, `MessageResponse`
- `prompt-input.tsx` — `PromptInput`, `PromptInputTextarea`, `PromptInputActions`, `PromptInputAction`

### 3.3 Lip Trigger Component

Implement exactly as spec §6.2:
- Desktop: vertical tab on right edge (`fixed right-0 top-1/2`)
- Mobile: FAB bottom-right (`fixed bottom-5 right-5`)
- Keyboard shortcut: `Cmd+J` / `Ctrl+J`
- Opens `Sheet` from right side

### 3.4 Chat Panel Component

Implement exactly as spec §6.3:
- `useChat({ api: threadId ? `/api/ai/threads/${threadId}/messages` : '/api/ai/chat' })`
- Top bar with "New Conversation" button
- Error banner for missing `GEMINI_API_KEY` (412 handling)
- `Conversation` + `Message` from ai-elements
- `PromptInput` with textarea and send action

### Validation
- Trigger button visible on all admin pages
- Drawer opens/closes smoothly
- New conversation creates thread
- Messages stream in real-time
- Error banner shows when API key missing

---

## Phase 4: Integration & Polish

### Goal
Wire everything together, handle edge cases, add polish.

### Tasks

| Task | Details |
|------|---------|
| **Add trigger to AdminShell** | Import and render `<DyrectedAILipTrigger />` in `admin-shell.tsx` after `</main>` |
| **Thread persistence** | Chat panel stores `activeThreadId` in `localStorage`; restores on reload |
| **Auto-title** | Backend generates title on first message; frontend updates thread list |
| **Keyboard shortcut** | `Cmd+J` / `Ctrl+J` toggles drawer (already in spec component) |
| **Error handling** | 412 → show banner; network errors → toast via `sonner` |
| **Loading states** | `isLoading` from `useChat` disables send button |
| **Empty state** | Show placeholder when no thread selected |

### Validation
- Full flow: Open drawer → New chat → Send message → See stream → Refresh → History preserved
- Mobile FAB works
- Keyboard shortcut works
- No console errors

---

## Phase 5: Validation & Acceptance

### Goal
Verify all 3 acceptance criteria from spec §9 are met.

### Test Script

```bash
# 1. Start dev server
pnpm dev

# 2. In browser devtools console:
# - Navigate to a project with collections
# - Open AI drawer (Cmd+J)
# - Click "New"
# - Ask: "What can you help me do with this project?"
# - Verify response mentions project name + real collections
# - Verify streaming (tokens appear incrementally)
# - Refresh page
# - Verify conversation history loads
```

### Acceptance Checklist

- [ ] **Specific Project Context**: Response names active project + collections
- [ ] **Real-time Streaming**: Tokens appear chunk-by-chunk without delay
- [ ] **Persistence**: Page refresh restores exact conversation from DB

---

## Dependency Graph

```
Phase 0 (DB/Types)
    ↓
Phase 1 (Core Service) ← depends on Phase 0 types
    ↓
Phase 2 (API Routes) ← depends on Phase 1 service
    ↓
Phase 3 (Frontend UI) ← can start in parallel with Phase 2
    ↓
Phase 4 (Integration) ← depends on Phase 2 + 3
    ↓
Phase 5 (Validation) ← depends on Phase 4
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Vercel AI SDK version conflicts | Pin exact versions in both packages; test build early |
| Database adapter differences | Write shared migration helper; test both Postgres + SQLite |
| ai-elements component API changes | Copy components locally (vendored) rather than npm dependency |
| Streaming + Hono integration | Use `streamText().toDataStreamResponse()` which returns `Response` compatible with Hono |
| Auth context in AI routes | Reuse existing `requireAuth` middleware; user available at `c.get('user')` |

---

## Quick Start Commands

```bash
# Install all new dependencies
cd packages/core && pnpm add ai @ai-sdk/google
cd packages/admin && pnpm add @ai-sdk/react ai

# Run typecheck after each phase
pnpm --filter @dyrected/core build
pnpm --filter @dyrected/admin build

# Run tests
pnpm --filter @dyrected/core test
pnpm --filter @dyrected/admin test
```