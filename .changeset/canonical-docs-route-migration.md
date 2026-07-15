---
"@dyrected/core": patch
"@dyrected/knowledge": patch
---

Point package-distributed documentation references at the canonical `/docs` tree

The docs site no longer maintains a separate `/new-docs` content tree and route. The new authored docs set now lives directly under the canonical `/docs` path, and the knowledge generator, published references, and package JSDoc links were updated to match.

For `@dyrected/core`, this updates JSDoc `@see` links so generated API references and editor tooling point at the current docs URLs instead of the removed `/new-docs` paths.

For `@dyrected/knowledge`, this refreshes generated references, prompt artifacts, LLM indexes, and skill outputs so published knowledge bundles link to the canonical docs paths and no longer depend on removed legacy recipe/reference pages.
