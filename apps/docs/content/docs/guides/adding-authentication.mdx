---
title: Adding Authentication
description: Add a users collection with login, JWT auth, and protected routes.
---

## 1. Add an auth collection

```ts
// dyrected.config.ts  (same for both frameworks)
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

## 3. Log in

<Tabs items={['Next.js', 'Nuxt', 'SDK (any)']}>
<Tab value="Next.js">
```ts
// app/login/actions.ts
'use server'
import { cookies } from 'next/headers'

export async function login(email: string, password: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_DYRECTED_URL}/collections/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const { token, user } = await res.json()
  cookies().set('dyrected-token', token, { httpOnly: true, path: '/' })
  return user
}
```
</Tab>
<Tab value="Nuxt">
```vue
<!-- components/LoginForm.vue -->
<script setup lang="ts">
const { login, user, logout } = useDyrectedAuth('users')

async function submit(e: Event) {
  const form = e.target as HTMLFormElement
  await login(form.email.value, form.password.value)
}
</script>

<template>
  <div v-if="user">
    Hello, {{ user.name }} — <button @click="logout">Log out</button>
  </div>
  <form v-else @submit.prevent="submit">
    <input name="email" type="email" placeholder="Email" />
    <input name="password" type="password" placeholder="Password" />
    <button type="submit">Log in</button>
  </form>
</template>
```
</Tab>
<Tab value="SDK (any)">
```ts
import { createClient } from '@dyrected/sdk'

const client = createClient({ baseUrl: '/api/dyrected' })

const { token, user } = await client.collection('users').login(
  'jane@example.com',
  'hunter2'
)
```
</Tab>
</Tabs>

---

## 4. Protect API routes

```ts
// dyrected.config.ts — access functions work the same in both frameworks
{
  slug: 'orders',
  access: {
    read:   ({ user }) => !!user,
    create: ({ user }) => !!user,
    update: ({ user, doc }) => user?.id === doc.userId,
    delete: ({ user }) => user?.role === 'admin',
  },
}
```

---

## 5. Protect frontend routes

<Tabs items={['Next.js', 'Nuxt']}>
<Tab value="Next.js">
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
</Tab>
<Tab value="Nuxt">
```ts
// middleware/auth.ts
export default defineNuxtRouteMiddleware(() => {
  const { user } = useDyrectedAuth('users')
  if (!user.value) return navigateTo('/login')
})
```

Apply it to a page:

```vue
<!-- pages/dashboard.vue -->
<script setup>
definePageMeta({ middleware: 'auth' })
</script>
```
</Tab>
</Tabs>

---

## 6. Get the current user

<Tabs items={['Next.js', 'Nuxt']}>
<Tab value="Next.js">
```ts
// In a Server Component
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
</Tab>
<Tab value="Nuxt">
```vue
<script setup lang="ts">
const { user } = useDyrectedAuth('users')
// reactive — updates automatically on login/logout
</script>

<template>
  <span v-if="user">{{ user.name }}</span>
</template>
```
</Tab>
</Tabs>

---

## Next steps

- [Invite-only registration](/docs/guides/invite-only-registration) — restrict sign-up to invited users
- [Role-based access control](/docs/guides/role-based-access-control) — admin / editor / viewer roles
- [Auth Endpoints](/docs/features/auth) — full REST API reference
