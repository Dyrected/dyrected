# Dyrected: The AI-First Headless CMS

Dyrected is the **AI-First Headless CMS**. It replaces manual UI-based schema building with a **Code-First Content Contract** that AI tools (like Lovable, v0, and Antigravity) can generate and maintain in seconds.

Built for the modern stack (Next.js, Nuxt, React, Vue), Dyrected gives you a premium, typed editorial interface without the overhead of traditional CMS infrastructure.

---

## The Problem Dyrected Solves

Every agency faces the same tension:

- Clients want to edit their website content
- Developers want full design control
- WordPress gives clients control but kills design freedom
- Custom builds give design freedom but require a developer for every content change

Dyrected breaks this tension. Developers define what content exists. Clients edit that content. Design is never touched.

---

## How It Works

Dyrected is built around a simple idea called **content contracts**.

Your website declares what content it needs — globals, collections, blocks, fields. Dyrected stores that content and serves it back. The design never enters the CMS. The CMS never touches the design.

```
Website declares:   "Pages collection has a Hero block with a headline, subheadline, and CTA button"
Dyrected stores:    { headline: "...", subheadline: "...", cta: "..." }
Website renders:    Whatever it wants with that content
```

This means one CMS can power dozens of completely different websites — all with unique designs, all managed from one place.

---

## Core Concepts

### Globals

Globals are single-instance content that exists once and applies across the entire site — Navbar, Footer, Cookie Banner, Site Settings, Announcement Bar. There is exactly one of each Global. They do not have multiple entries. They are not lists. They are just named containers for content that never changes in quantity, only in value.

Examples: `navbar`, `footer`, `site-settings`, `cookie-banner`

### Collections

Collections are lists of structured content — Pages, Blog Posts, Case Studies, Team Members, Products, FAQs. Each collection has a defined schema and can have as many entries as needed. A "Home Page" is an entry in a Pages collection. A "Blog Post" is an entry in a Posts collection.

Collections are the primary way content scales. When a client needs 50 pages, they are 50 entries in the Pages collection — not 50 separate things to configure.

Examples: `pages`, `posts`, `team`, `case-studies`, `products`

### Blocks

Blocks are named content groups inside a Global or a Collection entry — Hero, Features, Testimonials, CTA. Blocks group related fields together and give the editor a clear structure. They are not layout components. They carry no design information. They simply organise fields into logical areas.

Examples: inside a Home page entry — `hero`, `features`, `testimonials`, `cta`

### Fields

Fields are the atomic units of content — text, rich text, image, link, list, number, boolean. Fields are typed and validated. They are what clients actually edit.

Examples: `headline`, `subheadline`, `cta_text`, `cover_image`, `body`

### Content Map

The Content Map is the contract between your website and Dyrected. It is a TypeScript file in your project that declares every Global, Collection, Block, and Field your site needs. Dyrected reads this file, generates the editor UI automatically, and keeps itself in sync as your site evolves.

---

**The full mental model:**

```
Globals       → single-instance site-wide content
Collections   → lists of structured content entries
  └── Blocks  → named content groups inside an entry
        └── Fields  → the actual editable values
```

---

## Workspaces and Sites

Dyrected uses a two-layer organisational model. Understanding it upfront saves confusion later.

### The Hierarchy

```
Workspace  →  Sites  →  Collections / Globals / Content
```

A **workspace** is the team and billing boundary. An agency typically operates one workspace. Each workspace can contain as many sites as needed.

A **site** is the content boundary. One site = one website. Each site has its own collections, globals, schema, and API key. Your SDK always points at a site, never at a workspace.

### What this looks like for an agency

```
Agency workspace
  ├── clientA.com          (site)
  ├── clientA-staging.com  (site)
  ├── clientB.com          (site)
  └── clientC.com          (site)
```

If a client wants their own login and separate billing, they can have their own workspace:

```
ClientB workspace
  ├── main-site.com        (site)
  └── campaign-site.com    (site)
```

### What each layer manages

**Workspaces** handle: billing, team members, role-based access, workspace invites.

**Sites** handle: content, schema, API keys, storage configuration.

### Self-hosted

In self-hosted mode there are no workspaces or sites to manage — the concept still exists internally but is pre-resolved to a single implicit site at boot. You never create or configure workspaces and sites. You just edit content.

---

## Deployment Options

### Choosing Your Architecture

The "best" way to use Dyrected depends on your choice of AI builder or framework:

| Tooling            | Architecture        | Why?                                                                                      |
| ------------------ | ------------------- | ----------------------------------------------------------------------------------------- |
| **Lovable / SPAs** | **Cloud-Connected** | SPAs lack a server process to "embed" the core engine. They connect to Cloud via the SDK. |
| **Next.js / v0**   | **Embedded**        | Run your backend and frontend in one Vercel project. AI manages both in one file.         |
| **Nuxt / Nitro**   | **Embedded**        | Perfect for high-performance, edge-ready deployments.                                     |
| **Mobile Apps**    | **Cloud-Connected** | Shared content hub for iOS/Android apps.                                                  |

### Cloud Hosting (Managed)

The fastest way to get started. Dyrected runs on managed infrastructure. You connect your sites, invite your clients, and start editing. No servers. No configuration. No ops.

**What you get:**

- Hosted API at `api.dyrected.com`
- Hosted admin dashboard at `cloud.dyrected.com`
- Automatic SSL, backups, and uptime monitoring
- CDN-cached content delivery globally
- Managed PostgreSQL and Redis
- Media storage via Backblaze B2
- Email delivery via Seamailer
- Workspaces with multiple sites per workspace
- Team members and role-based access per workspace

**Who it is for:**

- Agencies managing multiple client websites from one place
- Teams without dedicated DevOps
- Projects where hosting cost is lower than engineering time

**Setup time:** Under 10 minutes — create workspace, create site, install SDK, start editing.

**Pricing:** Based on workspaces, sites, and monthly active users. Free tier available for small agencies.

---

### Self-Hosted

Run Dyrected on your own infrastructure. You own the data, the deployment, and the configuration. One installation = one site. There are no workspaces, no multi-site management, and no workspace UI. Dyrected gives you the tools — you decide where they run.

**What self-hosting means:**

- You deploy the Dyrected backend to your own server or platform
- You bring your own PostgreSQL database
- You bring your own Redis instance
- You bring your own Backblaze B2 (or S3-compatible) storage
- You configure your own email provider
- You manage updates and backups
- Schema is defined in `dyrected.config.ts` — changes require a redeploy

**What Dyrected provides:**

- A single Docker image containing the full backend
- A standalone admin UI you can host anywhere
- Full environment variable configuration — no code changes needed
- Database migration scripts
- A CLI for setup and management

**Deployment targets:**

| Platform                 | Support                |
| ------------------------ | ---------------------- |
| Docker (VPS, bare metal) | ✅ First-class         |
| Railway                  | ✅ One-click template  |
| Render                   | ✅ One-click template  |
| Fly.io                   | ✅ Supported           |
| Vercel (serverless)      | ✅ Via Next.js adapter |
| Cloudflare Workers       | ✅ Via edge adapter    |
| Bun / Deno               | ✅ Native support      |
| AWS Lambda               | ✅ Via adapter         |

**Minimum requirements (Docker):**

- 512MB RAM
- 1 vCPU
- PostgreSQL 14+
- Redis 6+

**Example Docker Compose setup:**

```yaml
version: "3.8"
services:
  dyrected:
    image: dyrected/dyrected:latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://user:pass@db:5432/dyrected
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-secret
      ENCRYPTION_KEY: your-encryption-key
      # Optional for self-hosted
      # DYRECTED_LICENSE_KEY: your-key
    depends_on:
      - db
      - redis

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: dyrected
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

**Who it is for:**

- Teams with strict data sovereignty requirements
- Enterprises who cannot use third-party cloud services
- Developers who want full control
- Projects with existing infrastructure they want to reuse

**Setup time:** 30–60 minutes with Docker Compose. Longer for custom Kubernetes or cloud deployments.

---

### Embedded (Framework-Native)

For Next.js and Nuxt projects that want the CMS to live inside their own application — one codebase, one deployment, one process. This is self-hosted mode running inside a framework adapter. One installation, one site, schema from your config file.

**Next.js:**

```bash
npm install @dyrected/next
```

```ts
// app/dyrected/[...route]/route.ts
import { dyrectedNextHandler } from "@dyrected/next";
import config from "../../../dyrected.config";

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = dyrectedNextHandler(config);
```

Your CMS API is now available at `/dyrected`. Your Next.js app and your CMS share one deployment on Vercel, Railway, or any Node host.

**Nuxt:**

```bash
npm install @dyrected/nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@dyrected/nuxt"],
});
```

Dyrected mounts itself into Nitro. Your CMS API is available at `/dyrected`. One Nuxt app, one deployment, everything included.

**What you still need:**

- PostgreSQL (Neon, Supabase, Railway, or self-hosted)
- Redis (Upstash, Railway, or self-hosted)
- Storage (Backblaze B2 or S3-compatible)

**Who it is for:**

- Solo developers and small teams
- Projects already on Vercel or similar platforms
- Teams who want the simplest possible setup
- Next.js or Nuxt projects that want direct database access without HTTP round trips

---

## Framework Support

Dyrected is framework-agnostic at its core. The backend is a standard Hono application that runs on any JavaScript runtime. Framework adapters are thin wrappers — they do not change how Dyrected works, only where it runs.

| Framework  | Package               | Status       |
| ---------- | --------------------- | ------------ |
| Next.js    | `@dyrected/next`      | ✅ Available |
| Nuxt       | `@dyrected/nuxt`      | ✅ Available |
| SvelteKit  | `@dyrected/sveltekit` | 🗓 Planned   |
| Astro      | `@dyrected/astro`     | 🗓 Planned   |
| Standalone | `@dyrected/core`      | ✅ Available |

---

## The SDK

Every website that connects to Dyrected installs the SDK. The SDK is the bridge between your website and your content. It is small, typed, and framework-aware. It always points at a specific site using that site's API key.

```bash
npm install @dyrected/sdk
```

**React / Next.js:**

```tsx
import { useBlock } from "@dyrected/sdk/react";

const hero = useBlock("home", "hero");

return <Hero title={hero.data.headline} subtitle={hero.data.subheadline} cta={hero.data.cta_text} />;
```

**Vue / Nuxt:**

```vue
<script setup>
const hero = useBlock("home", "hero");
</script>

<template>
  <Hero :title="hero.data.headline" :subtitle="hero.data.subheadline" :cta="hero.data.cta_text" />
</template>
```

**What the SDK handles:**

- Content fetching and caching
- Live vs preview mode switching
- Content Map sync on build
- TypeScript types generated from your schema
- Graceful fallbacks — never throws during render
- Automatic `x-api-key` header attachment on every request

---

## The Admin

The Dyrected admin is a clean, mobile-first editor. It is built for clients, not developers. No technical terms. No settings panels. No complexity.

In cloud mode, the admin shows a workspace switcher and a list of sites under that workspace. Clients only ever see the sites they have been invited to — they never see workspace management or billing.

In self-hosted mode, the admin opens directly to the content editor. There is no workspace switcher, no site list, and no workspace management. Clients see their collections and globals, nothing else.

The admin is available as:

- Hosted at `cloud.dyrected.com` (cloud)
- Self-hosted as a standalone web app
- Embedded in your Next.js or Nuxt app at `/admin`

---

## Form Submissions

Any collection can be turned into a public form submission endpoint. Contact forms, waitlist signups, lead capture, survey responses — all are just collections with `access.create: () => true`.

- A public `/collections/:slug` POST endpoint requires no authentication
- Read, update, and delete remain access-controlled for authenticated users only
- Rate limiting, honeypot spam protection, and CORS origin validation are applied automatically
- Optional reCAPTCHA or Cloudflare Turnstile support
- Email notifications and webhooks can be triggered on each submission

The SDK exposes a simple `useForm()` hook for React and Vue that handles submission state, loading, and error handling.

---

## What Dyrected Is Not

- **Not a page builder.** Dyrected never touches layout or design.
- **Not a WordPress clone.** There are no themes, plugins, or shortcodes.
- **Not a no-code tool.** Developers define the config. Clients edit the content.
- **Not a database.** Dyrected is a content layer, not a general-purpose data store.

---

## Package Reference

| Package           | Purpose                              |
| ----------------- | ------------------------------------ |
| `@dyrected/core`  | Hono backend — the entire CMS engine |
| `@dyrected/sdk`   | Framework-agnostic content client    |
| `@dyrected/next`  | Next.js adapter and hooks            |
| `@dyrected/nuxt`  | Nuxt module and composables          |
| `@dyrected/admin` | Standalone React admin UI            |
| `dyrected`   | Setup, migration, and management CLI |

---

## Deployment Comparison

|                         | Cloud  | Self-Hosted | Embedded |
| ----------------------- | ------ | ----------- | -------- |
| Your own server         | ❌     | ✅          | Optional |
| Your own database       | ❌     | ✅          | ✅       |
| Data sovereignty        | ❌     | ✅          | ✅       |
| Zero ops                | ✅     | ❌          | Partial  |
| Works on Vercel         | ✅     | ❌          | ✅       |
| Works on VPS            | ✅     | ✅          | ✅       |
| One deployment          | ❌     | ❌          | ✅       |
| Multiple sites          | ✅     | ❌          | ❌       |
| Workspace management    | ✅     | ❌          | ❌       |
| Schema from config file | ❌     | ✅          | ✅       |
| Schema from admin UI    | ✅     | ❌          | ❌       |
| Setup time              | 10 min | 30–60 min   | 15 min   |

---

_Dyrected — direct edit your website content._
