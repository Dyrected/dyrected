# Review summary

- Document: `apps/docs/content/docs/features/authentication/handing-off-to-editors.mdx`
- Goal: Preserve the page as a first-handoff guide while updating the self-hosted path to the current invite-based admin flow.
- Audience: Developers or agencies preparing the first editor or client handoff.
- Scope: First handoff decision, self-hosted versus Cloud path, email readiness, and role-setting expectations.
- Payload equivalent: No clean direct equivalent. Nearest structural match used: `https://payloadcms.com/docs/authentication/overview`
- Extracted template:
  - quick orientation
  - choose the right path
  - recommended happy path
  - role and setup caveats after the path
  - deeper links at the end
- Reader outcome: A reader should leave knowing that self-hosted admin handoff should use invitations, not manual password entry, and that production email readiness is part of the handoff checklist.
- Outline:
  1. First handoff rule
  2. Account path by deployment model
  3. Cloud path
  4. Self-hosted path
  5. Starter roles
  6. Email readiness
  7. Permission boundaries
  8. Recommended path and success check

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/docs/features/authentication/handing-off-to-editors.mdx` | Existing doc | Medium | Strong goal and sequencing, but stale on the self-hosted onboarding path. |
| `packages/admin/src/pages/collections/list-page.tsx` | Implementation | High | Confirms invite dialog, copyable invite link, and role selector behavior. |
| `packages/core/src/controllers/auth.controller.ts` | Implementation | High | Confirms invite URL generation and pending-user provisioning. |
| `packages/admin/src/pages/dashboard/dashboard.tsx` | Implementation | High | Confirms the email configuration warning in the dashboard “Needs attention” panel. |
| `packages/core/src/__tests__/auth-invite.test.ts` | Tests | High | Confirms pending invite users and acceptance behavior. |
| `https://payloadcms.com/docs/authentication/overview` | Comparison structure | Low | Only a loose structural reference because Payload does not appear to have a matching “client handoff” page. |

## Uncertainty register

No open factual uncertainties remain after review.

## Placeholder sweep

No unresolved placeholders remain.

## Reviewer questions

Resolved in review:

1. The page should stay a handoff guide, not a release note.
2. The email-readiness section has the right level of emphasis.
3. The two self-hosted intro sections should be merged into one clearer flow.

## Example consistency

- Primary scenario: first self-hosted editor handoff after the builder has already validated the site.
- The page keeps one stable distinction: Cloud invitation flow versus self-hosted invitation flow.

## High-risk areas

- onboarding guidance
- role expectations
- admin UI references that may change
- whether email is treated as a setup requirement or a troubleshooting concern

## Dry-run check

Strongly recommended. Have a teammate use only this page to onboard one self-hosted editor from scratch and note where they still hesitate.

## Canonical links

- Keep auth mechanics on `/docs/features/authentication/overview` and `/docs/features/authentication/operations`.
- Keep permission design depth on `/docs/basics/access-control/overview`.

## Holistic review

- The value is visible early.
- The self-hosted branch no longer teaches an outdated manual-account path.
- The page stays outcome-first and does not turn into a full admin feature reference.

## Status

`ready-for-sme-review`
