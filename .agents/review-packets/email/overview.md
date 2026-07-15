# Review Packet — features/email/overview.mdx

## Review summary

- Document: Email Overview
- Goal: Reader understands when Dyrected sends email automatically, how to wire a transport provider, how development fallback works, and how to customize the built-in auth email templates.
- Audience: Dyrected developers configuring auth-related email for the first time.
- Scope: Full rewrite of an empty page into the canonical overview for transactional email in Dyrected.

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/core/src/services/email.service.ts` | code | high | Canonical source for dev fallback, send behavior, built-in template builders, and best-effort sending. |
| `packages/core/src/services/email-template.ts` | code | high | Confirms default email shell, escaping behavior, CTA URL safety, and branded template structure. |
| `packages/core/src/__tests__/email.service.test.ts` | tests | high | Confirms default template escaping, trusted custom template pass-through, and safe HTTP(S)-only CTA links. |
| `packages/core/src/controllers/auth.controller.ts` | code | high | Confirms which auth flows trigger which emails, token lifetimes, and best-effort error handling. |
| `packages/core/src/types/app-config.ts` | code | high | Canonical type surface for `email.from`, `email.send`, and `email.templates`. |
| `apps/docs/content/docs/guides/sending-email.mdx` | old docs | medium | Strong predecessor structure; still useful, but some wording needed tightening against current code. |
| `apps/docs/content/new-docs/features/authentication/operations.mdx` | new docs | high | Confirms related endpoint semantics and the right cross-link target for flow-level details. |
| `apps/docs/content/new-docs/basics/configuration/overview.mdx` | new docs | high | Confirms where the root config reference already explains the `email` option. |
| Payload `https://payloadcms.com/docs/email/overview` | external | medium | Closest live structural equivalent for the overall page shape. |
| Payload `https://payloadcms.com/docs/authentication/operations` | external | medium | Secondary structure source for how auth-email behavior transitions into flow-specific details. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| “Required” wording | Resolved in this pass: the page now states a stronger production expectation while keeping the code-accurate dev fallback note | The runtime still has dev fallback and best-effort behavior, so the docs now distinguish local setup from production expectations explicitly | — |
| Custom template safety | The page says custom HTML is user-owned and safety is your responsibility | True in practice because custom templates bypass the default escaping helpers, but this is explanatory guidance rather than a dedicated public API contract | Docs owner |

## Reviewer questions

1. Is this the right canonical page boundary: transport setup + built-in triggers + template customization here, endpoint semantics on Authentication Operations?
2. When the future app-level email page is written, should this page keep the hook example as a brief pointer, or should it move entirely to that new page?

## High-risk areas

- The old docs were broadly correct, but this rewrite tightens several claims against current code: dev fallback uses Ethereal through `nodemailer`, built-in emails are best-effort, provider env vars are not CLI-scaffolded, and production guidance is now stated more explicitly.
- Custom template examples intentionally stay simple; they are illustrative, not a full HTML-email design system.

## Placeholder sweep

No `NEEDS-HUMAN-VERIFY` placeholders remain in the page.

## Suggested status label

`ready-for-sme-review`
