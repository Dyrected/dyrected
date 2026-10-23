---
"@dyrected/core": minor
"@dyrected/admin": minor
---

Explain metrics with `description`.

- `ViewMetric` and `ViewSubMetric` accept an optional `description`. Cards that have one show an info icon: a tooltip on hover (or keyboard focus) for mouse and trackpad users, and a bottom sheet on touch screens. The choice follows the input device, not the window width.
- Descriptions support `**bold**`, `*italic*`, `` `code` `` and `[links](https://…)`. Only `http`, `https` and `mailto` links are active, and everything is rendered as React elements, never HTML.
- Sub-metric descriptions are listed under the card's description in the same tooltip or sheet.
- `InfoHint` and `InlineMarkdown` are exported from `@dyrected/admin` and `@dyrected/admin/public` so custom React dashboard components can reuse the same behaviour.
