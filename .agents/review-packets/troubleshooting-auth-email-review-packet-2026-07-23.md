# Review summary

- Document: `apps/docs/content/docs/features/troubleshooting/troubleshooting.mdx`
- Goal: Keep the page as a fast narrowing tool while updating the auth-email troubleshooting section for current invite/reset/password-changed behavior and admin signals.
- Audience: Developers debugging a broken Dyrected setup.
- Scope: Issue classification row and the auth-email troubleshooting section only.
- Payload equivalent: `https://payloadcms.com/docs/troubleshooting/troubleshooting`
- Extracted template:
  - symptom table
  - classify first
  - focused subsection per failure class
  - link outward for deeper feature docs
- Reader outcome: A reader should leave knowing that auth-email failures can coexist with successful endpoint responses, and where to check both backend config and admin-side warning signals.
- Outline:
  1. Failure classification table
  2. Layered troubleshooting order
  3. Focused email section with split between development fallback and production delivery

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/docs/features/troubleshooting/troubleshooting.mdx` | Existing doc | Medium | Strong overall page; only the email symptom line and auth-email section needed updates. |
| `packages/core/src/services/email.service.ts` | Implementation | High | Confirms Ethereal fallback and missing-`nodemailer` warning behavior. |
| `packages/core/src/controllers/auth.controller.ts` | Implementation | High | Confirms best-effort send behavior and password-changed notification after reset. |
| `packages/admin/src/pages/dashboard/dashboard.tsx` | Implementation | High | Confirms the “Email delivery is not configured” dashboard warning text. |
| `packages/admin/src/pages/collections/list-page.tsx` | Implementation | High | Confirms the copyable invite link exists independently of provider delivery. |
| `https://payloadcms.com/docs/troubleshooting/troubleshooting` | Comparison structure | Medium | Used for troubleshooting-page pacing and scannability only. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Copyable invite URL note | Whether this troubleshooting page should mention the UI fallback, or whether that belongs only in admin docs | It is useful diagnostically, but it is an admin-specific detail | Confirm placement |

## Placeholder sweep

No unresolved placeholders remain.

## Reviewer questions

1. Is the admin “Needs attention” note useful here, or does it make the page feel too dashboard-specific?
2. Should the auth-email symptom row explicitly call out bounced mail, or keep the wording narrower?
3. Does the updated section still feel like troubleshooting rather than setup guidance?

## Example consistency

- Primary scenario: auth email appears “broken” even though the feature request itself returns success.
- The section stays diagnostic and does not add unrelated provider setup detail.

## High-risk areas

- production versus development behavior
- auth endpoint semantics
- UI troubleshooting references

## Dry-run check

Recommended. Ask one reviewer to debug a deliberately unconfigured email setup from this page alone and record whether they find the backend/admin split quickly.

## Canonical links

- Keep full transport setup on `/docs/features/email/overview`.
- Keep auth flow behavior on `/docs/features/authentication/operations`.

## Holistic review

- The symptom table stays compact.
- The section now reflects all current auth-email flows without broadening the page beyond troubleshooting.

## Status

`ready-for-sme-review`
