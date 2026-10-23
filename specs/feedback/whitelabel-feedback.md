# Dyrected: white-label gaps in the Admin UI

Feedback for the Dyrected maintainers. Observed on `@dyrected/admin` 2.24.1 / `@dyrected/core` 2.24.x / `@dyrected/nuxt` 2.24.x,
embedded in a Nuxt app (`adminPath: 'admin'`) with `admin.branding` configured. Line numbers refer to `@dyrected/admin/dist`.

**Summary:** even with `branding.logoMark`, colours, fonts and favicon set, "Dyrected" still appears in the browser tab
title, the login and first-user screens, the dashboard, error/help text, emails and the API docs page. There is no single
setting for "the app's name", so each place has its own fallback to "Dyrected".

## 1. Browser tab title shows "Dyrected" instead of the configured app name (main bug)

Two independent code paths write `document.title`, and both hard-code `"- Dyrected"` as the fallback suffix:

| Location | Code |
| --- | --- |
| `index.mjs:38287` (`DocumentMeta`) | `const titleSuffix = admin?.meta?.titleSuffix ?? "- Dyrected";` |
| `use-page-route-*.js:76426` | `const suffix = schemas?.admin?.meta?.titleSuffix ?? "- Dyrected";` |

Why it appears "sometimes":

1. **Config not set:** the host never set `admin.meta.titleSuffix`, so every page ends in "- Dyrected". Nothing tells the
   integrator that this default exists or that `branding.logoText` is ignored for the title.
2. **Schemas not loaded yet:** `schemas?.admin` is `undefined` until the schema request resolves, so the `??` fallback
   runs and the title briefly (or, on a slow or failed request, persistently) reads "... - Dyrected" even when the host
   configured a suffix.
3. **Two writers race:** `DocumentMeta` and the page-route effect both assign `document.title` with their own
   copy of the logic, so the last one to run wins.
4. **Restore on unmount:** `DocumentMeta` restores the title captured at mount, which can be the pre-hydration title.

### Suggested fix

- Remove the `"- Dyrected"` default. Use an empty suffix, or derive it from the host's config:
  `titleSuffix ?? (branding.logoText ? `- ${branding.logoText}` : '')`.
- Do not write `document.title` until `schemas` has loaded (`if (!schemas) return;`), so the default can never flash.
- Keep a single owner for the title. Let `DocumentMeta` own it and have pages only publish their label (via context)
  instead of assigning `document.title` themselves.
- Add one explicit name setting (see section 3) and use it as the source for the title.

## 2. Hard-coded "Dyrected" strings in the admin UI

| Where | Text | Location |
| --- | --- | --- |
| Sidebar, when no `logoText` / `logo` / `logoMark` | logo `alt="Dyrected"` plus a bundled Dyrected SVG | `index.mjs:8252, 8256` |
| Sidebar, expanded, no `logoText` | text from `titleSuffix.replace(/^- /, "")` (so the suffix also acts as the app name) | `index.mjs:8261` |
| Login / auth footer | `Dyrected CMS` | `index.mjs:38780` |
| First-user setup footer | link to `dyrected.com?utm_source=admin...` labelled `Dyrected CMS` | `index.mjs:38906-38907` |
| Account activation | `Create your password to activate your Dyrected account` | `index.mjs:38503` |
| Setup screen | heading `Set up Dyrected`, `Dyrected setup prompt`, AI prompt that starts `You are setting up Dyrected...` | `index.mjs:38104, 38130, 37966` |
| System info panel | `System Info & Updates`, `Update available!` linking to the Dyrected GitHub CHANGELOG, `npx dyrected upgrade` | `index.mjs:38040-38088` |
| Help / docs links | `https://docs.dyrected.com`, `https://www.dyrected.com/guide` | `index.mjs:37970, 37999` |
| Error text shown to editors | `...configure a media storage provider in Dyrected.` | `index.mjs:9155`, `use-page-route-*.js:56005, 68893, 68914` |
| Console warnings | `[Dyrected Admin] Component "..." is registered...` (fine for developers, but worth noting) | `index.mjs:3185` |

Editors of a white-labelled product should not see the name of the underlying CMS, and links to Dyrected's
upgrade and changelog pages are noise (or confusing) for them.

### Suggested fix

- Replace product-name literals in user-facing strings with a resolved `appName` (see section 3), e.g.
  `Create your password to activate your ${appName} account`; use neutral wording where no name is configured
  ("the CMS", "your administrator").
- Make the footer ("Dyrected CMS"), the System Info & Updates panel, the setup/"generate CMS prompt" screen, and the docs
  links individually hideable: `admin.branding.hidePoweredBy`, `admin.features.systemInfo: false`,
  `admin.features.setupPrompt: false`, and `admin.links.docs` (or `false`).
- Show the update/upgrade panel only to users with a developer or "superadmin" role, not to every admin.
- Replace the default sidebar logo `alt` with the app name.

## 2a. Auth screens ignore branding entirely (logo missing)

`LoginPage` (`index.mjs:38328`), `FirstUserPage` (`:38788`) and `ExternalLoginPage` (`:38917`) render only text: a heading
(`Welcome back`, `Sign in`, `Reset Password`), a form, and the `Dyrected CMS` footer. They contain no `<img>`, no
`logoText`, and do not read `admin.branding` at all. The configured `logo` / `logoMark` / `logoText` appear in the sidebar
only, so a white-labelled admin shows no logo or app name on the first screen users see, and the only brand on it is
Dyrected's.

### Suggested fix

- **Show the configured logo on every auth screen** (sign in, forgot/reset password, accept invite, first-user setup,
  external/SSO sign-in), above the heading. Use the same resolution order as the sidebar: `branding.logo`, then
  `logoMark`, then `logoText`; fall back to the Dyrected mark only when none is set. Respect dark mode (e.g. an optional
  `branding.logoDark`) and give the image a real `alt` (the app name).
- **Make branding available before login.** The auth screens render before the user is authenticated, and branding currently
  comes from the schemas payload (`schemas.admin.branding`), which may require a session. Either serve a small public
  branding endpoint (`GET /api/admin/branding`: logo, logoText, appName, colours, favicon, titleSuffix) or inline branding
  into the `DyrectedAdmin` props / the Nuxt module's runtime config, so login pages and the tab title are branded from the first paint.
- Let the host customise the auth copy (heading and subtitle) and remove the footer, e.g. `branding.hidePoweredBy`.
- Apply the same title/favicon handling to auth pages: `DocumentMeta` is mounted inside the authenticated app, so the login
  screen keeps the host page's title and the default favicon.

## 3. Add one `appName` (white-label) setting

Today the app's name is inferred in different ways by different features:

| Consumer | Source today | Fallback |
| --- | --- | --- |
| Tab title | `admin.meta.titleSuffix` | `"- Dyrected"` |
| Sidebar text | `branding.logoText`, else `titleSuffix` (stripped of `- `) | empty |
| AI agent project name (`core/dist/server.js:14351`) | `titleSuffix.replace(/^- /, "")` | `"Dyrected Project"` |
| Email `siteName` (`server.js:18019, 18646`) | `branding.logoText` | `"Dyrected"` |
| API docs page `<title>` (`server.js:16831`) | none | `"Dyrected API Documentation"` |

Proposal: `admin.branding.appName` (or top-level `name`), with every consumer above resolving the name as
`appName ?? logoText ?? (titleSuffix stripped) ?? ''`, and the "Dyrected" literal only used if the host opts in.
Also make the suffix format consistent: some consumers strip a leading `"- "` and others don't, so `"— Alajo Admin"`
behaves differently depending on who reads it.

## 4. Server-rendered pages

- API documentation page (`server.js:16831`) has `<title>Dyrected API Documentation</title>`; it should use the app name.
- Email templates default `siteName` to "Dyrected"; the host can override the email content, but the default is
  surprising for transactional mail sent under the host's brand.
- The Nuxt module prints `Dyrected admin: <url>` at dev start-up (`nuxt/dist/module.mjs:323`). Harmless, but could be
  quieter behind a `silent` option.

## 5. Browser storage and event names (low priority)

`localStorage` keys (`dyrected_token`, `dyrected_url`, `dyrected_key`, `dyrected_latest_release`...) and DOM events
(`dyrected:*`) are visible in devtools. Not user-facing, but host apps end up depending on these names (we read
`dyrected_token___admins` directly from a custom component). Consider documenting them as public API, or exposing
`useDyrectedToken()` so hosts don't have to read storage.

## 6. Branding config gaps

- `branding.logo` / `logoMark`: when only `logoMark` is set, the expanded sidebar uses it as the full logo. That works,
  but a square mark next to an empty text slot looks unfinished. A `logoAlt` option would also help accessibility.
- The login screen has no logo or name slot at all (see 2a).
- Host CSS overrides (`.dy-admin-ui { --primary: ... }`) work, but text can only be changed by patching the package.
  An optional `admin.i18n` / `admin.strings` override map for the user-facing copy listed in section 2 would make
  white-labelling possible without forks.

## 7. Navigation preferences leak between users (functional bug, not branding)

Observed: an `external` user sometimes sees menu items they should not (the normal dashboard plus other entries instead of
only Customer Search and FSDH Follow-up). A refresh often shows the correct menu. Saving a layout "for role" does not help.

Findings (`@dyrected/admin` 2.24.1, `@dyrected/core` 2.24.1):

1. The server builds the tree per user and prunes by access (`GET /api/admin/navigation`, `createNavAccessChecker`), so the
   source tree is correct. The extra items are added on the client.
2. `usePreference` stores the value in `localStorage` under `dyrected_pref_${scope}_${key}`, e.g.
   `dyrected_pref_personal_admin:navigation`. **The key has no user id**, and the initial state reads it synchronously.
   Logout (`clearPersistedAuthState`) removes only the token keys, not these. The next user on the same browser starts
   from the previous user's navigation preference.
3. The server value only replaces it when the response is non-null
   (`if (result.value === null ...) return;`). A user with no saved preference therefore keeps the stale local one.
4. `reconcileNavigation` (`smartphone-*.js:2416`) **creates** sidebar items from `prefs.items` even when they are not in the
   server tree. The sidebar's visibility filter (`SidebarInner`) only checks read access for `collection` and `global`
   items; workspaces, pages and custom items return `true`. Item-level `access` from the tree is not re-applied to
   items injected from preferences.
5. Sidebar and customizer read the preference with the default `personal` scope. "Publish for role"
   (`handlePublishForRole`) writes `scope: "role"`, which the sidebar never reads, so it has no effect on what users see.
   It also publishes the publisher's whole preference object, including any items they added.

Suggested fixes:

- Include the user id (and auth collection) in the `localStorage` key, or clear `dyrected_pref_*` on logout and on user change.
- Treat a `null` server response as authoritative: reset to the default instead of keeping a local value from another session.
- In `reconcileNavigation`, only apply preferences to items that exist in the server tree (reorder / hide / rename). Never
  add items the server did not return, and re-check `access` on every item that comes from preferences.
- Make the sidebar read through the same fallback the server already supports (personal, then role, then global) so
  "publish for role" works, and publish only a sanitised layout (order, hidden, groups).

## 8. Feature request: admin-controlled menus per role, with "view as role"

Requirement: an admin can see the menu each role actually gets, and when an admin hides an item for a role, users in that
role cannot bring it back or choose to show it.

Gaps today:

- The only admin tool is "Publish for role" (`handlePublishForRole`), which saves the publisher's own layout as a
  suggested default under `scope: "role"`. It is never read by the sidebar (see section 7), and it is advisory: a user's
  personal preference overrides it, and personal preferences can add items (`reconcileNavigation`).
- There is no way to preview what a given role sees, so an admin cannot check a role's menu without signing in as that role.
- Hiding is a per-user preference, not a permission, so it is not enforced anywhere on the server.

Proposal:

1. **Separate enforced from preferred.** Role-level `hidden` / `locked` entries are policy: the server removes those
   items from `GET /api/admin/navigation` for that role, and the client ignores any personal preference that
   references them. Personal preferences may then only reorder, rename, or hide items the server already returned.
2. **"View as role" in the navigation customizer.** A role picker (admin only) that fetches the navigation as that role
   (`GET /api/admin/navigation?asRole=external`, authorised for admins) and renders it read-only, next to the admin's own.
3. **Role layout editor.** Edit a role's layout directly (order, groups, hidden / locked flags) and store it as the role
   policy, instead of copying the admin's personal layout.
4. **Server-side enforcement.** Hidden items must also be rejected at the API level for that role (access rules), not
   only removed from the sidebar, since the menu alone is not a security boundary.
5. **Stop persisting items the user did not receive** (section 7), otherwise a locked item could still be re-added from a
   saved preference.

Workaround today: controlling visibility with `access` on navigation items and workspaces in `dyrected.config.ts`
(e.g. `access: isExternal`) is enforced by the server and cannot be overridden by users. Use that rather than role
preferences, and avoid saving personal layouts for restricted roles.

## Priority

1. Remove the `"- Dyrected"` fallback and the schema-not-loaded flash (section 1). Small change, fixes the visible bug.
2. Show the configured logo and app name on all auth screens, with branding available pre-login (section 2a).
3. Introduce `appName` and route the title, sidebar, agent, email and API docs through it (section 3).
4. Add hide/override switches for the footer, System Info panel, setup screen and docs links (section 2).
5. Strings override map for everything else (section 6).

## Workaround in the host app until fixed

In `dyrected.config.ts`:

```ts
admin: {
  branding: { logoText: 'Alajo', /* ... */ },
  meta: { titleSuffix: '— Alajo Admin' },
}
```

This removes the default once schemas have loaded. It does not hide the strings in section 2.
