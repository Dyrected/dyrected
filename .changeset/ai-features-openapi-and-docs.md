---
"@dyrected/core": minor
"@dyrected/admin": minor
"@dyrected/docs": patch
"@dyrected/knowledge": patch
---

- **OpenAPI & Swagger AI Surface**:
  - Integrated all `/api/ai/*` endpoints into the live OpenAPI 3.0 specification generator (`/api/openapi.json`) and Swagger UI documentation (`/api/docs`).
  - Added full request/response schemas for `/api/ai/chat`, `/api/ai/threads`, `/api/ai/threads/{threadId}`, `/api/ai/threads/{threadId}/messages`, `/api/ai/actions/{actionId}`, `/api/ai/actions/{actionId}/execute`, `/api/ai/actions/{actionId}/reject`, `/api/ai/rag/reindex`, and `/api/ai/rag/search`.
  - Added unit test coverage for AI OpenAPI route definitions in `packages/core/src/__tests__/openapi.test.ts`.

- **AI Core Prompt Architecture & Safety**:
  - Streamlined `buildDyrectedSystemPrompt` with dual-mode communication (editorial partner by default, developer mode opt-in).
  - Enforced proactive mutation proposals (`proposeCreateDocument`, `proposeUpdateDocument`, `proposeUpdateGlobal`) without asking passive permission for content rewrites.
  - Added automatic provider auto-detection across `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, and `AGENTROUTER_API_KEY`.

- **Admin Assistant UI & Streaming Enhancements**:
  - Added live animated streaming carets and streaming status banners with instant abort (`stop()`) support.
  - Upgraded `TypingDots` with contextual status states ("Thinking...", "Synthesizing data...", "Drafting response...").
  - Deduplicated tool execution parts and action proposal keys to eliminate React duplicate key warnings.

- **Comprehensive Documentation Suite (`apps/docs`)**:
  - Added `model-content/configuration/ai.mdx`: Complete guide to configuring AI, setting brand voice directives, and collection prompts.
  - Added `editor-experience/ai-assistant.mdx`: Guide to the embedded Lip Trigger assistant drawer, live diff viewers, and human-in-the-loop proposals.
  - Added `deliver-content/ai-agent-api.mdx`: Programmatic `AIAgent` guide for Server-Sent Events (SSE) streaming and Telegram/WhatsApp webhooks.
  - Added `deliver-content/rest-api/ai-endpoints.mdx`: Complete REST API reference for all AI endpoints.
  - Added `examples-and-recipes/library/chat-to-order-proposal.mdx`: Recipe for parsing unstructured customer chat logs into structured database orders.
  - Added `examples-and-recipes/library/custom-ai-tools.mdx`: Recipe for extending Dyrected AI with custom server-side functions and Zod schemas.
