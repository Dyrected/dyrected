---
title: Adding Authentication
description: Add a users collection with login, JWT auth, and protected routes.
---

This guide adds user authentication to a Dyrected app: a `users` collection with login/logout, JWT-protected API access, and route guards in Next.js.

---

## 1. Add an auth collection

Set `auth: true` on the collection. Dyrected adds `email`, `password`, and token endpoints automatically.

```ts
// dyrected.config.ts
export default defineConfig({
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [
        { name: 'name', type: 'text' },
      ],
    },
  ],
})
```

---

## 2. Set the JWT secret

```bash
# .env.local
DYRECTED_JWT_SECRET=a-long-random-secret-at-least-32-chars
```

The same secret must be set in every environment. Rotating it invalidates all existing sessions.

---

## 3. Log in with the SDK

```ts
import { createClient } from '@dyrected/sdk'

const client = createClient({ baseUrl: '/api/dyrected' })

// Log in — stores JWT in the client instance
const { token, user } = await client.collection('users').login('jane@example.com', 'hunter2')

// Subsequent requests are automatically authenticated
const { docs } = await client.collection('posts').find()
```

---

## 4. Log in with the Nuxt composable

```vue
<script setup lang="ts">
const { login, user, logout } = useDyrectedAuth('users')

async function submit(e: Event) {
  const form = e.target as HTMLFormElement
  await login(form.email.value, form.password.value)
}
</script>

<template>
  <div v-if="user">Hello, {{ user.name }} — <button @click="logout">Log out</button></div>
  <form v-else @submit.prevent="submit">
    <input name="email" type="email" />
    <input name="password" type="password" />
    <button type="submit">Log in</button>
  </form>
</template>
```

See [Nuxt Integration](/integrations/nuxt) for full composable reference.

---

## 5. Protect API routes

Use `requireAuth()` middleware on any Hono route, or add an `access` function to a collection:

```ts
// dyrected.config.ts
{
  slug: 'orders',
  access: {
    read:   ({ user }) => !!user,        // logged-in users only
    create: ({ user }) => !!user,
    update: ({ user, doc }) => user?.id === doc.userId,
    delete: ({ user }) => user?.role === 'admin',
  },
}
```

---

## 6. Protect Next.js pages with middleware

```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const token = req.cookies.get('dyrected-token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/account/:path*'],
}
```

---

## 7. Read the current user in a Server Component

```ts
import { cookies } from 'next/headers'

async function getUser() {
  const token = cookies().get('dyrected-token')?.value
  if (!token) return null

  const res = await fetch(`${process.env.NEXT_PUBLIC_DYRECTED_URL}/collections/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}
```

---

## Next steps

- [Invite-only registration](/guides/invite-only-registration) — restrict sign-up to invited users
- [Access Control](/core/access-control) — full reference for `access` functions
- [Auth Endpoints](/core/auth) — REST API for login, logout, forgot-password, etc.
