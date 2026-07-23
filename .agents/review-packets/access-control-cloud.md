# Review summary

- Document: `apps/docs/content/docs/basics/access-control/cloud.mdx`
- Goal: Make Dyrected Cloud access control understandable for readers who need practical guidance, especially around Cloud-safe rule shapes and the difference between `createdByCurrentUser`, `isOwner`, and `isSelf`.
- Audience: Developers configuring access control for Dyrected Cloud projects.
- Scope: Cloud-only access-control behavior, synced serializable `accessPolicies`, built-in Cloud named policies, Cloud-safe examples, and policy-selection guidance. Not a full restatement of the general access-control model.

# Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
| `apps/docs/content/docs/basics/access-control/cloud.mdx` | Existing doc draft | Medium | Useful starting point, but too broad and not clear enough on policy selection. |
| `apps/docs/content/docs/basics/access-control/overview.mdx` | Existing canonical doc | High | Source for rule-shape framing and cross-link boundaries. |
| `apps/docs/PROMPT_TO_WRITE.md` | Internal doc-writing prompt | Medium | Used for structure and workflow expectations, not product facts. |
| `apps/docs/DOCS_PHILOSOPHY.md` | Internal style guidance | High | Source for task-oriented voice and page structure. |
| `dyrected-pro/apps/cloud/src/access-policies.ts` | Implementation code | High | Source of truth for built-in Cloud policy names, params, and default fields. |
| `dyrected-pro/apps/cloud/src/config.ts` | Implementation code | High | Confirms the Cloud backend registers `cloudAccessPolicies` at the root config. |
| `dyrected-pro/apps/cloud/src/routes/__tests__/config.test.ts` | Tests | High | Confirms current policy behavior and example outputs for built-in policies. |
| `packages/cli/src/commands/sync-schema.ts` | CLI implementation | High | Confirms schema sync sanitization and that function-based access rules are stripped. |
| `packages/core/src/utils/block-references.ts` | Core implementation | High | Confirms dynamic site `accessPolicies` now merge into the runtime request config. |
| `packages/core/src/utils/config.ts` | Core implementation | High | Confirms built-in `createdBy` system field exists when timestamps are enabled. |
| `packages/core/src/controllers/collection.controller.ts` | Core implementation | High | Confirms `createdBy` is populated from the authenticated user on create. |
| `https://payloadcms.com/docs/access-control/overview` | External comparison doc | Medium | Used for structure only, not wording or product facts. |
| `https://payloadcms.com/docs/access-control/collections` | External comparison doc | Medium | Used for heading flow and example density, not behavior claims. |

# Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
| Jexl vs built-in policy in Cloud | The page recommends Jexl as the default for field access when admin reactivity matters. | Supported by current sync/runtime behavior, but editorially this is a recommendation, not an engine invariant. | Docs/code owner |

# Placeholder sweep

No unresolved placeholders remain.

# Reviewer questions

1. Is the guidance around `createdByCurrentUser` vs `isOwner` the clearest framing for users, or do you want stronger wording around reassignment and business ownership?
2. Do we want to mention `timestamps: false` more explicitly in the `createdByCurrentUser` section, or is the current note enough?
3. Should we add a cross-link to this page from Cloud onboarding, deployment, or troubleshooting docs now that synced string/boolean `accessPolicies` are supported?

# Example consistency

- Primary scenario: choosing Cloud-safe access rules, including when synced string/boolean policies work and how to choose between `createdByCurrentUser`, `isOwner`, and `isSelf`.
- The draft uses short targeted examples rather than one giant end-to-end example because the page teaches decision-making across several rule shapes.
- Field names stay stable where comparison matters: `createdBy`, `owner`, `ownerId`, `customerId`, and `workspaceId`.
- No unexplained placeholders or substitutions remain.

# High-risk areas

- auth and permissions
- hosted-vs-self-hosted behavior differences
- synced policy portability boundaries
- policy naming and availability
- field semantics around `createdBy`, `owner`, and self records

# Dry-run check

Recommended before publication.

- Who should run it: someone who has not worked on Cloud access control recently
- Task: choose the correct policy for three cases: "own profile", "records I created", and "records I own"
- Success signal: they pick `isSelf`, `createdByCurrentUser`, and `isOwner` without asking follow-up questions

# Canonical links

- Keep general rule-shape explanation in `/docs/basics/access-control/overview`
- Keep collection-specific mechanics in `/docs/basics/access-control/collections`
- Keep field-specific admin behavior in `/docs/basics/access-control/fields`

# Holistic review

- The result is visible early: what works in Cloud, what syncs, and what is stripped.
- The most error-prone distinction, `createdByCurrentUser` vs `isOwner`, now has its own section and side-by-side example.
- The page is more task-oriented than the previous draft and should be easier to scan, but it still needs SME confirmation before being called final.

# Suggested status labels

- `ready-for-sme-review`
