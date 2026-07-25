# Dyrected AI Rules

This file combines one shared integration contract, focused implementation
rules, generated package facts, and behavior-tested recipes.

## Existing Project Integration Contract

<!-- GENERATED:INTEGRATION_CONTRACT:START -->
<!-- GENERATED:INTEGRATION_CONTRACT:END -->

## API and Security Invariants

- Import public APIs from `@dyrected/core`, `@dyrected/sdk`, and the documented
  framework package. Never import another workspace package's source files.
- Verify the installed package's public exports before writing configuration.
- Every named field has an explicit human-readable `label`.
- Use the dedicated installed `define[FieldName]Field` helper for each field.
- Use `client.collection('slug')`, never `client.collections`.
- Do not define `email` or `password` fields on an `auth: true` collection.
- Do not wrap Dyrected Admin routes in unsupported custom authentication.
- Use server hooks for correctness. Admin hooks may improve feedback but cannot
  be the only enforcement layer.
- Enforce access and validation on the server. Admin visibility is not
  authorization.
- Use serializable Jexl conditions, hooks, access rules, and preview expressions
  when configuration must synchronize with Dyrected Cloud.
- Keep API keys, database credentials, encryption keys, and storage credentials
  out of browser code.
- Use `relationship` for a stored owning reference and `join` for a virtual
  reverse lookup.
- Use `depth: 0` for lightweight lists and increase depth only when the view
  needs populated relationships.
- Use a documented publishing workflow when the requirement is draft, review,
  and publication.

## Rename a field safely

The current `name` is the new key and `renameTo` is the previous stored key:

```ts
defineTextField({
  name: "fullName",
  label: "Full name",
  renameTo: "name",
  defaultValue: "",
});
```

Keep `renameTo` until stored documents have been migrated and verified. Test
relational or promoted-field changes in a safe environment before production
synchronization.

## Content Modeling

<!-- GENERATED:MODELING_RULES:START -->
<!-- GENERATED:MODELING_RULES:END -->

## CMS Configuration and Migration

<!-- GENERATED:CMS_GENERATION_RULES:START -->
<!-- GENERATED:CMS_GENERATION_RULES:END -->

## Frontend Integration

<!-- GENERATED:FRONTEND_RULES:START -->
<!-- GENERATED:FRONTEND_RULES:END -->

## Supported Field Types

<!-- GENERATED:FIELD_TYPES:START -->
<!-- GENERATED:FIELD_TYPES:END -->

## Compiled Recipes

<!-- GENERATED:RECIPES:START -->
<!-- GENERATED:RECIPES:END -->

## Intent-to-Pattern Index

<!-- GENERATED:INTENTS:START -->
<!-- GENERATED:INTENTS:END -->

## Canonical References

<!-- GENERATED:REFERENCES:START -->
<!-- GENERATED:REFERENCES:END -->

## Completion Check

Run generation, schema validation, lint, type checking, focused tests, and the
production build. Confirm generated artifacts are current, stored data remains
compatible, access is server-enforced, and one real edit reaches the intended
frontend route.
