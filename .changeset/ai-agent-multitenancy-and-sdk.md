---
"@dyrected/core": minor
"@dyrected/sdk": minor
"@dyrected/admin": minor
"@dyrected/cli": patch
"@dyrected/docs": patch
---

- **Core Client/Server Clean Decoupling & Schema Serialization**:
  - Decoupled server-only AI services (`ai.service`, `ai-tools`, `rag.service`, `embedding.service`, `ai-rate-limit`, `observability`) strictly into `@dyrected/core/server`.
  - Cleaned the `@dyrected/core` root entry point to be 100% browser-safe, eliminating `pino` logger and Node.js built-ins (`os`, `fs`, `stream`) from client bundles and Next.js Turbopack applications.
  - Hardened `/api/schemas` serialization to forward `shared`, `siteId`, and collection-level `ai` configuration, plus field constraints (`unique`, `min`, `max`, `step`, `minLength`, `maxLength`, `pattern`, `allowedTypes`, `maxSize`, `virtual`, `promoted`, `ai`).
  - Added public AI readiness flags on the schema payload (`ai: { enabled: boolean, provider?: string, model?: string }`).

- **First-Class Typed SDK AI Module (`@dyrected/sdk`)**:
  - Implemented typed `client.ai` namespace on `DyrectedClient`:
    - `client.ai.createThread(input?)`: Create a persistent conversation thread.
    - `client.ai.listThreads()`: Retrieve all conversation threads.
    - `client.ai.getThread(id)`: Retrieve a single thread by ID.
    - `client.ai.deleteThread(id)`: Delete a thread and cascade its messages.
    - `client.ai.postMessage(threadId, input)`: Post a prompt and receive assistant response.
    - `client.ai.listMessages(threadId)`: Fetch full history for a thread.
    - `client.ai.getAction(actionId)`: Fetch details of a pending human-in-the-loop action proposal.
    - `client.ai.executeAction(actionId)`: Approve and execute a sensitive action proposal.
    - `client.ai.rejectAction(actionId, input?)`: Reject a pending action proposal with feedback.
    - `client.ai.searchRAG(input)`: Semantic vector search across indexed collections.
    - `client.ai.reindexRAG(input?)`: Trigger manual document vector indexing.
    - `client.ai.chat(messages, options?)`: Stream raw chat responses from `/api/ai/chat`.
  - Replaced ad-hoc `qs` stringification with pure JSON payload transmission for delete-many and folder actions.

- **Admin Sidebar Restructuring, Workspace Switcher & Dashboard AI (`@dyrected/admin`)**:
  - Moved the sidebar collapse toggle to the top-right of the logo row (`[Logo] Dyrected ... [collapse button]`).
  - Added a compact `WorkspaceSwitcher` (`h-8`, ~32px) directly underneath the logo row, with support for user-restricted site lists and dynamic switching.
  - Added `setSiteId` to `DyrectedContext` and `DyrectedProvider` with immediate TanStack Query cache invalidation and localStorage persistence.
  - Added an interactive **AI Assistant Spotlight Card** and **Ask AI Assistant** quick action button on the Dashboard.
  - Added an **AI Assistant** navigation item (`Sparkles` icon with `⌘J` shortcut badge) in the sidebar.
  - Positioned **Setup** on the bottom-left and the **ThemeSelector** on the bottom-right of the sidebar footer.

- **CLI Recursive Layout Flattening (`@dyrected/cli`)**:
  - Updated `packages/cli/src/utils/type-generator.ts` to recursively flatten `row` layout containers into generated TypeScript interfaces so child fields are never omitted.

- **Documentation Updates (`apps/docs`)**:
  - Documented OpenRouter and custom OpenAI-compatible provider configuration in `ai.mdx`.
  - Added multi-tenant architecture docs: overview, header-scoped tenanting, row-level tenanting, and dynamic schemas.
  - Added AI privacy and field-level PII scrubber documentation in `ai-privacy.mdx`.
