---
"@dyrected/core": patch
"dyrected": patch
---

Fix server-side field access evaluation so field rules receive the current document `id` during API reads and updates, matching admin behavior and preventing `!id`-style rules from silently allowing protected field changes.

Improve the public access-control type surface by allowing `AccessFunctionArgs`, `AccessFunction`, `AccessRule`, `AccessPolicyResolver`, `DyrectedConfig`, and `defineConfig` to carry a custom authenticated-user type for deployments that extend the default user claims.

Align the access-control overview docs with runtime behavior by documenting that field access is enforced by both the API and the admin panel.

I improved dyrected upgrade in packages/cli/src/commands/upgrade.t
It now:

- resolves the actual published version for each @dyrected/* package with `npm view <pkg> version`
- installs explicit versions instead of relying on @latest
- upgrades dependencies and devDependencies separately
- uses exact-version installs (--save-exact / --exact)
- verifies both package.json and node_modules after install
- fails loudly if the installed result is still stale
