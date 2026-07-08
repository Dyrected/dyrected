---
"@dyrected/core": minor
---

Fix server-side field access evaluation so field rules receive the current document `id` during API reads and updates, matching admin behavior and preventing `!id`-style rules from silently allowing protected field changes.

Improve the public access-control type surface by allowing `AccessFunctionArgs`, `AccessFunction`, `AccessRule`, `AccessPolicyResolver`, `DyrectedConfig`, and `defineConfig` to carry a custom authenticated-user type for deployments that extend the default user claims.

Align the access-control overview docs with runtime behavior by documenting that field access is enforced by both the API and the admin panel.
