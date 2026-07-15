# Review Packet: Ecosystem Common Patterns

## Document purpose

Add a narrow public home for Dyrected recipes under `/docs/ecosystem/common-patterns/` with a specific role:

- problem-first discovery
- short pattern summaries
- links to canonical docs
- no full duplicate explanations

## Source inventory

- `apps/docs/DOCS_PHILOSOPHY.md`
  Why it matters: defines the task-oriented, prose-first writing style.
  Trust: high.
- `packages/knowledge/src/generated/recipes.ts`
  Why it matters: source of the current pattern titles, descriptions, categories, and validated recipe inventory.
  Trust: high.
- `apps/docs/content/docs/ecosystem/examples/*.mdx`
  Why it matters: establishes the lightweight docs tone already used for the examples section.
  Trust: medium.
- User direction in this thread
  Why it matters: defines the desired purpose and constraints for common patterns.
  Trust: high for product direction.

## Uncertainty register

- Whether each pattern should eventually get its own dedicated public page instead of staying grouped by category.
- Whether validated snippet status should become a visible UI affordance later.
- Whether pattern summaries should eventually be partly generated from `@dyrected/knowledge` instead of remaining authored MDX.

## High-risk claims to verify

- The category grouping is the right public shape for the current 11 recipes.
- The canonical docs links are the correct “full explanation” destinations for each pattern.
- `ecosystem/common-patterns` is the right long-term public label for this section.

## Specific review questions

- Does the section feel clearly different from both examples and canonical feature docs?
- Are the summaries concise enough to stay useful without becoming duplicate documentation?
- Should any pattern move to a different category before this becomes the long-term public structure?

## Status

Draft ready for review. No human verification has happened yet.
