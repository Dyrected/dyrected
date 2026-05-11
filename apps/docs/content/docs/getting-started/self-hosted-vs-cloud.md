---
title: Self-Hosted vs Cloud
description: The two ways to run Dyrected and when to pick each.
---

| | Self-Hosted | Cloud |
|---|---|---|
| **Engine** | Runs inside your app | Runs on Dyrected's servers |
| **Database** | Your own (SQLite, Postgres, MySQL) | Fully managed |
| **Storage** | Local disk or your S3/R2/Cloudinary | Fully managed |
| **Auth** | You manage JWT secret and sessions | Managed, with workspace RBAC |
| **Multi-site** | One site per deployment | Multiple sites per workspace |
| **Price** | Free | Paid plans — see [Billing](/docs/cloud/billing) |
| **Best for** | Full control, data residency, offline | Speed, teams, multiple client sites |

---

## Self-Hosted

The Dyrected engine is an npm package that runs **inside your Next.js or Nuxt app**. There is no separate CMS process. Your config, your database, your server.

```ts
// dyrected.config.ts — you own everything
export default defineConfig({
  db: new PostgresAdapter({ url: process.env.DATABASE_URL }),
  collections: [...],
})
```

Self-hosting is free under the [Business Source License](https://mariadb.com/bsl11/). You can use it commercially for client projects with no restrictions.

---

## Cloud

Your app sends requests to `https://api.dyrected.cloud` using a Site API Key and Site ID. The database, storage, and admin users are managed by Dyrected. You still write the same `dyrected.config.ts` — the difference is where it runs.

```ts
// nuxt.config.ts — cloud mode
export default defineNuxtConfig({
  modules: ['@dyrected/nuxt'],
  dyrected: {
    apiKey:  process.env.DYRECTED_API_KEY,
    siteId:  process.env.DYRECTED_SITE_ID,
    baseUrl: 'https://api.dyrected.cloud',
  },
})
```

---

## Can I switch later?

Yes. Both modes use the same `dyrected.config.ts`. To migrate from self-hosted to cloud: export your data, create a site in the Cloud dashboard, run `dyrected push` to sync your schema, and update your environment variables. No code changes needed.

---

## Can I use both at once?

Yes — common pattern for agencies: self-hosted locally during development, Cloud in production. Or self-hosted for internal tools, Cloud for client-facing sites.
