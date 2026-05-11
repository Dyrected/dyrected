---
title: Self-Hosted vs. Cloud Mode
description: Understanding the two primary ways to run Dyrected.
---

Dyrected offers two primary architectural modes: **Self-Hosted (Core)** and **Managed (Cloud)**. Both modes use the same `dyrected.config.ts` and the same Admin UI, but they differ in where the data lives and how the API is executed.

## Comparison Overview

| Feature             | Self-Hosted (Core)                     | Managed (Cloud)                        |
| :------------------ | :------------------------------------- | :------------------------------------- |
| **Engine Location** | Embedded in your App (Nitro/Next)      | Dyrected Cloud Servers                 |
| **Database**        | Your own (SQLite, Postgres, etc.)      | Fully Managed                          |
| **Media Storage**   | Local Disk or your S3/B2               | Fully Managed                          |
| **Authentication**  | You manage user sessions               | Managed Auth & RBAC                    |
| **Deployment**      | Part of your monolith                  | Decoupled / Serverless                 |
| **Best For**        | Total control, data residency, offline | Speed, scalability, team collaboration |

---

## 1. Self-Hosted Mode (Core)

In Self-Hosted mode, the Dyrected engine runs as a server handler inside your application (e.g., using `@dyrected/nuxt` or `@dyrected/next`).

### How it works

Your application imports `@dyrected/core` and a database adapter (like `@dyrected/db-sqlite`). When a request hits `/api/dyrected/*`, your app initializes the engine on-the-fly to query your database.

### Example Nuxt Config

```ts
import config from "./dyrected.config";

export default defineNuxtConfig({
  modules: ["@dyrected/nuxt"],
  dyrected: {
    ...config,
    apiBase: "/dyrected", // or '/backend' or whatever you like...
  },
});
```

Your `dyrected.config.ts` handles the database connection. You can use any supported adapter:

```ts
// For SQLite
import { SqliteAdapter } from '@dyrected/db-sqlite'
const db = new SqliteAdapter({ filename: 'dyrected.db' })

// For Postgres
import { PostgresAdapter } from '@dyrected/db-postgres'
const db = new PostgresAdapter({ url: process.env.DATABASE_URL })

export default defineConfig({
  db,
  collections: [...]
})
```

---

## 2. Managed Mode (Cloud)

In Cloud mode, your application acts as a client. The actual engine, database, and media storage are managed by Dyrected Cloud.

### How it works

Your app sends your `dyrected.config.ts` to the Cloud during deployment (via `dyrected sync:schema`). The Cloud then provisions the necessary infrastructure. Your app then communicates with the Cloud API using a **Site API Key**.

### Example Nuxt Config

```ts
export default defineNuxtConfig({
  modules: ["@dyrected/nuxt"],
  dyrected: {
    apiKey: process.env.DYRECTED_API_KEY,
    siteId: process.env.DYRECTED_SITE_ID,
    baseUrl: "https://api.dyrected.cloud",
  },
});
```

---

## FAQ

<AccordionGroup>
  <Accordion title="Can I switch from Self-Hosted to Cloud later?">
    Yes! Since both modes use the same `dyrected.config.ts`, you can migrate your data and simply update your `nuxt.config.ts` to point to the Cloud API.
  </Accordion>
  <Accordion title="Does Self-Hosted mode support multiple sites?">
    Self-hosted mode is typically used for a single site per deployment. For multi-tenancy (multiple sites), the Cloud mode is recommended as it provides workspace isolation and shared resource management.
  </Accordion>
  <Accordion title="Where is my data stored in Cloud mode?">
    Your data is stored in isolated database clusters managed by Dyrected. We use industry-standard encryption at rest and in transit.
  </Accordion>
  <Accordion title="Is there a performance difference?">
    Self-hosted mode can be faster for internal queries since there is no network overhead to an external API. Cloud mode is optimized for global content delivery and high concurrency.
  </Accordion>
</AccordionGroup>
