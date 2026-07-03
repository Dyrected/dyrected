## Dyrected Content Modelling Rules

Apply the shared content-modeling and frontend-integration rules first.

This file adds the migration-specific execution stance: how to translate an approved editing plan into Dyrected safely, how to control editor freedom, and how to deliver the work in verifiable batches.

Translate the approved editing plan into appropriate Dyrected:

- Globals
- Collections
- Fields
- Blocks
- Validation rules
- Access controls
- Admin configuration

Do not revisit the approved plan by asking the user to choose between technical CMS concepts.

Do not ask the user to choose between:

- Collections
- Globals
- Blocks
- Field types
- Hooks
- Access rules
- Technical options
- Storage adapters
- Rich text formats
- Preview modes

If you need clarification, ask a plain-language question about the client experience only.

Good examples:

- "Should the client be able to permanently delete these items, or only hide them from the website?"
- "Should unpublished items disappear from the website?"
- "Should the client be able to create new pages?"
- "Should this section allow the client to select from existing services, or show all services automatically?"
- "Should the client be able to replace this image, or should it remain part of the design?"
- "Should editors be able to change the score values, or only the question wording and recommendations?"

Bad examples:

- "Should this be a collection or global?"
- "Should I use a blocks field?"
- "Should this be a relationship field?"
- "Should I create a hook?"
- "Should I use richText or text?"
- "Should I use an image field?"
- "Should I use previewMode token or postMessage?"

Use the shared rules as hard requirements for:

- Page/section/category decisions
- Hero as a block, not a top-level page field
- Variants and approved block types
- Live Preview
- Rich content
- Media and uploads
- `initialData`
- Frontend source-of-truth integration
- Caching and edit-to-frontend verification

In this migration workflow:

- Implement pages as a collection
- Implement page content as an ordered blocks field on the pages collection
- Implement approved reusable section types as blocks
- Use Dyrected block `variants` for approved section variants when supported
- Fall back to a normal select field for variants only when the installed package does not support block variants
- Do not create one fixed collection per page when reusable blocks are required
- Do not store flexible page sections as one global
- Do not collapse approved page sections back into one global, one collection, or one page object just because that is easier to code
- Do not allow arbitrary blocks, variants, or layouts that the existing frontend cannot render

If the approved plan includes repeatable business content:

- Use collections where the client can add or remove entries
- Keep display limits where needed to protect the existing design
- Allow hiding instead of deleting when deletion could break important flows
- Use ordering when the client reasonably needs control over order
- Connect collections to page sections when a section displays repeatable business content

If the approved plan includes content-driven interactive features:

- Model editable definitions in Dyrected
- Keep runtime behaviour in code
- Protect risky fields with validation, allowed options, limits, or admin-only access
- Do not store user submissions or private user history unless explicitly approved

---

## Admin Authoring Rule

Configure the Admin so editors see human-readable, safe controls rather than raw technical structures.

For every collection with a clear human-readable title or name field:

- Set `admin.useAsTitle` to that human-readable field
- Do not use `slug` as the primary display title unless no better field exists

For every collection and global, when supported by the installed package:

- Set human-readable `labels.singular` and `labels.plural`
- Set a valid `admin.icon`
- Set every field label to human-readable text

For routable collections:

- Apply the shared preview rules
- Use title/name for admin display
- Use `slug` only for routing and URL generation

---

## Access and Validation Rule

Create the smallest set of permissions and constraints needed for the approved editing plan.

Editors may access only the approved content.

Reserve technical controls for administrators.

Do not grant delete access unless the approved plan clearly allows deletion.

Do not grant publish access unless the approved plan clearly allows publishing.

If publishing is needed, prefer a draft/review workflow when supported.

If hiding content is enough, prefer hide/unhide over delete.

Enforce access server-side, not only by hiding controls in the UI.

Add validation and content limits only where they protect the existing design, data quality, or feature behaviour.

Examples:

- Required fields for content that must exist for the layout to work
- Maximum number of items when the design supports only a limited amount
- Required alt text where appropriate
- URL or email validation where the field type alone is not enough
- Allowed icon or variant values that match existing frontend support
- Required section variant when a block has multiple approved layouts
- Allowed section types based on the approved reusable section list
- Admin-only controls for risky fields that affect behaviour

Do not add unnecessary restrictions.

Do not allow editors to enter arbitrary values that the frontend cannot safely render.

If an icon, style, layout, or variant is needed, store a stable name and map it in code.

---

## Work in Batches

Group the approved content into batches of no more than three related content areas.

Complete each batch in order.

Base setup batch:

1. Install Dyrected packages and base configuration.
2. Add required environment variables.
3. Add the admin route and authentication.
4. Set administrator and editor access boundaries.
5. Set up Media/upload support if approved editable images exist.
6. Set up public site URL environment variable for preview if needed.
7. Set up frontend Dyrected fetching utilities or clients using supported APIs.
8. Run lint, type-check, test, and build.
9. Fix errors before continuing.

For each content batch:

1. Create no more than three related collections, globals, or block groups.
2. Add clear labels the client will understand.
3. Add helpful descriptions the client will understand.
4. Add `admin.useAsTitle` for collections with human-readable title/name fields.
5. Add preview configuration for routable collections when supported.
6. Add validation and limits only where they protect the existing design, data quality, or feature behaviour.
7. Add documented hooks only when needed for approved client-visible behaviour.
8. Add `initialData` for existing approved content.
9. Connect those content areas to the existing UI without redesigning it.
10. Replace matching local runtime data sources while preserving sensible fallback content during testing.
11. Add adapters or normalizers where CMS shapes differ from existing UI expectations.
12. Add loading, empty, and error handling where needed.
13. Confirm private credentials are not exposed to browser code.
14. Run lint, type-check, test, and build.
15. Verify one CMS edit appears on the frontend for that batch.
16. Fix the batch before moving to the next one.

If a batch fails verification, stop adding new content types.

Diagnose and fix that batch first.

Do not continue stacking changes on top of a broken batch.
