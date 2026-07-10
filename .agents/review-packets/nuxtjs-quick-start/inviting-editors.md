# Review summary

- Document: `apps/docs/content/new-docs/quick-start-guides/nuxtjs-quick-start/inviting-editors.mdx`
- Goal: Explain the first safe editor handoff for a Nuxt project, including the Cloud and self-hosted differences.
- Audience: Developers or technical owners who have a working Nuxt + Dyrected setup and now need to onboard another user.
- Scope: account model, Cloud invitations, self-hosted direct user creation, starter roles, and first-handoff guardrails.

## Payload equivalent

- No clean single-page Payload equivalent.
- Closest official reference used for structure: `https://payloadcms.com/docs/authentication/overview`
- Why it was chosen: the page is really about operational onboarding, but Payload's auth overview was the closest official page for the underlying account model.

## Extracted template

1. Outcome and fit
2. The governing rule before handoff
3. Account model
4. Branching by deployment mode
5. Permission considerations
6. Success signal

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/new-docs/quick-start-guides/nextjs-quick-start/inviting-editors.mdx` | authored docs | high | Flow benchmark |
| `packages/cli/src/commands/init.ts` | package code | high | Starter `__admins` shape and roles context |
| User guidance in current thread | product direction | medium | Cloud invitations preferred; self-hosted invite flow not shipped yet |
| `https://payloadcms.com/docs/authentication/overview` | official external docs | medium | Structural inspiration only |

## Reader outcome

Reader should understand how to hand the Nuxt setup to another editor without implying capabilities the product does not currently ship.

## Outline

1. The first handoff rule
2. Which accounts the dashboard uses
3. Cloud vs self-hosted onboarding paths
4. What to say about invites
5. Permission boundaries
6. Success check

## Reviewer questions

1. Should this page stay focused on first handoff only, or should it also mention audit logging and access review as future follow-up topics?

## High-risk areas

- product-behavior accuracy
- lack of a clean Payload equivalent

- Status: `ready-for-sme-review`
