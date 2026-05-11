---
title: Invite-Only Registration
description: Restrict sign-up so new users can only join via invitation.
---

By default, any visitor can register. This guide shows how to disable open registration and require that new users be invited by an existing admin.

---

## 1. Disable open registration

Remove or lock down the `create` access function on your auth collection so anonymous users cannot self-register:

```ts
// dyrected.config.ts
{
  slug: 'users',
  auth: true,
  access: {
    create: () => false,   // no self-registration
    read:   ({ user }) => !!user,
    update: ({ user, doc }) => user?.id === doc.id || user?.role === 'admin',
    delete: ({ user }) => user?.role === 'admin',
  },
  fields: [
    { name: 'name', type: 'text' },
    { name: 'role', type: 'select', options: ['member', 'admin'], defaultValue: 'member' },
  ],
}
```

With `create: () => false`, calling `POST /api/collections/users` without a valid invite token returns `403`.

---

## 2. Send an invitation

Inviting is a protected endpoint — the caller must be authenticated:

```ts
// Server-side (e.g. an admin action)
const res = await fetch('/api/dyrected/collections/users/invite', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  },
  body: JSON.stringify({ email: 'newuser@example.com' }),
})
// { success: true, message: 'Invitation sent to newuser@example.com' }
```

Dyrected signs a 7-day JWT with `purpose: 'invite'` and sends it to the email address. In development the invite link is logged to the console via Ethereal — no email config required.

### With the SDK

```ts
const client = createClient({ baseUrl: '/api/dyrected', token: adminToken })
await client.collection('users').invite('newuser@example.com')
```

---

## 3. Accept the invitation

The invited user calls `accept-invite` with their token and chosen password. No auth is required for this endpoint.

```ts
const res = await fetch('/api/dyrected/collections/users/accept-invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: tokenFromEmailLink,
    password: 'their-chosen-password',
    name: 'Jane Smith',   // any extra fields defined on the collection
  }),
})
const { token, user } = await res.json()
// token is a session JWT — store it to log the user in immediately
```

### With the SDK

```ts
const { token, user } = await client.collection('users').acceptInvite(
  tokenFromEmailLink,
  'their-chosen-password',
  { name: 'Jane Smith' }
)
```

---

## 4. Build the accept-invite page (Next.js)

```tsx
// app/accept-invite/page.tsx
'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@dyrected/sdk'

const client = createClient({ baseUrl: '/api/dyrected' })

export default function AcceptInvitePage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const name     = (form.elements.namedItem('name')     as HTMLInputElement).value

    const { token: sessionToken } = await client.collection('users').acceptInvite(token, password, { name })
    document.cookie = `dyrected-token=${sessionToken}; path=/`
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name"     type="text"     placeholder="Your name"     required />
      <input name="password" type="password" placeholder="Choose a password" required />
      <button type="submit">Join</button>
    </form>
  )
}
```

The email link should point to `/accept-invite?token=<token>`. The invite template in `core/email.md` outputs this link by default.

---

## 5. Customise the invite email

Override the default invite email template in your config:

```ts
// dyrected.config.ts
export default defineConfig({
  email: {
    from: 'no-reply@myapp.com',
    send: async ({ to, subject, html }) => { /* your provider */ },
    templates: {
      invite: ({ token, invitedByEmail }) => ({
        subject: `You've been invited to MyApp`,
        html: `
          <p>Hi there,</p>
          <p>${invitedByEmail ? `${invitedByEmail} has invited you` : 'You have been invited'} to join MyApp.</p>
          <p><a href="https://myapp.com/accept-invite?token=${token}">Accept your invitation</a></p>
          <p>This link expires in 7 days.</p>
        `,
      }),
    },
  },
})
```

See [Email](/core/email) for all template options and production provider examples.
