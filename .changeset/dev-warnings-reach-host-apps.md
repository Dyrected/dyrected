---
"@dyrected/admin": patch
"@dyrected/nuxt": patch
---

The development warnings for custom components now actually appear in your app.

**For app developers**

- A custom component key that is not registered now shows a placeholder card and a console warning in development, as intended. The same applies to a registered component the schema never references, and to a custom view layout whose component key is missing, which now names the missing key in development.
- These were switched on by Vite's `import.meta.env.DEV`, which Vite fixes when the admin package is built, so in your app they were always off. They now follow your own `NODE_ENV` and are silent in production builds.
- The Nuxt `<DyrectedAdmin>` now accepts `warn-unused-components` and passes it through, so `:warn-unused-components="false"` works in Nuxt too.

**For integration authors**

- Do not use `import.meta.env.DEV` in code that ships in a library bundle and should follow the host's mode. The admin now has an internal `isDevelopment()` that reads `process.env.NODE_ENV`, which the host's bundler resolves.
