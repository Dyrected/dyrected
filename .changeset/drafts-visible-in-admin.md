---
"@dyrected/core": patch
---

Fix `drafts: true` documents disappearing from the Admin list

The publishing workflow synthesized from `drafts: true` (`simplePublishingWorkflow`) defined no role→capability mappings, so `canViewWorkflowDraft` returned `false` for everyone — including admins and editors. Every draft document was then filtered out of collection reads, leaving the Admin list empty.

`canViewWorkflowDraft` now treats a workflow with no `roles` (the `drafts: true` case) as ungated: any **authenticated** user can view drafts, so they show up in the Admin regardless of what a project names its roles. Unauthenticated/public readers still only ever see published content, so drafts never leak to the live site. Workflows that define explicit `roles` keep their existing capability-based gating.
