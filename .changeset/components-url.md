---
"@dyrected/admin": minor
"@dyrected/core": minor
"@dyrected/vue": minor
"dyrected": minor
---

The admin can now load your custom components from a URL, so a host that cannot import them at build time (such as the Cloud-hosted admin) still shows your custom fields, forms, pages and slots.

**For app developers**

- **Build the components.** Put your registry (`defineAdminComponents({...})`) in `dyrected.components.ts` next to your config, or point to it with `admin.componentsEntry`. `npx dyrected bundle` (and `deploy`) then builds `components.js` alongside the server bundle, with a Subresource Integrity hash in `manifest.json`. React and Vue are both supported; see below.
- **Load them.** `<AdminUI componentsUrl="https://…/components.js" componentsIntegrity="sha384-…" />`. The registry is merged with any `components` you pass directly, and yours win for a key both define. While the bundle loads the admin shows its splash; if it cannot load, the admin still opens with the defaults and a notice.
- **Safe by construction.** The bundle is downloaded, checked against its integrity hash, and only then run, from the verified bytes (never a second download). Plain `http:` URLs are refused unless you set `allowInsecureComponents` for local development.

**How React is shared.** The bundle does not ship its own React. `react`, `react-dom`, the JSX runtimes and `@dyrected/admin` (and its `@dyrected/admin/public` entry) are read from the admin that loads it, so hooks work. Packages such as `@dyrected/react` and `@dyrected/vue` are bundled as normal, and what they re-export from the admin resolves to the admin's own copy. Import everything as you always have.

**Vue components work too.** Write your registry with `.vue` components as you do for Nuxt. `dyrected bundle` compiles the single-file components (`<script setup>`, plain `<script>`, TypeScript, scoped and global CSS), applies Vue's usual auto-imports (`ref`, `computed`, `onMounted`, ...), resolves the `~/`, `~~/` and `@/` path aliases, and wraps each component with the Vue-to-React bridge, so the Cloud-hosted admin renders it like any other. The bundle carries Vue's runtime-only build, and templates are compiled at build time, so nothing evaluates code at run time.

- A new `@dyrected/vue/bridge` entry point contains only the bridge and `defineAdminComponents`, so a components bundle does not drag in the Nuxt-facing components. `@dyrected/vue` must be a version that has it.
- Anything that only exists inside a Nuxt app (`#imports`, `#app`, `nuxt/app`, `useRuntimeConfig`, ...) cannot run in the hosted admin. The build reports each one as an error naming the import and what to use instead (props, the Dyrected composables, or the Dyrected client), rather than failing at run time.
- Sass, Less and Pug in a component are rejected with a clear message; use plain CSS and HTML.
