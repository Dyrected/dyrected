---
"@dyrected/core": minor
"@dyrected/admin": minor
"@dyrected/sdk": minor
"@dyrected/nuxt": minor
---

White-label the admin and enforce role menus.

**Behaviour changes to know about**

- The admin no longer adds `- Dyrected` to the browser tab title. The suffix is now `meta.titleSuffix` if set, otherwise `- <app name>`, otherwise nothing. Projects that set `titleSuffix` or `branding.logoText` see no change.
- Transactional emails, the API docs page, the OpenAPI title and the AI assistant no longer name "Dyrected" when no app name is configured. Set `admin.branding.appName` to name your product.
- Cached navigation preferences are now kept per signed-in user and cleared on sign-out. Previously one user's layout could appear for the next user on the same browser, including items they should not see.
- A `null` response from the preferences endpoint now resets to the default instead of keeping a stale local copy.

**New**

- `admin.branding.appName`, `logoDark`, `logoAlt`, `hidePoweredBy`; `admin.features.systemInfo` / `setupPrompt`; `admin.links.docs`; `admin.strings` for sign-in and storage copy. New helpers `resolveAppName`, `resolveTitleSuffix` and `resolveAdminString` in `@dyrected/core`.
- Sign-in, first-user and single sign-on screens show the configured logo and app name, and the title and favicon apply before login.
- Role menus: administrators can design and enforce the sidebar for a role (`admin:navigation-policy`, role scope), and preview any role with `GET /api/admin/navigation?asRole=<role>` (`client.getNavigation({ asRole, raw })`). Menus only narrow `access`, never grant it. Personal layouts cannot add items to an enforced menu.
- "Role Default" now takes effect: the sidebar reads personal, then role, then global, and publishing a role or global default strips the publisher's pins and own items.
- `silent` option for `@dyrected/nuxt` to skip the dev-server URL banner.
- The version lookup only runs for administrators when `features.systemInfo` is on.
