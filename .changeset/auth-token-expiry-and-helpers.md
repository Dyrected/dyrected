---
"@dyrected/core": minor
"@dyrected/admin": minor
---

**Auth: configurable session token lifetime and reusable server auth helpers**

Session JWTs are no longer fixed at 7 days. Set `auth.tokenExpiration` on any auth collection using `jose` `setExpirationTime` values:

```ts
auth: {
  tokenExpiration: "12h",
}
```

The configured lifetime applies to login, first-user registration, invite acceptance, token refresh, and external-provider admin SSO. Password-reset (`1h`) and invite (`7d`) purpose tokens stay fixed.

**Reusable auth helpers from `@dyrected/core/server`**

The same token, session, password, and email helpers Dyrected uses internally are now exported for custom endpoints and hooks:

- Tokens: `signCollectionToken`, `verifyCollectionToken`, `decodeCollectionToken`, `resolveSessionTokenExpiry`
- Sessions: `issueAuthSessionToken`, `getAuthSession`, `revokeAuthSession`, `revokeAllAuthSessions`
- Passwords: `hashPassword`, `verifyPassword`
- Email: `sendEmail`, `buildResetPasswordEmail`, `buildInviteEmail`, `buildWelcomeEmail`, `buildPasswordChangedEmail`

**Admin: resizable navigation sidebar**

The desktop admin menu can now be resized by dragging its right edge, mirroring the AI assistant panel. Double-click resets to the default width. The width persists to the `layout:admin:sidebar-width` global preference with localStorage as the instant cache and offline fallback.
