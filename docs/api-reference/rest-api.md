---
title: REST API Reference
description: Complete reference for every Dyrected HTTP endpoint — collections, globals, auth, uploads, and schemas.
---

Dyrected exposes a RESTful JSON API for every collection and global defined in your config. All endpoints share a consistent structure and support a common set of query parameters.

---

## Base URL

All endpoints are relative to the base URL of your Dyrected instance:

```
https://your-site.com/api
```

In Cloud mode, this is your configured cloud backend URL. In self-hosted mode, it is wherever you mounted the Dyrected router.

---

## Authentication

Every request must include one of:

| Method | Header | When to use |
|---|---|---|
| Site API Key | `x-api-key: <key>` | Server-to-server, trusted backend code |
| JWT | `Authorization: Bearer <token>` | Logged-in users, Admin UI, client-side apps |
| Site ID | `x-site-id: <id>` | Cloud mode — must be sent alongside the API key |

Endpoints that have `access: () => true` (public read) do not require any auth header for GET requests.

---

## Common Query Parameters

All list endpoints (`GET /api/collections/:slug`) accept these parameters:

| Parameter | Type | Example | Description |
|---|---|---|---|
| `limit` | `number` | `?limit=20` | Max documents per page (default: 10, max: 100) |
| `page` | `number` | `?page=2` | Page number (1-indexed) |
| `sort` | `string` | `?sort=-createdAt` | Field to sort by. Prefix `-` for descending. |
| `depth` | `number` | `?depth=1` | How deeply to populate relationship fields (default: 0) |
| `where` | `object` | `?where[status][equals]=published` | Filter conditions (see [Filtering](#filtering)) |

### Standard List Response

```json
{
  "docs": [...],
  "total": 87,
  "limit": 10,
  "page": 1,
  "totalPages": 9,
  "hasNextPage": true,
  "hasPrevPage": false,
  "nextPage": 2,
  "prevPage": null
}
```

---

## Collection Endpoints

### List documents

```
GET /api/collections/:slug
```

Returns a paginated list of documents.

**Example:**
```bash
GET /api/collections/posts?limit=5&sort=-publishedAt&where[status][equals]=published&depth=1
```

---

### Get a single document

```
GET /api/collections/:slug/:id
```

Returns one document by its ID.

**Example:**
```bash
GET /api/collections/posts/abc123?depth=2
```

---

### Create a document

```
POST /api/collections/:slug
Content-Type: application/json
```

**Request body:** A JSON object containing the document fields.

```json
{
  "title": "My First Post",
  "status": "draft",
  "author": "user-id-here"
}
```

**Response:** The created document, including its auto-generated `id`, `createdAt`, and `updatedAt`.

---

### Update a document

```
PATCH /api/collections/:slug/:id
Content-Type: application/json
```

Partial update — only send the fields you want to change.

```json
{
  "status": "published",
  "publishedAt": "2024-06-01T10:00:00.000Z"
}
```

**Response:** The full updated document.

---

### Delete a document

```
DELETE /api/collections/:slug/:id
```

**Response:** `200 OK` with the deleted document.

---

## Upload Endpoints

Upload collections use `multipart/form-data` for file creation:

### Upload a file

```
POST /api/collections/:slug
Content-Type: multipart/form-data
```

**Form fields:**
- `file` — the binary file (required)
- Any additional fields from your schema (e.g., `alt`, `caption`)

**Example:**
```bash
curl -X POST https://mysite.com/api/collections/media \
  -H "x-api-key: sk_live_..." \
  -F "file=@photo.jpg" \
  -F "alt=Mountain landscape"
```

---

## Global Endpoints

### Get a global

```
GET /api/globals/:slug
```

Returns the current state of the global document.

---

### Update a global

```
PATCH /api/globals/:slug
Content-Type: application/json
```

```json
{
  "siteName": "My Awesome Site",
  "tagline": "Building the future"
}
```

---

## Auth Endpoints

For any collection with `auth: true`. Replace `:slug` with your auth collection slug (e.g., `users`).

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/collections/:slug/login` | Login with email + password |
| `POST` | `/api/collections/:slug/logout` | Logout (requires JWT) |
| `GET` | `/api/collections/:slug/me` | Get current user (requires JWT) |
| `POST` | `/api/collections/:slug/refresh-token` | Refresh JWT (requires JWT) |
| `POST` | `/api/collections/:slug/forgot-password` | Send reset email |
| `POST` | `/api/collections/:slug/reset-password` | Reset with token |

See [Authentication Collections](/docs/core/auth) for full details and request/response shapes.

---

## Schema Endpoint

### Get all schemas

```
GET /api/schemas
```

Returns the full schema definition for all collections and globals, derived from your `dyrected.config.ts`. When called with a valid JWT, the response also includes resolved `access` flags for the authenticated user.

Useful for:
- Building generic admin UIs
- Generating typed SDK clients
- Introspecting the config at runtime

---

## Preview Endpoints

### Generate Preview Token

```
POST /api/preview-token
Content-Type: application/json
```

Issues a short-lived, signed JWT for accessing draft content. Requires an authenticated user with `update` access to the requested document.

**Request body:**
```json
{
  "collection": "posts",
  "id": "abc-123",
  "data": { ... } // Draft data from the form
}
```

**Response:**
```json
{
  "token": "eyJhbG..."
}
```

---

### Get Preview Data

```
GET /api/preview-data?token=<jwt>
```

Retrieves draft data using a valid preview token. This endpoint is public (no `x-api-key` required) as it relies on the signed token for authorization.

**Response:**
```json
{
  "collection": "posts",
  "id": "abc-123",
  "data": { ... }
}
```

---

## Filtering

The `where` parameter supports nested operators:

```
?where[field][operator]=value
```

### Operators

| Operator | Example | Description |
|---|---|---|
| `equals` | `where[status][equals]=published` | Exact match |
| `not_equals` | `where[status][not_equals]=archived` | Not equal |
| `like` | `where[title][like]=typescript` | Case-insensitive contains |
| `contains` | `where[tags][contains]=react` | Array contains value |
| `in` | `where[status][in]=draft,published` | Value is in list |
| `not_in` | `where[role][not_in]=guest` | Value is not in list |
| `greater_than` | `where[price][greater_than]=100` | Numeric greater than |
| `less_than` | `where[price][less_than]=500` | Numeric less than |
| `greater_than_equal` | `where[age][greater_than_equal]=18` | Numeric ≥ |
| `less_than_equal` | `where[age][less_than_equal]=65` | Numeric ≤ |
| `exists` | `where[publishedAt][exists]=true` | Field is not null |

### AND / OR conditions

Multiple `where` conditions at the same level are combined with **AND**:

```
?where[status][equals]=published&where[featured][equals]=true
```

For **OR**, use the `or` operator:

```
?where[or][0][status][equals]=published&where[or][1][status][equals]=scheduled
```

---

## Error Responses

All errors follow a consistent shape:

```json
{
  "error": "Not Found",
  "message": "Document with ID 'abc123' not found in collection 'posts'.",
  "statusCode": 404
}
```

| Status | Meaning |
|---|---|
| `400` | Bad request — validation error or missing required field |
| `401` | Unauthorized — missing or invalid auth token/API key |
| `403` | Forbidden — access function returned `false` |
| `404` | Document or collection not found |
| `409` | Conflict — unique constraint violation |
| `413` | Payload too large — file exceeds `maxFileSize` |
| `500` | Internal server error |

Validation errors (400) include a detailed `errors` array:

```json
{
  "error": "Validation Error",
  "statusCode": 400,
  "errors": [
    { "field": "title", "message": "Title is required." },
    { "field": "email", "message": "Must be a valid email address." }
  ]
}
```
