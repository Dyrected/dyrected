---
"@dyrected/admin": patch
"@dyrected/react": patch
"@dyrected/vue": patch
"@dyrected/next": patch
"@dyrected/nuxt": patch
---

Add controlled theme props to `DyrectedAdmin` across the admin and framework wrappers:

- `theme` sets the preferred admin theme to `system`, `light`, or `dark`.
- `systemTheme` supplies the currently resolved system theme for React and Next hosts.
- `onThemeChange` lets embedded admin theme controls update host-managed theme state in React and Next.
- Nuxt and Vue wrappers expose the same controlled theme surface through `theme`, `system-theme`, and `on-theme-change`.

This makes it possible for host apps to keep one shared dark and light mode preference while the embedded admin stays in sync.
