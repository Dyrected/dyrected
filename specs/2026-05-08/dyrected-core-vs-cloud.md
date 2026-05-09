# Dyrected: Core vs. Cloud

This document clarifies the distinction between the **Dyrected Core** (the open-source, self-hosted engine) and **Dyrected Cloud** (the managed, multi-tenant platform).

---

## High-Level Comparison

| Feature | Core (Self-Hosted) | Cloud (Managed) |
|---|---|---|
| **Tenancy** | Single-tenant (one project per deploy) | Multi-tenant (managed workspaces) |
| **Sites** | Single Site (singleton) | Multiple Sites per Workspace |
| **Schema Source** | `dyrected.config.ts` (Code) | `dyrected.config.ts` (Code) |
| **Database** | Any supported (Postgres, SQLite, etc.) | Optimized PostgreSQL |
| **Redis** | Optional (Local caching/preview) | Required (Rate limiting/Session sync) |
| **Background Jobs** | Synchronous / Native hooks | BullMQ (Async webhooks/Image processing) |
| **Management API** | Not exposed | Workspace & Site management routes enabled |
| **Billing/Usage** | None | Integrated billing & usage tracking |

---

## 1. Dyrected Core (The Engine)

The Core is the heart of Dyrected. It is designed for developers who want a headless CMS embedded directly into their own infrastructure.

### Key Characteristics:
- **Code-First Schema**: You define your collections, fields, and globals in a `dyrected.config.ts` file. This allows your CMS schema to be version-controlled alongside your application code.
- **Embedded Lifecycle**: The CMS boots when your Next.js/Nuxt app boots. It shares the same process and memory.
- **Local Autonomy**: You have full control over your data, storage adapters, and deployment environment.
- **Implicit Context**: Since there is only one site and one workspace, the backend doesn't need an `x-api-key` header to know what content to serve—it is hardcoded to your config.

---

## 2. Dyrected Cloud (The Platform)

Dyrected Cloud is activated by providing a `DYRECTED_LICENSE_KEY`. It transforms the engine into a scalable, SaaS-ready platform.

### Key Characteristics:
- **Multi-Site Management**: A single workspace can host multiple sites (e.g., `staging`, `production`, `mobile-app`).
- **Identity & Access**: Includes a robust invitation system for teams and workspace-level permissions.
- **Performance & Scaling**:
    - **Redis Required**: Used for global rate limiting and ensuring preview tokens work across multiple server instances.
    - **Queueing**: Uses BullMQ to handle heavy tasks like webhook delivery and large-scale asset optimization in the background.
- **Site Resolution**: Requires the `x-api-key` header on every request to dynamically route traffic to the correct site/workspace context.

---

## Feature Roadmap

| Feature | Core | Cloud |
|---|---|---|
| Rich Text Editor (Tiptap) | ✅ | ✅ |
| Role-Based Access Control | ✅ | ✅ |
| Custom Storage Adapters | ✅ | ✅ |
| Localized Content | ✅ | ✅ |
| **API Webhook Queues** | ❌ | ✅ |
| **Usage Analytics** | ❌ | ✅ |
| **White-labeling** | ❌ | ✅ |

---

## Technical Guardrail: The License Key

The presence of the `DYRECTED_LICENSE_KEY` environment variable acts as a "gate" that unlocks the Cloud-only route handlers (Workspaces/Sites management). 

- **Validation**: On startup, `apps/cloud` validates the key against the Dyrected License Server (`license.dyrected.com`). 
- **Production Gate**: In `production`, a valid, active key is required to boot.
- **Enterprise Self-Hosting**: Enterprise customers hosting their own private Cloud instance can point to their own License Server using the `LICENSE_SERVER_URL` environment variable.
