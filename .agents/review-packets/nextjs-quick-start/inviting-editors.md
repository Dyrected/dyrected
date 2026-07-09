# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/inviting-editors.mdx`
- Goal: Explain the first safe editor handoff and clarify what the current quick-start starter really provides.
- Audience: Developers preparing to onboard the first non-builder editor.
- Scope: `__admins`, first-user flow, scaffolded roles, recommended handoff order, and the email invite escape hatch.

## Payload equivalent

- Closest official Payload page: `https://payloadcms.com/docs/authentication/overview`
- Why it was chosen: it frames who logs in, how auth-backed users relate to content access, and what the auth surface is responsible for.

## Extracted template

1. Explain what kind of user is being onboarded
2. Clarify the current auth surface
3. Recommend the safest first operational flow
4. Call out advanced or alternate onboarding paths
5. End with permission and validation checks

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `packages/cli/src/commands/init.ts` | package code | high | Confirms scaffolded `__admins` collection and starter role options |
| `packages/core/src/controllers/auth.controller.ts` | package code | high | Confirms first-user and invite behavior |
| `packages/sdk/src/index.ts` | package code | high | Confirms SDK invite methods exist |
| `packages/core/src/utils/config.ts` | package code | high | Shows auth field enforcement and role access behavior |
| `apps/docs/content/new-docs/features/authentication/overview.mdx` | authored docs | medium | Broader auth framing |
| `apps/docs/content/new-docs/basics/access-control/overview.mdx` | authored docs | medium | Permission framing |
| `https://payloadcms.com/docs/authentication/overview` | official external docs | high | Structural template only |

## Reader outcome

Reader should know which collection the dashboard uses, how the first safe handoff differs between Cloud and self-hosted admin, and when roles matter versus when invitations are the real workflow.

## Outline

1. The first handoff rule
2. Which accounts the dashboard uses
3. Start with the right handoff model
4. What the self-hosted starter gives you today
5. Recommended first handoff
6. What to say about invites
6. Permission boundaries to think about early
7. Recommended path
8. Known quick-start edge
9. Where to go deeper
10. Success check

## Reviewer questions

1. This page now treats Cloud invitations as the real onboarding path and self-hosted direct user creation as the current quick-start path. Does that split match the product surface closely enough?
2. Do we want a follow-up page dedicated to admin users, team management, and roles after this quick-start page?

## High-risk areas

- auth role accuracy
- Cloud versus self-hosted onboarding split
- onboarding expectation setting

- Status: `ready-for-sme-review`
