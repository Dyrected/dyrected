# Review summary

- Document: `apps/docs/content/docs/features/email/overview.mdx`
- Goal: Keep the page focused on Dyrected auth email setup and template customization while updating it for URL-first invite/reset behavior and the password-changed notification.
- Audience: Developers wiring or customizing Dyrected auth email.
- Scope: Auth email transport, built-in triggers, template inputs, and recommended URL-first usage.
- Payload equivalent: `https://payloadcms.com/docs/email/overview`
- Extracted template:
  - intro with mental model
  - recommended setup first
  - config surface
  - built-in behavior and triggers
  - customization path
  - advanced escape hatches
- Reader outcome: A reader should leave knowing when to configure email, what the four built-in auth emails are, and why `inviteUrl` / `resetUrl` is the recommended path.
- Outline:
  1. Mental model
  2. When to configure email
  3. Recommended starting point
  4. Top-level config
  5. Development fallback
  6. Built-in auth emails
  7. Template customization
  8. Advanced paths

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/docs/features/email/overview.mdx` | Existing doc | Medium | Good structure and voice, but stale on invite template args and examples. |
| `packages/core/src/services/email.service.ts` | Implementation | High | Source of truth for default invite, reset, welcome, and password-changed templates. |
| `packages/core/src/controllers/auth.controller.ts` | Implementation | High | Confirms when invite/reset/password-changed emails are triggered and how URLs are built. |
| `apps/docs/content/docs/features/authentication/operations.mdx` | Existing doc | Medium | Canonical endpoint page that this page should link to instead of duplicating flow semantics. |
| `https://payloadcms.com/docs/email/overview` | Comparison structure | Medium | Used for structure and information flow only, not wording or product facts. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Built-in emails | Whether any other auth-related email should be documented here now | Code currently shows four built-in templates only | Confirm no additional built-in email shipped outside this set |

## Placeholder sweep

No unresolved placeholders remain.

## Reviewer questions

1. Does this page now strike the right balance between transport setup and auth-email behavior?
2. Is the recommendation to prefer `inviteUrl` and `resetUrl` aligned with product direction?
3. Should this page mention email bounce/deliverability guidance, or keep that for a separate page?

## Example consistency

- Primary scenario: a project wiring a real provider and using link-first auth emails.
- The example stays on one provider (`Resend`) and one auth-email setup path.
- Placeholder substitutions remain explicit through env vars and example domains.

## High-risk areas

- auth email semantics
- template argument shapes
- default-template behavior when URL is present versus absent

## Dry-run check

Recommended. Have one teammate wire a provider and confirm they can predict which built-in template runs for invite, forgot password, and successful reset from this page alone.

## Canonical links

- Keep endpoint-by-endpoint semantics on `/docs/features/authentication/operations`.
- Keep full config typing on `/docs/basics/configuration/overview`.

## Holistic review

- Value is visible early.
- Recommended path appears before edge cases.
- The page avoids duplicating full auth-flow explanations and links to the canonical operations page instead.

## Status

`ready-for-sme-review`
