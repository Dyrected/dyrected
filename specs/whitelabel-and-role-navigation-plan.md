# White-label and role-navigation plan

Source: `specs/feedback/whitelabel-feedback.md`. Ships as one release (single changeset set, minor bump across `core`, `admin`, `nuxt`, `next`, `vue`).

Line numbers in the feedback point at `dist`. Every item below must be re-located in `src` before editing.

## Decisions

1. **Role menus are enforced policy.** When an admin has designed a menu for a role, users in that role get that menu only. Personal preferences cannot add, restore or unhide anything the role policy removed.
2. **Policy restricts, it never grants.** The final menu is `serverTree ∩ access ∩ rolePolicy`. A role layout cannot expose an item the user's `access` denies. Hiding a menu item is not an API permission; collection and global access stays in `access`.
3. **One app-name source.** `branding.appName` resolved by a single `resolveAppName()` in `@dyrected/core`. `logoText` and `meta.titleSuffix` remain as deprecated fallbacks inside that helper only.
4. **One release.** The removal of the `- Dyrected` default title suffix goes into the changeset as a behaviour change with a migration note.

## Workstream A: navigation correctness (section 7)

Files: `packages/admin/src/hooks/use-preferences.ts`, `packages/core/src/utils/navigation-reconciler.ts`, `packages/core/src/router.ts`, `packages/admin/src/components/layout/admin-shell.tsx`, `packages/admin/src/components/navigation/navigation-customizer.tsx`.

1. Scope the localStorage key by auth collection and user id: `dyrected_pref_<collection>_<userId>_<scope>[_role]_<key>`. Guard against a missing user (use a neutral key, never another user's). Clear `dyrected_pref_*` in `clearPersistedAuthState` as well, and migrate or ignore legacy unscoped keys.
2. A `null` server value is authoritative. Reset to the default and drop the local copy.
3. `reconcileNavigation` applies preferences only to items already in the server tree (reorder, hide, rename, group). It never creates items. Re-check item-level `access` on every item.
4. The sidebar and the customizer read through one fallback chain: personal, then role, then global. Fix `handlePublishForRole` so the scope it writes is the one the sidebar reads. It publishes a sanitised layout (order, hidden, groups), never the publisher's added items.
5. Tests: user A to user B on the same browser, a stale pref referencing an item the server did not return, `null` server response, role-scope read.

## Workstream B: role menu policy (section 8)

Spec detail to settle in implementation: storage location (a core system collection or a document under existing preferences with `scope: "role"`). Prefer reusing the existing role-scope preference storage and adding an `enforced` flag, over a new collection.

1. Data model: `{ role, layout: { order, groups, hidden }, locked: true }`. `locked` means enforced.
2. Server: `GET /api/admin/navigation` and the badges endpoint apply the role policy after access pruning, for every role the user holds (union of allowed items when a user has several roles; document this rule). Personal prefs are applied only inside what the policy allows. Locked items cannot be restored by personal prefs.
3. `GET /api/admin/navigation?asRole=<role>`: admin-only, read-only, runs the same checker with a synthetic user carrying that role. Rejects non-admins with 403.
4. Customizer UI: admin-only role picker, "view as role" read-only preview next to the admin's own, and a role layout editor (order, groups, hidden, lock) that saves the role policy directly instead of copying the admin's personal layout.
5. Config surface: allow declaring a role layout in `dyrected.config.ts` as a codebase default; a saved policy overrides it. Wire into `packages/cli/src/commands/nav.ts` if the nav serializer should round-trip it.
6. Tests: enforced role cannot see removed items via personal prefs, `asRole` auth, multi-role union, policy never grants beyond `access`.

## Workstream C: white-label core (sections 1, 3, 4)

1. `resolveAppName(config)` in core, order `branding.appName`, `branding.logoText`, stripped `meta.titleSuffix`, then empty. Normalise the `- ` / em-dash suffix handling in this one place. Export the types.
2. Title: remove the `- Dyrected` fallback in `document-meta.tsx` and the page-route effect. `DocumentMeta` is the single owner; pages publish their label through context. Do not write `document.title` until schemas are loaded. Restore the title safely on unmount.
3. Consumers: `ai.service.ts` project name, email `siteName` defaults, API docs page `<title>`, sidebar logo `alt` all use `resolveAppName`. The "Dyrected" literal appears only when the host sets it.
4. Add the config types to `packages/core/src/types/admin.ts` with full TSDoc: `branding.appName`, `branding.logoDark`, `branding.logoAlt`, `branding.hidePoweredBy`.

## Workstream D: pre-login branding and auth screens (section 2a)

1. Branding available before auth: inline an allowlisted branding object (appName, logo, logoDark, logoMark, logoText, colours, favicon, titleSuffix) through `DyrectedAdmin` props and the Nuxt and Next integrations' runtime config. Add `GET /api/admin/branding` as the fallback for plain embeds. The endpoint returns only the allowlist, never the full `admin` config.
2. Login, forgot and reset password, accept invite, first-user setup and external sign-in render the configured logo (resolution order `logo`, `logoMark`, `logoText`, Dyrected mark only when none set, dark variant, real `alt`).
3. Configurable auth heading and subtitle, `hidePoweredBy` removes the footer.
4. Mount the title and favicon handling on the auth routes too.

## Workstream E: hide switches and strings (sections 2, 6)

1. Flags: `admin.features.systemInfo`, `admin.features.setupPrompt`, `admin.links.docs` (string or `false`). The System Info and Updates panel is also limited to admin-role users by default.
2. Replace product-name literals in user-facing strings with the resolved app name or neutral wording (activation text, media storage errors, setup screen, AI setup prompt).
3. `admin.strings`: a typed, documented key map covering only the user-facing copy from section 2. Not a general i18n system.
4. Developer console warnings and the Nuxt dev start-up log stay.

## Out of scope

- Renaming `localStorage` keys or `dyrected:*` events (hosts depend on them). Document them as public API in the docs instead.
- Treating menu hiding as API denial.

## Docs and release

- Docs under `apps/docs` follow `DOCS_PHILOSOPHY.md` and the `/api-doc-hitl` skill, with Next.js and Nuxt tabs for every example (Nuxt cookie is `dyrected_token_<slug>`).
- Document: white-labelling guide, `appName` and migration note for the removed title default, role menu policy and "view as role", and the new config types.
- Changesets per package, no Co-Authored-By trailers on commits.

## Suggested order

A (leak fix, unblocks B) then C, then D, then E, with B built on top of A. Land each as its own commit on one release branch; verify with `pnpm` type-check and the admin and core test suites, then run the admin app in the browser for the auth screens, title and sidebar behaviour.
