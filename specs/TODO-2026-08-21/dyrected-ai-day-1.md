# Dyrected AI — Day 1 Specification

This document details the complete Day 1 implementation specification for embedding native Gemini-powered AI into Dyrected.

---

## 1. Day 1 Goal & Core Decisions

The goal of Day 1 is to build the **persistent conversational foundation** that all future capabilities will build upon.

| Area | Day 1 Decision | Detail |
| :--- | :--- | :--- |
| **Chat Persistence** | **DB Persisted** | Store threads and messages in dedicated database collections (`_dyrected_ai_threads` and `_dyrected_ai_messages`). |
| **SDK Stack** | **Vercel AI SDK** | `@ai-sdk/google` provider + `streamText()` on backend; `@ai-sdk/react` (`useChat()`) on frontend. |
| **Model** | **`gemini-2.5-flash`** | Fast, low latency, structured capability support. |
| **API Key Storage** | **`GEMINI_API_KEY` env var** | Read directly from `process.env.GEMINI_API_KEY`. No settings UI needed for Day 1. |
| **Streaming** | **Server-Sent Events (SSE)** | Tokens stream to the client in real-time from Day 1. |

---

## 2. Day 1 Request & Streaming Flow

```text
┌────────────────────────────────────────────────────────┐
│                   Dyrected Admin UI                    │
│                (useChat() React Hook)                  │
└───────────────────────────┬────────────────────────────┘
                            │ POST /ai/threads/:threadId/messages
                            │ { "content": "What content do we have on this project?" }
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Dyrected Core API                    │
│  1. Authenticate user & resolve project context        │
│  2. Verify thread ownership (userId + projectId)       │
│  3. Persist user message to `_dyrected_ai_messages`    │
│  4. Load previous messages for this thread             │
│  5. Build system prompt with project metadata          │
│  6. Call Vercel AI SDK `streamText()` with Gemini      │
│  7. Stream SSE chunks back to browser in real-time     │
│  8. On stream finish: Persist assistant message to DB  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Database Persistence Schema

Day 1 introduces two internal system collections in the database adapter:

### 3.1 `_dyrected_ai_threads`

Represents a conversation session belonging to a user and project.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID / CUID) | Yes | Primary key |
| `projectId` | `string` | Yes | Scoped to current Dyrected project |
| `userId` | `string` | Yes | Authenticated user ID |
| `title` | `string` | No | Title (auto-generated or first message snippet) |
| `createdAt` | `Date` / `timestamp` | Yes | Thread creation timestamp |
| `updatedAt` | `Date` / `timestamp` | Yes | Last activity timestamp |

### 3.2 `_dyrected_ai_messages`

Stores individual conversational turns inside a thread.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID / CUID) | Yes | Primary key |
| `threadId` | `string` (FK) | Yes | References `_dyrected_ai_threads.id` |
| `role` | `string` (`user` \| `assistant` \| `system`) | Yes | Role of the message author |
| `content` | `string` / `text` | Yes | Text content of the message |
| `createdAt` | `Date` / `timestamp` | Yes | Message timestamp |
| `metadata` | `json` | No | Optional metadata (token counts, finish reason) |

---

## 4. Context Management & System Prompt

On Day 1, context is passed in the system prompt so the model is fully aware of Dyrected and the active project without requiring tools.

### 4.1 Context Payload Resolved by Server

```json
{
  "project": {
    "name": "Acme Store",
    "id": "proj_12345"
  },
  "collections": [
    { "slug": "products", "label": "Products" },
    { "slug": "categories", "label": "Categories" }
  ],
  "globals": [
    { "slug": "site-settings", "label": "Site Settings" }
  ]
}
```

### 4.2 Research-Backed Universal Copywriting Engine

The system prompt is backed by empirical research from digital UX and conversion copywriting authorities:

* **Nielsen Norman Group (NN/g):** Eye-tracking research on F-shaped scanning patterns, layer-cake reading, front-loaded benefits, and plain-language scannability.
* **Baymard Institute:** E-commerce UX benchmarks emphasizing concrete specifications, sensory clarity, and zero vague marketing fluff.
* **Copyhackers (Joanna Wiebe):** Voice-of-Customer data, customer awareness mapping (Eugene Schwartz), and proven sequencing frameworks (PAS, BAB, FAB, AIDA).
* **CXL (Conversion XL):** B2B decision-maker psychology, risk-mitigation, and ROI/outcome-first value propositions.
* **Robert Cialdini (Principles of Persuasion):** Ethical deployment of Social Proof, Authority, and Consistency.

```ts
export function buildDyrectedSystemPrompt(context: DyrectedAIContext): string {
  const { project, collections, globals, user } = context;

  const collectionSummaries = collections.map((c) => {
    const fields = c.fields?.map((f) => `${f.name} (${f.type}${f.required ? ", required" : ""})`).join(", ");
    return `- Collection "${c.label || c.slug}" (slug: "${c.slug}"): [${fields || "no fields defined"}]`;
  }).join("\n");

  const globalSummaries = globals.map((g) => {
    return `- Global "${g.label || g.slug}" (slug: "${g.slug}")`;
  }).join("\n");

  return `
You are the Dyrected AI Assistant — an elite conversion copywriter, content strategist, and technical CMS specialist embedded natively inside Dyrected Headless CMS.

### 1. CMS DOMAIN & CONTEXT
- Dyrected is a declarative, schema-driven Headless CMS.
- Structure: **Collections** (multi-entry datasets like Articles, Products, Authors) and **Globals** (singletons like Site Settings, Nav).
- Project: "${project.name}" (ID: ${project.id})
- User: ${user.name || user.email || "Editor"} (Role: ${user.role || "editor"})
- Available Collections:
${collectionSummaries || "  (None)"}
- Available Globals:
${globalSummaries || "  (None)"}

### 2. EVIDENCE-BASED INDUSTRY & AWARENESS CALIBRATION
Calibrate content using empirical copywriting and UX research frameworks:

* **E-Commerce & D2C (Baymard Institute & FAB Model):**
  - Translate raw specs into tangible customer benefits (Feature $\\to$ Advantage $\\to$ Benefit).
  - Use sensory, descriptive copy with explicit dimensions, materials, and sizing to eliminate buyer hesitation (Baymard product page UX benchmark).
* **B2B SaaS & Tech (CXL & PAS Model):**
  - Target risk-averse stakeholders with clear business outcomes, operational efficiency, and developer velocity using Problem $\\to$ Agitate $\\to$ Solution (PAS).
  - Front-load quantifiable value propositions and integration clarity over abstract claims.
* **Editorial & Publishing (NN/g Inverted Pyramid):**
  - Front-load critical takeaways in the first two sentences; structure supporting depth in descending order of importance.
  - Employ magnetic hooks and skimmable $H_2/H_3$ subheadings that answer reader search intent.
* **Professional Services & Healthcare / Legal / Finance (Cialdini Authority & Trust):**
  - Project authority, empathy, and credibility through transparent methodology, qualifications, and compliance-safe vocabulary.
* **Non-Profit & Philanthropy (Emotional Resonance & Transparency):**
  - Concrete outcome metrics (*"What $50 provides"*) paired with mission-driven storytelling and friction-free donation CTAs.
* **Education & EdTech (Skill Transformation):**
  - Frame copy around student transformation (*Before $\\to$ After*) with clear, modular syllabus breakdowns.
* **Events, Podcasts & Media:**
  - High-energy anticipation, speaker credentials, and structured show notes with timestamps and key takeaways.
* **Hospitality, Travel & Real Estate:**
  - Evocative scene-setting paired with structured, scannable amenity checklists.
* **Food & Beverage:**
  - Appetizing flavor profiles, culinary origin, and transparent dietary/allergen clarity.
* **Public Sector & Community (Plain Language / WCAG):**
  - Maximum clarity, active voice, Grade 6–8 readability, and step-by-step citizen instructions.

### 3. SCANNABILITY & READING PATTERNS (NN/g F-Shaped & Layer-Cake Rules)
Web readers scan rather than read linearly. You must format accordingly:
- **Front-Load Value:** Place primary benefits and keywords in the first 3–5 words of headings, bullet points, and paragraph openers.
- **Short Paragraphs:** Restrict paragraphs to 1–3 sentences (max 50 words) to eliminate walls of text.
- **Visual Anchors:** Use bold lead-ins for list items and clean Markdown tables for comparisons.

### 4. CADENCE, RHYTHM & HUMAN VOICE (Gary Provost Principle)
- **Write Music:** Alternately mix short, punchy sentences (3–7 words) for emphasis with longer, compound sentences (18–25+ words) that build depth and momentum.
- **Break Monotony:** Never write more than two consecutive sentences of similar length.

### 5. STRICT LINGUISTIC BANS (Eliminating "AI Tells")
Never use clichéd vocabulary and structural tropes that signal machine-generated text:
- **Banned Verbs:** *delve, leverage, unlock, unleash, harness, utilize, empower, transform, elevate, streamline, foster, navigate*.
- **Banned Adjectives:** *robust, seamless, cutting-edge, game-changing, groundbreaking, innovative, vital, crucial, myriad, bespoke, vibrant*.
- **Banned Transitional Filler:** *"In today's fast-paced world"*, *"In the ever-changing digital landscape"*, *"It's important to note"*, *"At the end of the day"*, *"Furthermore"*, *"Moreover"*, *"In conclusion"*.
- **Banned Contrastive Tropes:** Never use *"It's not just about X, it's about Y"* or *"It's not merely X; it's Y"*.
- **Em Dash Ban:** Do not overuse em dashes (—); use natural punctuation.

### 6. ANTI-HALLUCINATION GUARD
- Never fabricate company statistics, pricing, or technical claims.
- Insert bracketed placeholders like \`[Insert Metric]\`, \`[Insert Price]\`, \`[Insert Year]\` when specific facts are needed.

### 7. OUTPUT STRUCTURE & FIELD FORMATTING
1. **Zero Fluff Openers:** Start immediately with the content. Never open with pleasantries (*"Sure!"*, *"Here is the copy you asked for:"*).
2. **Field-by-Field Draft Labeling:**
   **Title:** [High-CTR Title]
   **Slug:** [clean-lowercase-hyphenated-slug]
   **Excerpt:** [1–2 sentence hook / summary]
   **SEO Meta Title:** [Under 60 chars with primary keyword early]
   **SEO Meta Description:** [140–160 chars with clear CTA]
   **Content:**
   [Structured rich-text body formatted with proper Markdown H2/H3 headings]
3. **Structured Tables & Code Tags:** Use Markdown tables for comparisons. Always specify language identifiers on code blocks (\`\`\`html, \`\`\`json, \`\`\`ts).
4. **Actionable Next Steps:** End with 1–2 sharp, practical editorial suggestions.
`;
}
```

---

## 5. Backend API Endpoints

All endpoints require standard Dyrected user authentication.

### 5.1 `POST /ai/threads`

Creates a new conversation thread.

* **Request Body:** `{ "title"?: string }`
* **Response (201):**

  ```json
  {
    "thread": {
      "id": "thread_abc123",
      "projectId": "proj_12345",
      "userId": "usr_987",
      "title": "New Conversation",
      "createdAt": "2026-08-21T00:00:00.000Z",
      "updatedAt": "2026-08-21T00:00:00.000Z"
    }
  }
  ```

### 5.2 `GET /ai/threads`

Lists existing threads for the authenticated user and current project.

* **Query Params:** `?limit=20&page=1`
* **Response (200):**

  ```json
  {
    "threads": [
      {
        "id": "thread_abc123",
        "title": "Content Overview",
        "createdAt": "2026-08-21T00:00:00.000Z",
        "updatedAt": "2026-08-21T00:05:00.000Z"
      }
    ]
  }
  ```

### 5.3 `GET /ai/threads/:threadId`

Retrieves a thread and its full message history.

* **Response (200):**

  ```json
  {
    "thread": {
      "id": "thread_abc123",
      "title": "Content Overview"
    },
    "messages": [
      {
        "id": "msg_1",
        "role": "user",
        "content": "What collections do we have?",
        "createdAt": "2026-08-21T00:01:00.000Z"
      },
      {
        "id": "msg_2",
        "role": "assistant",
        "content": "This project has Products and Categories collections.",
        "createdAt": "2026-08-21T00:01:02.000Z"
      }
    ]
  }
  ```

### 5.4 `POST /ai/threads/:threadId/messages` (Streaming Response)

Sends a message to the thread and streams back the assistant's reply.

* **Request Body:**

  ```json
  {
    "content": "What can you help me do on this project?"
  }
  ```

* **Error Handling (Missing API Key):**
  If `process.env.GEMINI_API_KEY` is not configured, the endpoint returns a `412 Precondition Failed`:

  ```json
  {
    "error": "AI_NOT_CONFIGURED",
    "message": "GEMINI_API_KEY is not configured on the server."
  }
  ```

* **Response Headers:** `Content-Type: text/event-stream; charset=utf-8`
* **Response Body:** Real-time Server-Sent Events stream using `streamText().toDataStreamResponse()`.
* **Server Lifecycle & Title Auto-Generation:**
  1. Verify auth and thread ownership (`userId` + `projectId`).
  2. Persist user message to `_dyrected_ai_messages`.
  3. **Auto-Generate Thread Title:** If the thread has no title or default title, trigger a fast background completion (`generateText({ model: google('gemini-2.5-flash'), prompt: "Summarize this user request in 3-5 words for a title: " + content })`) and update `_dyrected_ai_threads.title`.
  4. Load previous messages from `_dyrected_ai_messages` for this `threadId`.
  5. Call `streamText()` with `@ai-sdk/google` (`gemini-2.5-flash`).
  6. In `onFinish` callback: persist the full assistant response text to `_dyrected_ai_messages` and update thread `updatedAt`.

---

## 6. Frontend UI: Right-Side Lip Dock & Vercel `ai-elements`

The UI implements a **PostHog-style floating right-edge lip trigger** and builds the chat panel using **Vercel `ai-elements`** (`Conversation`, `Message`, `PromptInput`, `Suggestion`).

### 6.1 PostHog-Style Right-Side Lip Trigger

A tab hanging from the right viewport margin with smooth slide-over drawer transitions:

```
Desktop (≥ 768px):                      Mobile (< 768px):
┌───────────────────────────────┬───┐  ┌───────────────────────────────────┐
│ Dyrected Admin                │ ✨│  │ Dyrected Admin                    │
│                               │ A │  │                                   │
│                               │ I │  │                                   │
│                               │   │  │                                   │
│                               │ ⌘ │  │                                   │
│                               │ J │  │                               [✨]│
└───────────────────────────────┴───┘  └───────────────────────────────────┘
   ▲ Right-edge vertical tab              ▲ Bottom-right Floating Action Button
```

### 6.2 Responsive Drawer & Trigger Component

```tsx
import React, { useState, useEffect } from "react";
import { Sparkles, X, Plus, AlertCircle, History } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ai-elements/prompt-input";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function DyrectedAILipTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Keyboard shortcut: Cmd + J / Ctrl + J
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* PostHog-style Right-Side Floating Lip (Desktop) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Dyrected AI Assistant (Cmd+J)"
        className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 items-center gap-1.5 px-2 py-3.5 bg-primary text-primary-foreground rounded-l-xl shadow-xl hover:pr-3.5 hover:shadow-2xl transition-all duration-200 group cursor-pointer border-y border-l border-primary/20"
      >
        <Sparkles className="w-4 h-4 text-primary-foreground group-hover:scale-110 transition-transform" />
        <span className="[writing-mode:vertical-lr] text-[11px] font-bold tracking-widest uppercase select-none">
          AI Assistant
        </span>
        <kbd className="text-[9px] bg-primary-foreground/20 px-1 py-0.5 rounded font-mono select-none">
          ⌘J
        </kbd>
      </button>

      {/* Mobile Floating Action Button (< 768px) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Dyrected AI Assistant"
        className="flex md:hidden fixed bottom-5 right-5 z-40 p-3.5 bg-primary text-primary-foreground rounded-full shadow-2xl active:scale-95 transition-transform"
      >
        <Sparkles className="w-5 h-5" />
      </button>

      {/* Slide-over Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full">
          <DyrectedAIChatPanel
            threadId={activeThreadId}
            onSelectThread={setActiveThreadId}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
```

### 6.3 Chat Panel using `ai-elements`

```tsx
export function DyrectedAIChatPanel({
  threadId,
  onSelectThread,
}: {
  threadId: string | null;
  onSelectThread: (id: string | null) => void;
}) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: threadId ? `/api/ai/threads/${threadId}/messages` : "/api/ai/chat",
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Bar */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Dyrected Assistant</span>
        </div>
        <button
          onClick={() => onSelectThread(null)}
          title="New Conversation"
          className="p-1.5 hover:bg-muted rounded-md text-xs font-medium flex items-center gap-1 text-muted-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Missing Key Banner */}
      {error && (
        <div className="m-4 p-3 border border-destructive/20 bg-destructive/10 rounded-lg flex items-start gap-2.5 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">AI not configured:</span> Please set <code className="font-mono bg-destructive/20 px-1 py-0.5 rounded">GEMINI_API_KEY</code> in your environment.
          </div>
        </div>
      )}

      {/* Conversation Thread using ai-elements */}
      <Conversation className="flex-1">
        <ConversationContent className="p-4 space-y-4">
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                <MessageResponse>{message.content}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Prompt Input using ai-elements */}
      <div className="p-4 border-t">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask Dyrected anything..."
            className="min-h-[44px]"
          />
          <PromptInputActions>
            <PromptInputAction
              tooltip="Send message"
              disabled={isLoading || !input.trim()}
            />
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  );
}
```

---

## 7. Day 1 Scope Boundaries

### ✅ What Day 1 INCLUDES

1. **DB Collections:** `_dyrected_ai_threads` & `_dyrected_ai_messages`.
2. **REST Endpoints:** `POST/GET /ai/threads`, `GET /ai/threads/:threadId`, `POST /ai/threads/:threadId/messages`.
3. **Vercel AI SDK:** `@ai-sdk/google` (`gemini-2.5-flash`) + `streamText()`.
4. **Real-time SSE Streaming:** Real-time token delivery to the client.
5. **Project-Aware Context:** System prompt awareness of project name, ID, collections, and globals.
6. **Basic Chat UI:** Working `useChat()` chat panel in `packages/admin`.

### ❌ What Day 1 EXCLUDES

* ❌ RAG / Embeddings / Vector Search
* ❌ Tools / Function calling
* ❌ Form mutations or draft patching
* ❌ Multi-agent routing
* ❌ Admin Settings API key configuration UI

---

## 8. Day 1 Implementation Checklist

- [ ] **Database Layer:**
  - [ ] Define schemas for `_dyrected_ai_threads` and `_dyrected_ai_messages`.
  - [ ] Ensure database adapter initializes these tables during startup/migration.
- [ ] **Backend Services & Routes (`packages/core`):**
  - [ ] Install dependencies: `ai`, `@ai-sdk/google`.
  - [ ] Create AI service module in core.
  - [ ] Implement `POST /ai/threads` and `GET /ai/threads`.
  - [ ] Implement `GET /ai/threads/:threadId`.
  - [ ] Implement streaming `POST /ai/threads/:threadId/messages` with `streamText()`.
  - [ ] Handle persistence in `onFinish` stream callback.
- [ ] **Frontend UI (`packages/admin`):**
  - [ ] Install `@ai-sdk/react`.
  - [ ] Build basic `AIChatDrawer` with `useChat()`.
  - [ ] Add trigger button to navigation/shell.
- [ ] **Validation:**
  - [ ] Test asking: *"What can you help me do with this project?"*.
  - [ ] Verify real-time streaming output.
  - [ ] Verify message persistence across page reloads.

---

## 9. Day 1 Acceptance Criteria

1. **Specific Project Context:** Asking *"What can you help me do with this project?"* returns a response specifically naming the active Dyrected project and its real collections, not generic ChatGPT filler.
2. **Real-time Streaming:** The assistant response streams into the UI immediately chunk-by-chunk.
3. **Persistence:** Refreshing the browser or switching between threads preserves and renders the exact conversation history from the database.
