# Dyrected AI — Day 2 Specification

This document details the complete Day 2 implementation specification for **Project Inspection & Developer-Extensible Tools** in Dyrected AI.

---

## 1. Day 2 Goal & Core Architecture

The goal of Day 2 is to transform Dyrected AI from a pure text completion model into an **active reasoning agent** capable of inspecting schema metadata, querying actual database documents, and allowing third-party developers to register their own custom AI tools.

| Area | Day 2 Specification | Details |
| :--- | :--- | :--- |
| **Tool Execution Engine** | **Vercel AI SDK `tool()`** | Native tool definitions leveraging `zod` schema parameter validation, typed returns, and automatic execution loop in `streamText()`. |
| **Built-in CMS Tools** | **6 Core Inspection Tools** | `listCollections`, `getCollectionSchema`, `listGlobals`, `getGlobalSchema`, `queryCollection`, `getDocument`. |
| **Developer Extensibility** | **`ai.tools` in Config** | Developers can define custom domain tools directly in `dyrected.config.ts` with typed inputs, descriptions, and execute handlers. |
| **Security & Scoping** | **Project & Access Scoped** | All tool queries automatically enforce `projectId`, user role permissions, and access policies. |
| **Observability** | **Structured Logging** | Every tool invocation, parameters, execution duration, and results are logged via Pino and attached to message metadata. |
| **UI Integration** | **Tool Execution Cards** | The frontend assistant renders sleek tool-call indicators and collapsible result drawers using `ai-elements`. |

---

## 2. Tool Architecture & Execution Loop

```text
┌──────────────────────────────────────────────────────────────────┐
│                           User Prompt                            │
│  "How many published articles do we have under the 'News' slug?" │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Dyrected AI Tool Registry                      │
│                                                                  │
│  [ Built-in Tools ]               [ Developer Custom Tools ]     │
│  • listCollections                • syncAlgoliaIndex             │
│  • getCollectionSchema            • fetchStripeCustomer          │
│  • listGlobals                    • sendSlackAlert               │
│  • getGlobalSchema                                               │
│  • queryCollection                                               │
│  • getDocument                                                   │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Gemini 2.5 Flash Tool Loop                     │
│  1. Model emits tool call: `queryCollection({ ... })`            │
│  2. Core validates arguments against Zod schema                  │
│  3. Core executes tool against DatabaseAdapter                   │
│  4. Tool result injected into model context                      │
│  5. Model streams final natural language response                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Built-In Inspection Tools Contract

All tools utilize existing `DatabaseAdapter` methods and config definitions rather than inventing a secondary data-access mechanism.

### 3.1 `listCollections`

Discovers all available collection slugs, labels, and descriptions in the active project.

* **Parameters:** *(None)*
* **Returns:**

  ```json
  [
    {
      "slug": "articles",
      "label": "Articles",
      "auth": false,
      "timestamps": true
    },
    {
      "slug": "authors",
      "label": "Authors",
      "auth": false,
      "timestamps": true
    }
  ]
  ```

### 3.2 `getCollectionSchema`

Retrieves detailed field definitions, validation rules, relationships, and block structures for a specified collection.

* **Parameters:**

  ```json
  {
    "collection": "articles"
  }
  ```

* **Returns:**

  ```json
  {
    "slug": "articles",
    "label": "Articles",
    "fields": [
      { "name": "title", "type": "text", "required": true },
      { "name": "slug", "type": "text", "required": true },
      { "name": "content", "type": "richText", "required": false },
      { "name": "author", "type": "relationship", "relationTo": "authors" },
      { "name": "status", "type": "select", "options": ["draft", "published"] }
    ]
  }
  ```

### 3.3 `listGlobals`

Lists all singleton global configurations (e.g. site settings, navigation menus, footer).

* **Parameters:** *(None)*
* **Returns:**

  ```json
  [
    { "slug": "site-settings", "label": "Site Settings" },
    { "slug": "main-navigation", "label": "Main Navigation" }
  ]
  ```

### 3.4 `getGlobalSchema`

Fetches the field layout and current saved values for a singleton global.

* **Parameters:**

  ```json
  {
    "global": "site-settings"
  }
  ```

* **Returns:**

  ```json
  {
    "slug": "site-settings",
    "label": "Site Settings",
    "fields": [
      { "name": "siteTitle", "type": "text" },
      { "name": "supportEmail", "type": "email" }
    ],
    "data": {
      "siteTitle": "Future You Coaching",
      "supportEmail": "contact@futureyou.com"
    }
  }
  ```

### 3.5 `queryCollection`

Executes structured filtering, pagination, sorting, and field projection over any collection.

* **Parameters:**

  ```json
  {
    "collection": "articles",
    "where": {
      "status": "published",
      "category": "News"
    },
    "sort": "-createdAt",
    "limit": 10,
    "page": 1
  }
  ```

* **Returns:**

  ```json
  {
    "docs": [
      { "id": "art_1", "title": "Launch Day Announced", "status": "published" }
    ],
    "totalDocs": 1,
    "totalPages": 1,
    "page": 1,
    "limit": 10
  }
  ```

### 3.6 `getDocument`

Fetches a single full document by ID with resolved relationship data if requested.

* **Parameters:**

  ```json
  {
    "collection": "articles",
    "id": "art_1"
  }
  ```

* **Returns:**

  ```json
  {
    "id": "art_1",
    "title": "Launch Day Announced",
    "slug": "launch-day-announced",
    "status": "published",
    "createdAt": "2026-08-20T10:00:00.000Z"
  }
  ```

---

## 4. Developer Extensibility: Custom Tool Registration

Third-party developers building on Dyrected can expose custom tools directly in `dyrected.config.ts`.

### 4.1 Configuration Signature

```ts
// dyrected.config.ts
import { defineConfig } from '@dyrected/core';
import { z } from 'zod';

export default defineConfig({
  // ... collections, db, etc.
  ai: {
    model: 'gemini-2.5-flash',
    maxSteps: 5, // Maximum tool call chaining steps (default: 5, configurable)
    tools: {
      checkInventory: {
        description: 'Check real-time stock levels for a product SKU in the external warehouse',
        parameters: z.object({
          sku: z.string().describe('Product SKU identifier'),
        }),
        execute: async ({ sku }, { db, user, projectId }) => {
          const res = await fetch(`https://api.warehouse.internal/stock/${sku}`);
          return res.json();
        },
      },
      searchDocs: {
        description: 'Search external company knowledge base for policy documentation',
        parameters: z.object({
          query: z.string().describe('Search terms'),
        }),
        execute: async ({ query }) => {
          return { query, matches: ['https://docs.company.com/article-1'] };
        },
      },
    },
  },
});
```

### 4.2 Tool Context Injection

Every custom tool receives a contextual object containing:

* `db`: The active `DatabaseAdapter` instance.
* `user`: Authenticated user session (`id`, `name`, `roles`).
* `projectId`: Active site / project ID.
* `config`: The full resolved `DyrectedConfig`.

---

## 5. Security, Isolation & Safety Rules

1. **Access Control Enforcement**:
   * All queries executed via `queryCollection` and `getDocument` strictly verify the collection's `access.read` policy against the current user's roles and session, returning a permission denied error if unauthorized.
2. **Internal Collection Masking**:
   * Tools automatically exclude private system collections (`_dyrected_ai_threads`, `_dyrected_ai_messages`, password hashes, auth secrets) from list and query outputs unless explicitly authorized.
3. **Project Tenant Scoping**:
   * Every database query made by `queryCollection` or `getDocument` is automatically filtered by `projectId` matching the authenticated request header `x-site-id`.
4. **Execution Timeouts & Rate Limits**:
   * Tool calls enforce a default 10-second timeout per execution step to prevent runaway external fetches.
5. **Read-Only by Default on Day 2**:
   * Day 2 tools focus strictly on read, inspection, discovery, and query operations. Mutation operations (create/update/delete) are deferred to Day 3 with explicit human-in-the-loop verification.

---

## 6. Frontend Tool Execution Visualization (`ai-elements`)

Using `ai-elements`, the chat drawer renders tool execution states in real-time as Gemini calls them:

* **Running**: A subtle animated badge: `Calling tool listCollections()...`
* **Completed**: A collapsible card with the tool name, arguments, and duration.
* **Stream Response**: Smoothly transitions to the assistant's final conversational answer referencing the tool results.

---

## 7. Day 2 Implementation Checklist

* [x] **Core Tool Framework (`packages/core`):**
  * [x] Create `packages/core/src/services/ai-tools.ts` with Vercel AI SDK `tool()` bindings.
  * [x] Implement `listCollections` tool.
  * [x] Implement `getCollectionSchema` tool.
  * [x] Implement `listGlobals` tool.
  * [x] Implement `getGlobalSchema` tool.
  * [x] Implement `queryCollection` tool (with Zod validation, pagination, and sorting).
  * [x] Implement `getDocument` tool.
  * [x] Implement `aggregateCollection` tool (count, sum, avg, min, max, distinct, groupBy).
* [x] **Developer Custom Tool Interface:**
  * [x] Define `AIToolDefinition` type in `packages/core/src/types/ai.ts`.
  * [x] Update `DyrectedConfig` with `ai.tools` and `ai.maxSteps` schema.
  * [x] Wire custom tools into the `streamText({ tools: { ...builtInTools, ...customTools }, stopWhen: stepCountIs(maxSteps) })` execution pipeline.
* [x] **Security & Tenant Scoping:**
  * [x] Filter out `_dyrected_*` internal tables from collection list/schema tools.
  * [x] Ensure `queryCollection`, `getDocument`, and `aggregateCollection` enforce `access.read` security policies.
  * [x] Redact sensitive auth secrets (`password`, `salt`, `hash`, `resetPasswordToken`).
* [x] **Frontend Tool Displays (`packages/admin`):**
  * [x] Update message rendering in `DyrectedAILipTrigger.tsx` to display real-time tool invocation badges using `ai-elements`.

---

## 8. Acceptance Criteria

1. **Accurate Schema Introspection:** Asking about field types, collections, or globals triggers tool calling and reflects the actual live project definitions accurately.
2. **Actual Document Querying:** Asking questions requiring database data (e.g. *"What is the title of the newest article?"*) invokes `queryCollection`, parses the returned records, and presents an answer citing the real database items.
3. **Third-Party Developer Tooling:** A custom tool defined in `dyrected.config.ts` is recognized by Gemini and executed with typed parameters.
