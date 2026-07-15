---
"@dyrected/core": patch
"@dyrected/knowledge": patch
---

Add `definePublishingWorkflow` to map your own role names onto the publishing workflow

`publishingWorkflow()` hardcoded the role names `editor`, `publisher`, and `admin`, so a project whose roles are named differently (e.g. `writer`, `managing-editor`) got no capabilities and couldn't move documents through the flow.

`definePublishingWorkflow({ editors, publishers })` builds the same `draft → in review → published` workflow but maps *your* role values onto its two capability tiers — `editors` may edit and submit, `publishers` may also publish and unpublish. `publishingWorkflow()` is now a shorthand for `definePublishingWorkflow()` with the conventional defaults, so existing usage is unchanged.

```ts
workflow: definePublishingWorkflow({
  editors: ["writer"],
  publishers: ["managing-editor", "admin"],
})
```
