---
title: API Reference
description: Overview of the Dyrected REST API and SDK.
---

Dyrected exposes a RESTful JSON API for every collection and global defined in your config. There are two ways to consume it:

- **REST API** — standard HTTP endpoints, usable from any language or tool
- **SDK (`@dyrected/sdk`)** — a typed TypeScript client that wraps the REST API

---

## REST API

Endpoints follow a consistent structure based on your collection and global slugs:

| Resource | Endpoints |
|---|---|
| Collections | `GET /api/collections/:slug` · `POST` · `GET /:id` · `PATCH /:id` · `DELETE /:id` |
| Globals | `GET /api/globals/:slug` · `PATCH /api/globals/:slug` |
| Auth | `POST /api/collections/:slug/login` · `/logout` · `/me` · `/invite` · `/accept-invite` · `/forgot-password` · `/reset-password` |
| Uploads | `POST /api/collections/:slug` (multipart) |
| Schema | `GET /api/schemas` |
| Preview | `POST /api/preview-token` · `GET /api/preview-data` |

See [REST API Reference](/docs/api-reference/rest-api) for the full endpoint documentation, query parameters (`where`, `sort`, `limit`, `depth`), and error codes.

---

## SDK

`@dyrected/sdk` is a framework-agnostic TypeScript client:

```ts
import { createClient } from '@dyrected/sdk'

const client = createClient({
  baseUrl: 'https://your-site.com/api/dyrected',
  apiKey: process.env.DYRECTED_API_KEY,
})

const { docs } = await client.collection('posts').find({
  where: { status: { equals: 'published' } },
  sort: '-createdAt',
  depth: 1,
})
```

See [SDK Reference](/docs/api-reference/sdk) for all methods, and [SDK Integration Guide](/docs/integrations/sdk) for framework-specific setup (SvelteKit, Astro, vanilla JS, etc.).

---

## Authentication

Every request is authenticated with one of:

| Method | Header | When to use |
|---|---|---|
| Site API Key | `x-api-key: <key>` | Server-to-server, trusted backend code |
| JWT | `Authorization: Bearer <token>` | Logged-in users, Admin UI, client-side apps |
| Site ID | `x-site-id: <id>` | Cloud mode — send alongside the API key |

Endpoints with `access: () => true` on the collection do not require any auth header for `GET` requests.

---

## OpenAPI

Dyrected generates an OpenAPI 3.0 spec from your config at runtime:

```
GET /api/openapi.json
```

Use this to generate typed clients, test with Postman or Insomnia, or point an AI agent at your API for instant integration.
