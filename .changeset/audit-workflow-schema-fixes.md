---
"@dyrected/core": patch
"@dyrected/admin": patch
---

Fix audit log and drafts/workflow panels not appearing in the Admin

Three related fixes so `audit: true` and `drafts: true` surface their Admin UI as intended:

- **Audit log button never showed.** The `/api/schemas` response hand-serialized each collection and omitted the `audit` and `drafts` flags, so the Admin's `schema.audit` was always `undefined` and the audit-history button never rendered regardless of config. Both flags are now included in the serialized schema.
- **Workflow/version panel hidden for existing documents.** Setting `drafts: true` synthesizes a publishing workflow via `normalizeConfig`, but the panel only appears when a document carries `__workflow` metadata — which documents created before the workflow existed (e.g. seeded content) don't have. `materializeWorkflowDocument` now treats such legacy documents as already-published live content: it surfaces them with the workflow's published state (keeping them visible to the public) so the workflow panel appears. New documents are unaffected.
- **Live/Draft badge missing on workflow collections.** The header publishing badge only rendered for collections without a workflow, and read the raw `status` field. It now derives from the workflow state when a workflow is present (a state flagged `published` shows "Live", otherwise "Draft"), so collections using `drafts: true` — including ones with no `status` field — show the correct badge.
