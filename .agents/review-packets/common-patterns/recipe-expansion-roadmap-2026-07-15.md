# Common Patterns Recipe Expansion Roadmap

Status: implemented in batches in this change set
Date: 2026-07-15

## Goal

Expand the `@dyrected/knowledge` recipe library beyond the initial 11 schema-focused patterns, while keeping every new recipe grounded in verified `@dyrected/core` APIs and rendered through the existing common-patterns docs surface.

## Batch plan

### Batch 1: Content modeling foundations

- `site-settings-global`
- `navigation-global-links`
- `category-taxonomy`

Reason:
These cover the first singleton and taxonomy structures most teams need before deeper workflow or media work matters.

### Batch 2: Access and governance

- `tenant-scoped-access`
- `owner-or-admin-access`
- `archive-instead-of-delete`

Reason:
These are common production constraints that go beyond the earlier single-user ownership example.

### Batch 3: Editor workflow and delivery

- `seo-tab-fields`
- `preview-url-token-mode`
- `document-download-library`
- `responsive-image-library`

Reason:
These connect schema work to editor usability, preview flows, and reusable upload infrastructure.

## Verification basis

Every recipe in this roadmap was limited to features already verifiable in the repo:

- `defineGlobal`
- `defineTab`
- collection `admin.useAsTitle`
- collection `admin.previewUrl`
- collection `admin.previewMode`
- collection `urlPattern`
- field `hasMany`
- global/collection access rules
- `upload.allowedMimeTypes`
- `upload.maxFileSize`
- `upload.adminThumbnail`
- `upload.imageSizes`
- `siteId` and `shared` remain available, but were not required for this batch

## Public docs impact

The common-pattern category pages should stay the human-authored discovery layer. Each new section should:

- start from the problem
- explain the pattern briefly
- render `Example implementation` from `@dyrected/knowledge`
- link back to the canonical docs pages

## Follow-up candidates

Useful next recipes after this batch:

- unique slug collision handling
- soft scheduling around workflow dates
- multi-site globals and site-scoped content
- private preview for server-rendered frontend routes
- curated featured-content selections
