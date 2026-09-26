# Auth Email Customization, External Provider Templates & Token Lifecycle Specification

**Status:** Draft / Proposed  
**Owner:** Core & Admin Teams  
**Scope:** `@dyrected/core`, `@dyrected/sdk`, `@dyrected/admin`

---

## 1. Executive Summary

Dyrected supports multiple auth collections within a single deployment (e.g. `__admins` for backoffice staff, alongside customer/member collections such as `investors`, `students`, or `clients`). However, Dyrected currently provides only a single global email template configuration with hardcoded HTML layouts and rigid token lifecycles.

This specification redesigns the email and auth token architecture across Dyrected to:

1. **Support collection-scoped email templates and action URLs**, eliminating cross-audience email clashing.
2. **First-class external email provider templates** (Seamailer, Postmark, SendGrid, Mailgun, AWS SES), removing the need for serializing JSON metadata into HTML strings.
3. **Headless & decoupled token generation** (`createInviteToken`, `createPasswordResetToken`, `createSetPasswordToken`) with `sendEmail: false` for custom transactional pipelines, SMS, or onboarding webhooks.
4. **Token verification endpoints** so client frontends can validate an invite or reset token on page mount before asking the user to submit credentials.
5. **In-Admin email template editing & live preview** (optional database-backed override with variable chips and test sender).
6. **Graceful passwordless / pending user handling**, preventing 500 runtime crashes when users with uninitialized passwords attempt to log in.

---

## 2. Motivation & Real-World Case Study (`apps/invest`)

In real-world multi-auth applications (such as `alajo-web-apps/apps/invest`), developers run an internal `__admins` collection alongside an end-user `investors` collection, using **Seamailer** as an external transactional mail provider with numeric template IDs.

Under the current architecture, four brittle workarounds were necessary:

1. **The JSON-in-HTML Envelope Hack:**
   Because Dyrected only accepted `{ to, subject, html }`, the developer had to JSON-encode `{ marker: '__seamailer_envelope__', templateId, variables }` into the `html` string parameter in `dyrected.config.ts`, and then decode this JSON inside their custom `email.send` function. Plain HTML emails were dropped.
2. **Audience Cross-Pollination:**
   Because `dyrected.config.ts` has only one global `templates.resetPassword` function, the reset link was hardcoded to the investor portal (`${APP_URL}/portal/set-password?t=${token}`). When an administrator requested a password reset, they received an email styled for investors pointing to the investor app instead of the admin dashboard.
3. **Faking Invites via Reset Links:**
   Because Dyrected's invite flow forces users into `status: 'pending'` and requires Dyrected's specific accept-invite endpoint, onboarding a pre-registered active investor required calling `sendResetLink(email)` to simulate an onboarding invite.
4. **Fake Salt:Hash Password Seeding:**
   `@dyrected/core`'s password verification did `stored.split(':')` with no null check. A login attempt against an invited or passwordless user crashed with an unhandled 500 error instead of a clean 401.

---

## 3. Core Architecture

### 3.1. Polymorphic Email Payload Contract

Dyrected separates raw HTML emails from provider-managed external templates.

```ts
// packages/core/src/types/email.ts

export type EmailTemplateResult =
  | {
      subject?: string;
      html: string;
      text?: string;
    }
  | {
      /**
       * External provider template identifier:
       * - Seamailer: 821354
       * - Postmark: 'welcome-investor' or 12345
       * - SendGrid: 'd-1234567890abcdef'
       */
      template: string | number;
      variables: Record<string, unknown>;
      subject?: string;
    };

export type OutboundEmail = {
  to: string;
  from?: string;
  collection: string;
  purpose: 'invite' | 'resetPassword' | 'welcome' | 'passwordChanged' | string;
  user?: Record<string, unknown>;
} & (
  | {
      type: 'html';
      subject: string;
      html: string;
      text?: string;
    }
  | {
      type: 'template';
      template: string | number;
      variables: Record<string, unknown>;
      subject?: string;
    }
);
```

### 3.2. Collection-Scoped Auth Configuration

`AuthConfig` on `CollectionConfig` is extended to support dedicated URLs, token lifecycles, and email templates:

```ts
// packages/core/src/types/schema-config.ts

export interface AuthConfig {
  maxLoginAttempts?: number;
  lockTime?: number;
  tokenExpiration?: string; // Session JWT lifetime (default '7d')

  /** Token expiration for invitations (default '7d'). e.g. '24h', '3d', '14d' */
  inviteExpiration?: string;

  /** Token expiration for password resets (default '1h'). e.g. '30m', '2h' */
  resetPasswordExpiration?: string;

  /**
   * Dedicated action URLs for this auth collection.
   * If not defined, falls back to config.admin.adminUrl or '/admin'.
   */
  urls?: {
    invite?: string;        // e.g. 'https://myportal.com/join'
    resetPassword?: string; // e.g. 'https://myportal.com/reset-password'
    login?: string;         // e.g. 'https://myportal.com/login'
  };

  /** Collection-specific email templates and sender overrides */
  email?: {
    from?: string;
    templates?: {
      invite?: (args: EmailTemplateArgs<{ token: string; url: string; invitedByEmail?: string; data?: Record<string, unknown> }>) => EmailTemplateResult;
      resetPassword?: (args: EmailTemplateArgs<{ token: string; url: string }>) => EmailTemplateResult;
      welcome?: (args: EmailTemplateArgs<{ email: string }>) => EmailTemplateResult;
      passwordChanged?: (args: EmailTemplateArgs<{ email: string }>) => EmailTemplateResult;
    };
  };
}

export type EmailTemplateArgs<T> = T & {
  collection: string;
  collectionLabel: { singular: string; plural: string };
  siteName?: string;
  user?: Record<string, unknown>;
};
```

### 3.3. Template Resolution Hierarchy

When an email must be built for collection `C` and purpose `P`:

```
┌────────────────────────────────────────────────────────┐
│ Level 1: Database Override in Admin UI (__email_templates)│
│ (if configured and customized for collection C or *)   │
└───────────────────────────┬────────────────────────────┘
                            │ (fallback if missing)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Level 2: Collection Code Config (collection.auth.email)│
└───────────────────────────┬────────────────────────────┘
                            │ (fallback if missing)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Level 3: Global Code Config (config.email.templates)   │
└───────────────────────────┬────────────────────────────┘
                            │ (fallback if missing)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Level 4: Core Default HTML Template                    │
│ (Styled Dyrected default with sensible layout)         │
└────────────────────────────────────────────────────────┘
```

---

## 4. Token & Action Lifecycle

### 4.1. Signing, Multi-Tenancy & Expiration

* `signCollectionToken` accepts an explicit `expiresIn` resolved from:
  1. Request override (if caller has elevated admin or API key permissions)
  2. `collection.auth.inviteExpiration` or `collection.auth.resetPasswordExpiration`
  3. Built-in defaults: `'7d'` for invites, `'1h'` for password resets.
* **Multi-Tenant Scoping (`siteId`):**
  When multi-tenancy is active, `siteId` is embedded directly into the signed token payload:

  ```ts
  export interface CollectionTokenPayload {
    sub: string;        // user doc id or email
    email: string;
    collection: string; // collection slug
    siteId?: string;    // tenant partition id
    purpose: 'invite' | 'reset';
    iat: number;
    exp: number;
  }
  ```

  On token verification, acceptance, or password reset, if `payload.siteId` is present, it must strictly match the current request tenant context (`X-Site-Id`), preventing cross-tenant token replay attacks.

### 4.2. Database-Backed Verification Endpoint

Before prompting an invited or reset user to enter a new password, the client frontend calls `/tokens/verify` on mount:

* **Endpoint:** `GET /api/collections/:slug/tokens/verify?token=...&purpose=invite|reset`
* **Validation Logic (Cryptographic + Database):**
  1. Verifies JWT signature and expiry.
  2. Asserts `payload.collection === slug` and `payload.purpose === expectedPurpose`.
  3. Asserts tenant match if `siteId` is present.
  4. Queries the database for the target user record:
     * If user does not exist $\rightarrow$ returns `{ valid: false, code: 'USER_NOT_FOUND', message: 'The account for this link no longer exists.' }`.
     * If user is in `__trash` $\rightarrow$ returns `{ valid: false, code: 'USER_DELETED', message: 'This account has been deleted.' }`.
     * If purpose is `'invite'` and the user already has a valid password hash $\rightarrow$ returns `{ valid: false, code: 'INVITE_ALREADY_ACCEPTED', message: 'This invitation has already been accepted.' }`.
     * If `user.invitedAt` is newer than `payload.iat` $\rightarrow$ returns `{ valid: false, code: 'TOKEN_SUPERSEDED', message: 'A newer invitation was sent. Please use the latest link.' }`.

* **Response (Valid):**

  ```json
  {
    "valid": true,
    "email": "alice@acme.com",
    "purpose": "invite",
    "expiresAt": 1727438400000,
    "user": {
      "id": "usr_123",
      "email": "alice@acme.com",
      "first_name": "Alice"
    }
  }
  ```

### 4.3. Delivery Transparency & Headless Tokens

Dyrected eliminates silent email delivery failures by explicitly reporting delivery status in the API response:

* **Endpoint:** `POST /api/collections/:slug/invite`

  ```json
  {
    "email": "alice@acme.com",
    "sendEmail": true,
    "data": { "first_name": "Alice" }
  }
  ```

* **Response (Delivery Success):**

  ```json
  {
    "success": true,
    "user": { "id": "usr_123", "email": "alice@acme.com", "first_name": "Alice" },
    "token": "ey...",
    "inviteUrl": "https://myportal.com/join?inviteToken=ey...",
    "emailSent": true
  }
  ```

* **Response (Delivery Failure / Provider Outage):**
  If `config.email.send` throws an error, the user record is still created, but Dyrected captures the error and returns:

  ```json
  {
    "success": true,
    "user": { "id": "usr_123", "email": "alice@acme.com" },
    "token": "ey...",
    "inviteUrl": "https://myportal.com/join?inviteToken=ey...",
    "emailSent": false,
    "emailError": "Failed to deliver email: Seamailer quota exceeded"
  }
  ```

  In the Admin UI, if `emailSent === false`, the dialog displays an amber alert:
  > *"User record created, but email delivery failed: [Error details]. You can copy the invite link below and share it manually."*

* **Headless Token Generation (`sendEmail: false`):**
  Setting `sendEmail: false` returns `{ token, inviteUrl, emailSent: false }` immediately without calling `config.email.send`.

### 4.4. Double-Acceptance Prevention via Password Check

Previously, `acceptInvite` required `user.status === 'pending'`. This broke applications like Alajo where users were pre-created as `status: 'active'`.

* **New Rule:** `acceptInvite` verifies whether the account already possesses a usable password hash:

  ```ts
  const hasUsablePassword = Boolean(
    existingUser?.password &&
    typeof existingUser.password === 'string' &&
    existingUser.password.includes(':')
  );
  if (hasUsablePassword) {
    return c.json({
      error: true,
      code: "INVITE_ALREADY_ACCEPTED",
      message: "This invitation has already been accepted. Please log in.",
    }, 409);
  }
  ```

* When `acceptInvite` succeeds, the new password hash is stored, automatically disallowing any replay of that invite token.

### 4.5. Re-Invite Token Superseding

When an admin resends an invitation (e.g. updating roles or fixing details), older tokens should not remain usable:

* When an invite is issued, Dyrected sets `user.invitedAt = Date.now()`.
* On `/accept-invite`, if `payload.iat < user.invitedAt - 1000` (allowing 1s clock skew), Dyrected rejects the older token with:
  `{ "error": true, "code": "TOKEN_SUPERSEDED", "message": "A newer invitation link was sent. Please use the most recent email." }`.

### 4.6. Field-Level Privilege Escalation Protection

When callers pass custom fields into `invite({ email, ...data })`:

* Dyrected runs `data` through standard collection field access rules (`field.access.create` and `field.access.update`).
* Non-admin callers cannot set restricted fields (such as `roles: ['super_admin']`) via `invite({ data })` unless authorized by that field's access policy.

### 4.7. Graceful Password Handling on Login

In `packages/core/src/auth/password.ts`:

```ts
export async function verifyPassword(plain: string, stored?: string | null): Promise<boolean> {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) {
    return false;
  }
  // scrypt verification...
}
```

And in `packages/core/src/controllers/auth.controller.ts`:
If `user.password` is empty, null, or lacks salt/hash separator, `login` returns HTTP 401:
`{ "error": true, "code": "PASSWORD_NOT_SET", "message": "No password has been set for this account. Please use your setup or reset link." }`

---

## 5. Developer Experience: SDK API

The `@dyrected/sdk` provides an ergonomic, symmetric API for all auth collections.

### 5.1. Inviting Users (Unified Flow)

`invite` is the single unified method for both:

1. **New users:** Creates the user record and sends an invite email.
2. **Pre-created passwordless accounts:** (e.g. users created during guest checkout, BVN verification, or CSV import). Dyrected finds the existing record, verifies no password has been set yet (or caller is admin), merges any new fields, and generates the invite link without a 409 conflict!

```ts
const investors = client.collection("investors");

// --- 1. Create full record AND send invite in one call ---
const res = await investors.invite(
  {
    email: "jane@example.com",
    first_name: "Jane",
    last_name: "Doe",
    phone_number: "+2348012345678",
    bvn: "12345678901",
    roles: ["investor"],
    status: "active", // Respects custom status; does not force 'pending'
  },
  {
    inviteUrl: "https://myportal.com/set-password",
  },
);
// res.user     -> Full created/updated user record
// res.token    -> Signed invite JWT
// res.inviteUrl-> Clickable invitation link

// --- 2. Invite an already-created record by ID or Email ---
// (e.g. Alajo created investor in DB during BVN check, now invites them)
await investors.invite("jane@example.com");

// --- 3. Headless Token Generation (No Email Sent) ---
// (Useful if sending link via SMS, WhatsApp, or webhook)
const headless = await investors.createInviteToken("jane@example.com", {
  expiresIn: "3d",
  sendEmail: false,
});
// headless.token, headless.inviteUrl
```

### 5.2. Password Resets

```ts
// Standard password reset (triggers email)
await investors.sendPasswordReset("jane@example.com", {
  resetUrl: "https://myportal.com/reset-password",
});

// Headless reset token (no email sent)
const headlessReset = await investors.createPasswordResetToken("jane@example.com", {
  expiresIn: "2h",
  sendEmail: false,
});
// headlessReset.token, headlessReset.resetUrl
```

### 5.3. Safe Token Verification on Mount

Before rendering a "Set your password" or "Reset password" form, the frontend validates the token:

```ts
const tokenCheck = await investors.verifyToken(tokenParam, "invite");

if (!tokenCheck.valid) {
  // Token is expired, malformed, or already used
  showError(tokenCheck.message);
} else {
  // Safe to render password creation inputs for tokenCheck.email
}
```

### 5.4. Completing Password Setup

```ts
// Accept invite / set initial password:
await investors.acceptInvite(tokenParam, newPassword, {
  name: "Jane Doe", // Optional additional profile updates
});

// Or reset password:
await investors.resetPassword(tokenParam, newPassword);
```

---

## 6. Admin UI Email Template Editor

### 6.1. Storage Model

* Built-in system collection: `__email_templates` (promoted automatically when enabled via `config.email.adminEditable: true`).
* Schema:
  * `id`: string
  * `collectionSlug`: string (`*` for global default, or specific slug e.g. `investors`, `__admins`)
  * `purpose`: `'invite' | 'resetPassword' | 'welcome' | 'passwordChanged'`
  * `subject`: string (optional if provider template is chosen)
  * `format`: `'html' | 'external_template'`
  * `rawHtml`: text (raw HTML source with `{{variable}}` interpolations)
  * `externalTemplateId`: string | number (e.g. Seamailer `821354` or Postmark alias)
  * `active`: boolean (toggles DB override on/off; when false, falls back to code config)

### 6.2. Editor & Preview Experience

* **Editor Component**:
  * Evaluated Monaco vs CodeMirror 6 vs lightweight editors.
  * *Decision:* **CodeMirror 6** (`@uiw/react-codemirror`) is recommended over Monaco for `@dyrected/admin`.
    * Monaco weighs **~5MB-10MB**, requires dedicated Web Workers, and frequently conflicts with Vite/Rollup library bundling in consumer projects.
    * CodeMirror 6 weighs **~250KB**, is fully tree-shakable, provides HTML syntax highlighting with linting, bracket matching, and tag auto-closing out of the box, with zero worker dependencies.
* **Side-by-side Responsive Preview**:
  * Desktop and Mobile view toggle rendering the live compiled HTML inside an isolated `iframe` (with `sandbox="allow-same-origin"`).
  * Automatically populates mock variables (e.g. `{{inviteUrl}}`, `{{token}}`, `{{user.first_name}}`).
* **Variable Chips Bar**:
  * Clickable badges to quickly insert template tags into the cursor position: `{{url}}`, `{{token}}`, `{{email}}`, `{{collectionLabel}}`, `{{siteName}}`, `{{user.name}}`.
* **"Send Test Email" Drawer**:
  * Triggers an actual test delivery to an admin's email address with mock payload to verify email client rendering across Outlook, Apple Mail, and Gmail.

---

## 7. Design Decisions & Industry Standard Alignment

### Decision 1: Optional Subject Line with External Templates

* **Status:** Resolved / Confirmed.
* **Behavior:** When an external template is provided (`template: 821354`), `subject` is optional. If provided in Dyrected code or DB, it passes as an override. If omitted, the external provider's pre-configured subject line in Seamailer/Postmark is used.

### Decision 2: Single Unified Transport in `@dyrected/core`

* **Status:** Resolved / Confirmed.
* **Behavior:** Core exports the typed `OutboundEmail` contract and dispatches to `config.email.send`. No forced external dependencies or fragmented transport packages.

### Decision 3: Unified `invite` Flow (No Redundant Duplicate Methods)

* **Status:** Resolved / Confirmed.
* **Problem Addressed:** Apps like Alajo often create full user records in the database before sending an invitation (e.g. during guest checkout, KYC verification, or CRM import). Previously, calling `invite` on an existing user threw a `409 Conflict`.
* **Resolution:**
  1. Remove the 409 restriction if the user record exists but **has no password set** (or if caller is an admin re-inviting).
  2. Support passing full document payloads directly into `invite(payload, options)`.
  3. Support inviting existing records by email or ID (`invite(email)`).
  4. Return `{ success: true, user, token, inviteUrl }` so callers receive the user document immediately.

### Decision 4: Stateless Signed JWTs

* **Status:** Resolved / Confirmed.
* **Behavior:** Invite and reset tokens are signed stateless JWTs (`signCollectionToken`). They do not create extra database records. Invalidation on use is achieved by verifying `token.iat` against the user's `passwordChangedAt` timestamp or session revocation version.

### Decision 5: Raw HTML Editor + Live Preview

* **Status:** Resolved / Confirmed.
* **Behavior:** The Admin UI provides raw HTML editing with CodeMirror 6 and an interactive live preview `iframe`. For developers who prefer structured templates, Dyrected's built-in `layout(...)` helper remains available in code.

### Decision 6: Code vs Database Precedence

* **Status:** Resolved / Confirmed.
* **Behavior:**
  1. If `__email_templates` has an active record (`active: true`), it takes precedence over code.
  2. If toggled inactive (`active: false`) or deleted, resolution falls back to `collection.auth.email.templates`, then global `config.email.templates`, then core defaults.
  3. The Admin UI includes a "Revert to Code Default" button that restores the code-defined template into the editor.

---

## 8. Documentation Impact (`apps/docs`)

To maintain Dyrected's task-oriented, practical instructor voice (consulting `DOCS_PHILOSOPHY.md`), the following documentation updates must be made:

### 8.1. `content/docs/deployment-and-operations/infrastructure/email.mdx`

* **Title:** Transactional Email & Custom Templates
* **Updates:**
  * Document the updated `OutboundEmail` transport contract: explain how `msg.type === 'template'` enables zero-hack integration with Seamailer, Postmark, and SendGrid, alongside `msg.type === 'html'`.
  * Add concrete copy-paste recipe for **External Template Providers** (e.g. Seamailer / Postmark).
  * Document **Collection-Level Template Overrides**: show how `collection.auth.email.templates` isolates customer-facing emails from internal admin emails.

### 8.2. `content/docs/deployment-and-operations/authentication/operations.mdx`

* **Title:** Authentication Operations & Token Lifecycles
* **Updates:**
  * Update **Inviting Users** section:
    * Document calling `invite()` with a full document payload (`firstName`, `role`, `bvn`, etc.).
    * Document calling `invite()` on pre-created passwordless accounts (e.g. guest checkout / onboarding flows) without 409 errors.
  * Add **Headless Token Generation**: show how to pass `sendEmail: false` or use `createInviteToken` when sending onboarding links via SMS or custom notification queues.
  * Add **Verifying Tokens on Mount**: guide developers on calling `verifyToken(token, 'invite')` on page mount before rendering password setup inputs.

### 8.3. `content/docs/model-content/configuration/collections.mdx`

* **Title:** Collection Configuration (`auth` settings)
* **Updates:**
  * Expand `auth` object properties:
    * `urls.invite`: custom acceptance URL for this collection (overriding default `/admin`).
    * `urls.resetPassword`: custom reset URL for this collection.
    * `inviteExpiration`: token validity duration (e.g. `'48h'`, `'7d'`).
    * `resetPasswordExpiration`: token validity duration (e.g. `'30m'`, `'2h'`).
    * `email.templates`: collection-specific template builders.

### 8.4. `content/docs/deliver-content/sdk-api/overview.mdx`

* **Title:** SDK API Reference
* **Updates:**
  * Document new and enhanced collection auth methods:
    * `client.collection(slug).invite(emailOrPayload, options)`
    * `client.collection(slug).createInviteToken(email, options)`
    * `client.collection(slug).sendPasswordReset(email, options)`
    * `client.collection(slug).createPasswordResetToken(email, options)`
    * `client.collection(slug).verifyToken(token, purpose)`
