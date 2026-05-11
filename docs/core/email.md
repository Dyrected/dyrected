---
title: Email
description: Configuring transactional email, built-in templates, and dev-mode interception.
---

Dyrected sends transactional emails for auth collection events — welcome, invite, password reset, and password changed. You wire in your own email library via a `send` callback; Dyrected never cares which provider you use.

---

## Config shape

```ts
// dyrected.config.ts
export default defineConfig({
  email: {
    from: 'noreply@mysite.com',
    send: async ({ to, subject, html }) => {
      // call your email library here
    },
    templates: { /* optional overrides — see below */ },
  },
})
```

| Property | Type | Required | Description |
|---|---|---|---|
| `from` | `string` | ✅ | The sender address used in all outgoing emails. |
| `send` | `(args: { to, subject, html }) => Promise<void>` | ✅ | Called by Dyrected for every outgoing email. |
| `templates` | `object` | | Optional per-event HTML overrides. See [Custom templates](#custom-templates). |

---

## Built-in email events

Four events trigger automatic emails. All are best-effort — a failed send is logged but never blocks the API response.

| Event | Trigger | Template key |
|---|---|---|
| Account created | `POST /{slug}/first-user` or `POST /{slug}/accept-invite` | `welcome` |
| Invitation sent | `POST /{slug}/invite` | `invite` |
| Password reset requested | `POST /{slug}/forgot-password` | `resetPassword` |
| Password successfully changed | `POST /{slug}/reset-password` | `passwordChanged` |

---

## Development — Ethereal fallback

If `email` is not set in your config **and** `NODE_ENV` is not `production`, Dyrected automatically routes all emails through [Ethereal](https://ethereal.email/) — a free fake SMTP service that captures outgoing emails without delivering them. No account or setup required.

On first send, credentials and a preview URL are printed to the console:

```
[dyrected/core] No email config — using Ethereal for dev email preview.
[dyrected/core] Ethereal login: https://ethereal.email  user: xxx@ethereal.email  pass: xxx
[dyrected/core] Email preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
```

Click the preview URL to see the email exactly as it would render. The Ethereal transport is created once and reused for all subsequent emails in the same process.

---

## Production setup

### Resend

```ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default defineConfig({
  email: {
    from: 'noreply@mysite.com',
    send: async ({ to, subject, html }) => {
      await resend.emails.send({ from: 'noreply@mysite.com', to, subject, html })
    },
  },
})
```

### Nodemailer (SMTP)

```ts
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export default defineConfig({
  email: {
    from: 'noreply@mysite.com',
    send: async ({ to, subject, html }) => {
      await transporter.sendMail({ from: 'noreply@mysite.com', to, subject, html })
    },
  },
})
```

Any library that sends email works — Postmark, SendGrid, AWS SES, etc. The `send` function is the only integration point.

---

## Custom templates

Override the HTML (and optionally the subject) for any built-in email by adding a `templates` object. Each key is a function that receives the relevant data and returns `{ html, subject? }`. Omitting `subject` keeps the default.

```ts
export default defineConfig({
  email: {
    from: 'noreply@mysite.com',
    send: async ({ to, subject, html }) => { /* ... */ },
    templates: {
      welcome: ({ email }) => ({
        subject: 'Welcome to Acme',
        html: `<h1>Welcome, ${email}!</h1><p>Your account is ready.</p>`,
      }),
      invite: ({ token, invitedByEmail }) => ({
        subject: "You've been invited to Acme",
        html: `
          <p>You were invited by <strong>${invitedByEmail}</strong>.</p>
          <p>Use this token to accept: <pre>${token}</pre></p>
        `,
      }),
      resetPassword: ({ token }) => ({
        subject: 'Reset your Acme password',
        html: `<p>Your reset token (expires in 1 hour):</p><pre>${token}</pre>`,
      }),
      passwordChanged: ({ email }) => ({
        subject: 'Your Acme password was changed',
        html: `<p>The password for <strong>${email}</strong> was just changed. If this wasn't you, contact support.</p>`,
      }),
    },
  },
})
```

### Template reference

#### `welcome`

Sent when a new account is created via `first-user` or `accept-invite`.

| Arg | Type | Description |
|---|---|---|
| `email` | `string` | The new account's email address |

#### `invite`

Sent when an authenticated user calls `POST /{slug}/invite`.

| Arg | Type | Description |
|---|---|---|
| `token` | `string` | The signed invite JWT. Include this in your accept-invite link or show it directly. |
| `invitedByEmail` | `string \| undefined` | The email of the user who sent the invite. |

#### `resetPassword`

Sent when a user calls `POST /{slug}/forgot-password`.

| Arg | Type | Description |
|---|---|---|
| `token` | `string` | The signed reset JWT (expires in 1 hour). |

#### `passwordChanged`

Sent after a successful `POST /{slug}/reset-password`.

| Arg | Type | Description |
|---|---|---|
| `email` | `string` | The email address of the account whose password was changed. |

---

## Sending custom emails with hooks

For emails beyond the four built-in events — order confirmations, comment notifications, etc. — use a collection `afterChange` hook with your email library directly:

```ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default defineConfig({
  collections: [
    {
      slug: 'orders',
      hooks: {
        afterChange: [
          async ({ doc, operation }) => {
            if (operation === 'create') {
              await resend.emails.send({
                from: 'orders@mysite.com',
                to: doc.customerEmail,
                subject: `Order #${doc.id} confirmed`,
                html: `<p>Thanks for your order!</p>`,
              })
            }
          },
        ],
      },
      fields: [
        { name: 'customerEmail', type: 'email', required: true },
      ],
    },
  ],
})
```
