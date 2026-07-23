# Review summary

- Document: `apps/docs/content/docs/features/authentication/operations.mdx`
- Goal: Keep this as the exact route and SDK reference page while updating invite and reset behavior to match current core and SDK behavior.
- Audience: Developers integrating against Dyrected auth endpoints.
- Scope: Endpoint table, request and response shape, flow semantics, and key edge cases for invite/reset.
- Payload equivalent: `https://payloadcms.com/docs/authentication/operations`
- Extracted template:
  - route inventory table
  - operation-by-operation sections
  - examples first, then caveats
  - error shape wrap-up
- Reader outcome: A reader should leave knowing the current SDK signatures, the exact return shape for invite, and the pending-user semantics of invitations.
- Outline:
  1. Full endpoint table
  2. Bootstrap
  3. Login/logout/me/refresh
  4. Password recovery and change
  5. Invites and acceptance
  6. Error shapes

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/docs/features/authentication/operations.mdx` | Existing doc | Medium | Strong structure, but the table and invite semantics were behind current behavior. |
| `packages/sdk/src/index.ts` | Implementation | High | Source of truth for current SDK method signatures and return shapes. |
| `packages/core/src/controllers/auth.controller.ts` | Implementation | High | Source of truth for endpoint behavior, URL generation, pending users, and password-changed notification after reset. |
| `packages/core/src/__tests__/auth-invite.test.ts` | Tests | High | Confirms pending-user creation, login block before acceptance, and pending-user activation on accept. |
| `https://payloadcms.com/docs/authentication/operations` | Comparison structure | Medium | Used for reference-page pacing and section order only. |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Invite examples | Whether the docs should show `data: { roles: ["editor"] }` or a simpler non-role extra field example | The role example is useful, but some auth collections may not expose roles that way | Confirm the role example is acceptable on this generic page |

## Placeholder sweep

No unresolved placeholders remain.

## Reviewer questions

1. Should the invite example keep the role assignment example, or should this page stay role-neutral?
2. Is the “pending user appears in admin list before acceptance” detail important enough for this page, or should it move elsewhere too?
3. Does the reset section now describe the password-changed notification clearly without turning into an email page?

## Example consistency

- Primary scenario: `users` collection with typical email/password auth.
- The guide stays on SDK examples and the same example domains throughout.

## High-risk areas

- SDK signature drift
- invite lifecycle semantics
- login behavior for pending invited users
- reset flow side effects

## Dry-run check

Recommended. Have one teammate implement invite plus reset from only this page and note whether any step is still ambiguous.

## Canonical links

- Keep template customization on `/docs/features/email/overview`.
- Keep JWT payload details on `/docs/features/authentication/token-data`.

## Holistic review

- The page remains reference-led, not conceptual.
- The most important shape changes are now visible in the table and the invite section.
- Duplication with the email page is limited to behavior necessary to use the endpoints.

## Status

`ready-for-sme-review`
