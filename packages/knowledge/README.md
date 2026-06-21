# @dyrected/knowledge

The canonical, machine-readable Dyrected knowledge catalogue. It contains compiled recipes, plain-language intent metadata, search helpers, and portable JSON artifacts used by the documentation site and future AI integrations.

```ts
import { findRecipesByIntent, recipes } from "@dyrected/knowledge";

const matches = findRecipesByIntent("make the URL follow the title");
```

Portable artifacts include recipes, intent mappings, TypeScript/JSDoc references, endpoint manifests, a representative OpenAPI document, AI rules, `SKILL.md`, and an LLM index. They are exported from package subpaths such as `@dyrected/knowledge/recipes.json`, `@dyrected/knowledge/references.json`, and `@dyrected/knowledge/openapi.json`.

The package is presentation-neutral: Fumadocs, MCP servers, skills, websites, and CLIs decide how to render or expose its content.

Every named field in a canonical recipe must define an explicit `label`. The generator validates this rule and fails before producing documentation when a label is missing.

Run `pnpm generate` to update committed artifacts and Fumadocs MDX. Run `pnpm generate:check` in CI to fail when generated output is stale.
