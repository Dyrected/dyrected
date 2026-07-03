# @dyrected/knowledge

The canonical, machine-readable Dyrected knowledge catalogue. It contains compiled recipes, plain-language intent metadata, search helpers, and portable JSON artifacts used by the documentation site and future AI integrations.

```ts
import { findRecipesByIntent, recipes } from "@dyrected/knowledge";

const matches = findRecipesByIntent("make the URL follow the title");
```

Portable artifacts include recipes, intent mappings, TypeScript/JSDoc references, endpoint manifests, a representative OpenAPI document, AI rules, `SKILL.md`, and an LLM index. They are exported from package subpaths such as `@dyrected/knowledge/recipes.json`, `@dyrected/knowledge/references.json`, and `@dyrected/knowledge/openapi.json`.

The package is presentation-neutral: Fumadocs, MCP servers, skills, websites, and CLIs decide how to render or expose its content.

Every named field in a canonical recipe must define an explicit `label`. The generator validates this rule and fails before producing documentation when a label is missing.

## Package Layout

The package is split into authored source material, generated TypeScript modules, and published artifacts.

### `src/prompt-templates/`

Authored Markdown templates that the generator expands into prompts and skills.

- `skill.template.md` -> final Dyrected `SKILL.md`
- `ai-rules.template.md` -> final AI rules document
- `generate-cms.template.md` -> existing-site CMS migration prompt
- `generate-site.template.md` -> greenfield site-generation prompt

Files in this folder are author-edited sources. The `.template.md` suffix means they are not final outputs.

### `src/shared-rules/`

Reusable authored rule blocks injected into multiple templates.

- `content-modeling.md` -> semantic modeling and content-structure rules
- `cms-generation.md` -> migration execution, admin authoring, validation, and batching rules
- `frontend-integration.md` -> frontend rendering and source-of-truth integration rules

Edit these when a rule should affect multiple prompts or the final skill.

### `src/prompt-snapshots/`

Generated Markdown snapshots of rendered prompts.

- `generate-cms.md`
- `generate-site.md`

These are build outputs committed for inspection and regression visibility. Do not hand-edit them.

### `src/test-fixtures/`

Local fixtures used by generator and tests.

- `maximal-config.ts`

### `src/generated/`

Generated TypeScript modules consumed by the package runtime.

- `ai.ts`
- `prompts.ts`
- `recipes.ts`
- `references.ts`

These are codegen outputs. Do not edit them manually.

### `src/recipes/`

Canonical Dyrected recipe implementations. Each recipe has its own folder with `metadata.json`, `recipe.ts`, and `recipe.test.ts`.

### `generated/`

Published package artifacts exposed through `package.json` exports, such as `SKILL.md`, `ai-rules.md`, recipe JSON, references JSON, and the LLM index.

Run `pnpm generate` to update committed artifacts and Fumadocs MDX. Run `pnpm generate:check` in CI to fail when generated output is stale.
