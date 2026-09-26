---
"@dyrected/core": minor
"@dyrected/sdk": minor
"@dyrected/admin": minor
---

feat(auth): polymorphic email transport, custom templates cascade, headless tokens, and admin template management

- **Polymorphic email delivery:** support both direct HTML and external template IDs with dynamic variables (Postmark, Seamailer, SendGrid) without serializing payloads into fake HTML.
- **Multi-tier template cascade:** DB overrides (`__email_templates`) -> Collection config (`collection.auth.email.templates`) -> Global config (`config.email.templates`) -> Core defaults.
- **Collection action URLs:** configure `auth.urls.invite` and `auth.urls.resetPassword` per collection to keep end-users from being routed to `/admin`.
- **Token lifecycle & safety:** hardened password safety checks for null/empty passwords returning 401 `PASSWORD_NOT_SET`, protected against double-acceptance, and added token superseding with `invitedAt`.
- **Headless tokens & token verification:** support `sendEmail: false`, `createInviteToken`, `createPasswordResetToken`, and `GET /api/collections/:slug/tokens/verify` (SDK `client.collection(slug).verifyToken(token, type)`).
- **Admin UI template editor:** live CodeMirror HTML editor, desktop/mobile iframe preview, variable chip insertion, external template ID mode, test email dispatch dialog, and revert-to-default capability.
