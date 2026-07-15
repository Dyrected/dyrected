# Review Packet: Knowledge Recipe Metadata Refresh

## Document purpose

Improve the structured recipe output in `@dyrected/knowledge` without changing the public docs IA. The goal is to make generated recipe artifacts more problem-first and more useful in machine-facing surfaces such as `llms-index.json`, `recipes.json`, `SKILL.md`, and `ai-rules.md`.

## Source inventory

- `packages/knowledge/src/recipes/*/metadata.json`
  Why it matters: source of the human-authored recipe metadata.
  Trust: high.
- `packages/knowledge/src/recipes/*/recipe.ts`
  Why it matters: canonical validated code snippets behind the recipes.
  Trust: high.
- `packages/knowledge/scripts/generate.mjs`
  Why it matters: controls how metadata becomes generated artifacts.
  Trust: high.
- `packages/knowledge/src/types.ts`
  Why it matters: public structured contract for recipe consumers.
  Trust: high.
- Existing docs pages under `/docs/ecosystem/common-patterns/` and linked canonical pages.
  Why it matters: target destinations for the better structured output.
  Trust: high.

## Uncertainty register

- Whether `description` should stay in the public recipe contract long term now that `problem` and `summary` exist.
- Whether `canonicalDocs` should always include the common-patterns page first or only deeper canonical docs.
- Whether `snippetStatus` should stay a fixed `validated` value or become a richer enum later.

## High-risk claims to verify

- The new `problem` and `summary` wording is the right tone for machine-facing outputs.
- The chosen `canonicalDocs` arrays point to the most useful full-explanation pages.
- External consumers of `llms-index.json` and `recipes.json` can tolerate the added fields.

## Specific review questions

- Do the new recipe summaries feel more useful than the old description-only shape?
- Should any recipe have a different primary docs destination in `canonicalDocs`?
- Do we want future generated surfaces to suppress `description` and prefer `summary` everywhere?

## Status

Draft ready for review. No human verification has happened yet.
