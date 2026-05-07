---
title: Authentication Collections
description: How to add built-in authentication to any collection, and how the auth endpoints work.
---

Setting `auth: true` on a collection turns it into an **auth collection** — Dyrected adds hashed password storage, login/logout endpoints, JWT issuance, and a `/me` endpoint automatically.

---

## Enabling Auth

```ts
export default defineConfig({
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'role', type: 'select', options: ['admin', 'editor', 'viewer'], defaultValue: 'viewer' },
        { name: 'avatar', type: 'relationship', collection: 'media' },
      ],
    },
  ],
})
```

When `auth: true`, Dyrected automatically adds:
- `email` — unique, required, indexed
- `password` — hashed with bcrypt before storage, never returned in API responses

You do not need to declare `email` or `password` in your `fields` array.

---

## Auth Endpoints

All auth endpoints are prefixed with `/api/collections/{slug}`.

### `POST /api/collections/users/login`

Authenticate with email and password. Returns a JWT and the user document.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "my-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "editor"
  }
}
```

The JWT has a default TTL of **2 hours**. You can configure this with `auth.tokenExpiration` (see below).

---

### `POST /api/collections/users/logout`

Invalidates the current session. Requires `Authorization: Bearer <token>` header.

**Response:** `200 OK` with no body.

---

### `GET /api/collections/users/me`

Returns the currently authenticated user's document.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "abc123",
  "email": "user@example.com",
  "name": "Jane Doe",
  "role": "editor"
}
```

`password` is always stripped from this response regardless of field-level access config.

---

### `POST /api/collections/users/refresh-token`

Exchange a valid (non-expired) JWT for a fresh one with a new expiry.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

---

### `POST /api/collections/users/forgot-password`

Sends a password-reset email to the provided address (requires `email` config).

**Request:**
```json
{ "email": "user@example.com" }
```

---

### `POST /api/collections/users/reset-password`

Resets the user's password using the token from the reset email.

**Request:**
```json
{
  "token": "<reset-token>",
  "password": "new-password"
}
```

---

## Auth Config Options

You can pass an object instead of `true` to `auth` to customise behaviour:

```ts
{
  slug: 'users',
  auth: {
    tokenExpiration: 7200,          // JWT TTL in seconds (default: 7200 = 2h)
    maxLoginAttempts: 5,            // Lock account after N failed logins (default: 5)
    lockTime: 600,                  // Lock duration in seconds (default: 600 = 10m)
    useAPIKey: false,               // Allow API key auth for this collection (default: false)
    depth: 1,                       // Depth for populating relationships in /me response
    cookies: {
      secure: true,                 // Set Secure flag on session cookies
      sameSite: 'Lax',
      domain: '.mysite.com',        // Share cookies across subdomains
    },
  },
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `tokenExpiration` | `number` | `7200` | JWT lifetime in seconds |
| `maxLoginAttempts` | `number` | `5` | Failed login attempts before account lock |
| `lockTime` | `number` | `600` | Account lock duration in seconds |
| `depth` | `number` | `0` | Population depth for the `/me` endpoint |
| `cookies.secure` | `boolean` | `true` in production | Whether to set the `Secure` cookie flag |
| `cookies.sameSite` | `string` | `'Lax'` | Cookie `SameSite` policy |

---

## Using the Authenticated User in Access Functions

When a request includes a valid JWT, Dyrected decodes it and passes the user to every access function and hook:

```ts
access: {
  read:   ({ user }) => !!user,
  update: ({ user, doc }) => user?.role === 'admin' || user?.id === doc.authorId,
}
```

The `user` object is the raw document from your auth collection (without `password`), populated to the depth configured in `auth.depth`.

---

## Multiple Auth Collections

You can have more than one auth collection — for example, separate `users` and `admins` collections with different fields and access rules:

```ts
collections: [
  { slug: 'users',  auth: true, fields: [...] },
  { slug: 'admins', auth: true, fields: [...] },
]
```

Each collection gets its own independent set of login/logout/me endpoints.

---

## Admin UI Auth Flow

When the Admin UI loads:
1. It checks for a stored JWT in `localStorage`.
2. It calls `/api/collections/{authSlug}/me` to validate the token.
3. If valid, it stores the user in context and renders the dashboard.
4. On 401, it clears the token and redirects to the login screen.

The Admin UI automatically discovers which collection has `auth: true` from the `/api/schemas` response and uses the first one found as the login collection.
