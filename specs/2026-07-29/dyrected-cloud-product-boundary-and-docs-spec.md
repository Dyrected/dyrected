# Dyrected Cloud Product Boundary and Docs Positioning Spec

Date: 2026-07-29
Status: Draft for review
Audience: Product, docs, platform

## Purpose

Consolidate two product-positioning notes into one working spec for Dyrected documentation and product framing.

This spec defines how Dyrected should describe:

- Dyrected Cloud
- self-hosted Dyrected
- what belongs in the main docs path
- what should be relabeled as self-hosted-only or advanced
- how `llms.txt` should frame the product boundary

## Source Inventory

| Source | Trust | Why it matters | Notes |
|---|---|---|---|
| `pasted-text.txt` at attachment `89566d1d-030b-4a49-9fae-ec5b2b982ef8` | Medium | Audits the current docs story and identifies where Dyrected is being presented as a general application backend instead of a content platform. | Based on live docs review; notes that `docs.dyrected.com/llm.txt` returned `404`. |
| `pasted-text.txt` at attachment `1c98df94-236b-4196-a877-599e91bad245` | Medium | Refines the recommendation by separating Cloud from self-hosted and using Sanity vs Payload as boundary references. | Stronger product-model framing than the first note. |
| Existing repo docs structure under `apps/docs` | High | Confirms the current docs already contain the areas being discussed. | Includes `apps/docs/public/llms.txt` and `apps/docs/public/llms-full.txt`. |

## Executive Decision

Dyrected should be framed as a code-first content platform with two deliberate runtime models:

1. `Dyrected Cloud` is a managed content backend.
2. `Self-hosted Dyrected` is a developer-controlled backend runtime with CMS capabilities.

The primary docs path, homepage framing, and `llms.txt` should optimize for the Cloud/content story.

Broader Payload-like capabilities should remain in the product and docs, but they must be clearly separated as:

- self-hosted capabilities
- advanced runtime capabilities
- not part of the default Dyrected Cloud promise

## Core Product Definition

Recommended top-level definition:

> Dyrected is a code-first content platform for custom websites.
>
> Dyrected Cloud provides a managed content backend for website content, media, APIs, editor access, publishing workflows, content rules, and content events.
>
> Self-hosted Dyrected runs inside the developer's server application and supports arbitrary TypeScript hooks, custom authentication, custom integrations, and application-specific backend logic.

## The Actual Problem

The current docs open with the right concept, but the deeper documentation broadens the promise into a much larger application-backend story.

The current docs surface examples and patterns around:

- application-user authentication
- multi-workspace SaaS data
- customer dashboards
- tickets and support requests
- ecommerce customer operations
- internal tools unrelated to published content

That creates a product-story collision:

- opening promise: content backend for websites
- accumulated docs story: general application backend with generated admin

This spec resolves that collision by separating Cloud from self-hosted instead of flattening both into one product promise.

## Product Boundary

### Dyrected Cloud

Dyrected Cloud should promise:

- structured website content
- content modeling
- media storage and delivery
- content APIs
- editor and admin authentication
- drafts and publishing
- permissions for editorial workflows
- schema synchronization
- live preview
- workflow lifecycle events
- webhooks
- future content-focused hosted functions

Dyrected Cloud should not promise:

- full application backend hosting
- arbitrary custom server endpoints
- general customer identity infrastructure
- unrestricted server-side packages
- payment processing
- queue workers for arbitrary business logic
- general SaaS business records
- complete app-session and application-auth management

### Self-hosted Dyrected

Self-hosted Dyrected may continue to support:

- arbitrary TypeScript hooks
- custom endpoints
- custom authentication collections
- database transactions
- direct server-side integrations
- application records
- customer or member auth
- broader internal tools
- plugins
- application-specific server logic

## Content Model for Cloud Extensions

Cloud should be explained as having its own extension model rather than as a restricted version of self-hosted hooks.

### Content rules

Use for synchronous, safe, content-scoped behavior:

- validation
- transformations
- default values
- slug creation
- visibility rules
- content-oriented access rules

### Content events

Use for asynchronous, managed side effects:

- document created
- document updated
- document published
- document unpublished
- document deleted
- asset uploaded
- workflow state changed

### Event destinations

Initial direction:

- signed webhook
- website revalidation
- email notification
- content-related record updates
- external automation

Future direction:

- Dyrected Content Functions

### Future hosted functions boundary

If Dyrected adds hosted functions for Cloud, they should be event-triggered and content-centred.

Good fit:

- content enrichment
- metadata generation
- asset analysis
- translation
- search index updates
- site revalidation
- content synchronization
- scheduled publishing tasks

Not a fit:

- checkout endpoints
- full application auth
- banking or transactional core systems
- chat servers
- general SaaS business logic

## Documentation Strategy

### Main docs path

The default docs journey should teach the content-platform story first:

- website content
- editorial workflows
- media management
- live preview
- content APIs
- editor permissions
- frontend integration

### Shared concepts

These can remain shared across Cloud and self-hosted:

- collections
- globals
- fields
- relationships
- blocks
- uploads
- access control
- admin panel
- live preview
- workflows
- audit history
- SDK
- REST content API
- TypeScript schemas

### Self-hosted-only framing

These should remain documented, but clearly labeled:

- arbitrary hooks
- app-user authentication
- custom endpoints
- application-shaped data models
- custom application surfaces beyond content editing
- advanced plugin-powered backend behavior

## Required Documentation Changes

### 1. Fix the machine-readable docs boundary

The first source notes that `docs.dyrected.com/llm.txt` returned `404`.

Repo evidence shows the docs app currently contains:

- `apps/docs/public/llms.txt`
- `apps/docs/public/llms-full.txt`

Action:

- verify which file is intended to be public
- ensure the deployed docs site exposes the intended path
- add a boundary-setting preamble to `llms.txt`

### 2. Add a product-boundary preamble to `llms.txt`

`llms.txt` should not begin as a flat page map.

It should begin with:

- what Dyrected is
- the difference between Cloud and self-hosted
- what data belongs in Dyrected Cloud
- what remains in the application's backend

### 3. Rename and narrow authentication framing for Cloud docs

Change the main documentation framing from generic `Authentication` to an editor/admin-first story.

Preferred framing:

- Editor and Admin Authentication

Primary examples should cover:

- agency owners
- developers
- client editors
- content managers
- reviewers
- administrators

Application-user auth can remain documented under self-hosted or advanced sections.

### 4. Remove generic application examples from the primary Cloud path

De-emphasize or relocate examples involving:

- customer dashboards
- project spaces
- user-owned generic records
- support tickets
- ecommerce customer operations
- multi-workspace SaaS application records

Replace with content-shaped examples such as:

- published vs draft content
- contributor-assigned articles
- site-scoped client content
- internal editorial notes
- reusable page sections
- media-library workflows

### 5. Reframe custom app surfaces for Cloud

The current "custom app surfaces" story should be narrowed for Cloud into embedded content editing.

Cloud-friendly examples:

- embedded announcement editor
- page-section editor
- media picker
- blog editor
- product-description editor
- franchise-location content updates

### 6. Remove ecommerce as a broad product category in the main nav

If ecommerce appears in the main Cloud story, it should be reframed around content:

- storefront content
- commerce content integrations

Not around:

- carts
- checkout
- payments
- order systems
- fulfillment
- customer account infrastructure

### 7. Clean up generic terminology

Across overview pages and examples, prefer `content backend` over generic `backend` when the Cloud story is being described.

Collection examples should bias toward:

- pages
- posts
- services
- testimonials
- FAQs
- announcements
- team members
- products as content objects
- reusable sections

Avoid leading with examples like:

- users
- orders
- support tickets
- arbitrary submissions as product-default examples

## Information Architecture Recommendation

Recommended split:

- `Dyrected Cloud`
- `Self-hosted Dyrected`
- `Shared Concepts`
- `Advanced Runtime Capabilities`

This is better than describing Cloud as "self-hosted Dyrected with restrictions."

## Alignment and Tension Between the Two Source Notes

The two notes are mostly aligned.

### Where they agree

Both sources agree that:

- the current docs are overpromising a general application backend story
- Dyrected Cloud should be positioned as a managed content backend
- editorial/content use cases should dominate the primary docs path
- `llms.txt` needs a clearer product-boundary introduction
- application-auth and broader backend capabilities should not define the main Cloud promise

### The only meaningful tension

The first note leans toward removing broader application-backend examples from the main story and could be read as "this content should go away."

The second note clarifies the better version of that recommendation:

- do not remove those capabilities from Dyrected entirely
- keep them for self-hosted Dyrected
- stop presenting them as the default Dyrected Cloud story

### Final resolution

The notes are not truly opposing.

They differ mainly in precision:

- note one identifies the docs-boundary problem
- note two provides the product-model fix

This spec adopts the second note's distinction as the resolution.

## Recommended Positioning Sentence

Use this as the internal north-star:

> Keep Payload as the architectural reference for self-hosted Dyrected, and use Sanity as the architectural reference for Dyrected Cloud.

## Review Questions

- Should the docs IA expose Cloud vs self-hosted as top-level navigation, or as a clear decision page early in onboarding?
- Which existing docs pages should be relabeled as `Self-hosted only` versus moved entirely out of the default nav path?
- Is `llms.txt` intended to be the canonical public machine-readable entrypoint, or should `llms-full.txt` be surfaced instead?
- Do we want to introduce `Content Rules`, `Content Events`, and `Content Functions` as official terms now, or stage them gradually?

## Validation Status

Verified against repo contents:

- `apps/docs/public/llms.txt`
- `apps/docs/public/llms-full.txt`
- current docs content areas under `apps/docs/content/docs`

Not yet verified in this task:

- deployed routing for `docs.dyrected.com/llm.txt`, `llms.txt`, or `llms-full.txt`
- final nav changes or final wording in published docs
