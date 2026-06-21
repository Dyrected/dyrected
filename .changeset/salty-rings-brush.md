---
"@dyrected/db-postgres": patch
"@dyrected/db-mongodb": patch
"@dyrected/knowledge": minor
"@dyrected/core": patch
"@dyrected/cli": patch
"@dyrected/sdk": patch
"@dyrected/docs": patch
---

@dyrected/knowledge — minor

Add @dyrected/knowledge package: compiled recipe library with behavioral tests, intent-indexed search, and a content generator that produces hybrid documentation pages (authored prose + generated TypeScript contracts in marked regions). Includes auto-slug, cross-field validation, dependent dropdown, owner-scoped access, role-based access, editorial workflow, page builder, upload collection, relationship/join, safe field rename, and conditional admin field recipes.

@dyrected/core — patch

Expand public type exports (CollectionConfig, GlobalConfig, Field, UploadConfig, workflow types) and extend the OpenAPI generator to include all auth, workflow, schema, and dynamic-option routes.

@dyrected/sdk — patch

Remove internal setup-prompt utility (superseded by CLI). Expand public API surface with fluent collection/global builders, authentication helpers, and complete TypeScript generics.

@dyrected/cli — minor

Add generate-ai-rules command. Extend init with framework/adapter detection. Add type generator and config templates.

@dyrected/db-postgres, @dyrected/db-mongodb — patch

Align adapter implementations with updated DatabaseAdapter contract (transactions, typed return shapes, ReadonlyDatabaseAdapter).

@dyrected/docs — patch

Rewrite reference, adapter, recipe, and guide pages as hybrid documents: authored mental models and examples preserved, TypeScript contracts generated into marked regions. Fix MDX region markers from HTML comments to JSX comments ({/\* \*/}) so fumadocs can compile them. Add check-contract.mjs validation: required heading manifests, authored word-count floor, and marker integrity checks.

skills/dyrected — patch

Restore full SKILL.md with schema migration procedure, access-control principles, intent-to-pattern table, and generated field/recipe inventories.
