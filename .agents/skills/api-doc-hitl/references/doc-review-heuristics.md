# Documentation Review Heuristics

Use this guide for holistic page reviews, section reviews, or broad doc-set reviews.

## Reader confidence

Check whether the documentation helps the reader feel oriented and capable:

- does the page quickly explain what the feature or task is for
- does it surface the expected result early
- does it make prerequisites visible before the reader fails later
- does it move from task to explanation in a useful order

## Information ordering

Review the shape of the page, not just sentence quality:

- is the most important task or concept near the top
- are setup, prerequisites, and limits introduced before dependent steps
- are edge cases and warnings placed where the reader needs them
- do related pages form a sensible sequence

## Discoverability and navigation

Check whether readers can find the right page and move through the docs:

- are titles and headings direct and specific
- do navigation labels match the words readers would search for
- are cross-links used where readers naturally need the next step
- is duplicated explanation replaced by a canonical page where possible

## Version and availability clarity

For product, API, and release documentation, verify:

- whether the content applies to all versions or a specific version
- whether feature availability, plan limits, or environment limits are visible
- whether deprecations, migrations, and replacements are easy to spot

## Examples and snippets

Check examples as part of the review:

- does one primary scenario stay consistent through the guide
- are code snippets minimal enough to explain the main idea
- are dependencies, setup assumptions, and substitutions clear
- are auxiliary steps separated from the main task

## Asset freshness

Review screenshots, diagrams, and UI references:

- are screenshots current
- do diagrams match the actual workflow
- do captions explain what the reader should notice
- are missing visuals explicitly tracked instead of silently omitted

## Improvement questions

Use these questions during review:

1. What is working well that we should do more of?
2. What is confusing, fragile, outdated, or buried?
3. Where would a new reader likely hesitate or take the wrong next step?
4. What should be moved, cut, linked out, or expanded?
