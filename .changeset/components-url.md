---
"@dyrected/admin": minor
"@dyrected/core": minor
"dyrected": minor
---

The admin can now load your custom components from a URL, so a host that cannot import them at build time (such as the Cloud-hosted admin) still shows your custom fields, forms, pages and slots.

**For app developers**

- **Build the components.** Put your registry (`defineAdminComponents({...})`) in `dyrected.components.ts` next to your config, or point to it with `admin.componentsEntry`. `npx dyrected bundle` (and `deploy`) then builds `components.js` alongside the server bundle, with a Subresource Integrity hash in `manifest.json`. Components must be React; a bundle that includes Vue is rejected with an explanation.
- **Load them.** `<AdminUI componentsUrl="https://…/components.js" componentsIntegrity="sha384-…" />`. The registry is merged with any `components` you pass directly, and yours win for a key both define. While the bundle loads the admin shows its splash; if it cannot load, the admin still opens with the defaults and a notice.
- **Safe by construction.** The bundle is downloaded, checked against its integrity hash, and only then run, from the verified bytes (never a second download). Plain `http:` URLs are refused unless you set `allowInsecureComponents` for local development.

**How React is shared.** The bundle does not ship its own React. `react`, `react-dom`, the JSX runtime and `@dyrected/admin` (also written `@dyrected/react`) are read from the admin that loads it, so hooks work. Import them as you always have.
