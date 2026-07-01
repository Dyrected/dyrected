# Dyrected Backend — Technical Implementation

This document describes the complete technical architecture of the Dyrected backend. It is written for developers building, extending, or self-hosting Dyrected.

---

## Stack

| Concern   | Choice                | Reason                                                   |
| --------- | --------------------- | -------------------------------------------------------- |
| Runtime   | Node.js / Bun / Deno  | Via Hono's runtime adapters                              |
| Framework | Hono                  | Runtime-agnostic, typed, fast                            |
| Database  | Pluggable via adapter | PostgreSQL, MySQL, MongoDB, SQLite                       |
| Cache     | Redis                 | Optional: Session storage, rate limiting, preview tokens |
| Auth      | JWT + Refresh Tokens  | Stateless, works across runtimes                         |
| Storage   | Pluggable via adapter | S3, Backblaze B2, Cloudinary, Local                      |
| Email     | Pluggable via adapter | Seamailer, Resend, SMTP, custom                          |

---

## Application Entry Point

The entire backend is a single Hono application exported from `@dyrected/core`. Framework adapters mount this app — they do not wrap or extend it.

```ts
// packages/core/src/index.ts
import { Hono } from "hono";
import { authRoutes } from "./routes/auth";
import { collectionsRoutes } from "./routes/collections";
import { globalsRoutes } from "./routes/globals";
import { schemasRoutes } from "./routes/schemas";

export const dyrected = new Hono()
  .route("/auth", authRoutes)
  .route("/collections", collectionsRoutes)
  .route("/globals", globalsRoutes)
  .route("/schemas", schemasRoutes);

export type DyrectedApp = typeof dyrected;
```

Media and forms are not special routes — they are collections. Media is a collection with `upload: true`. A contact form is a collection with `access.create: () => true`. There are no separate route groups for them.

The `DyrectedApp` type is exported so SDK clients can use Hono's RPC client for full end-to-end type safety without GraphQL.

---

## Workspace and Site Hierarchy

Dyrected uses a two-layer content hierarchy. This applies in cloud mode. In self-hosted mode, both layers are implicit singletons — the concept still exists in the code, it is just pre-resolved and never exposed.

```
Workspace  →  Sites  →  Collections / Globals / Content
```

A **workspace** is the billing and team boundary. An agency typically has one workspace. Clients may each have their own workspace, or they can all live under the agency's workspace — that is the agency's choice.

A **site** is the content boundary. One site has one set of collections, globals, schemas, and content. Each site has its own API key. The SDK always points at a site, not a workspace.

---

## Access Control

Dyrected uses a function-based access control system. Access can be defined at the **Collection** or **Field** level.

### Access Functions

Access functions receive the current user context and should return:

- `boolean`: Simple allow/deny.
- `object`: A filter object to restrict the query (e.g., `{ author: user.id }`).

```ts
export const Posts = defineCollection({
  slug: "posts",
  access: {
    read: () => true, // public
    update: ({ req: { user } }) => {
      if (user.role === "admin") return true;
      return { author: user.id }; // users can only update their own posts
    },
    delete: ({ req: { user } }) => user.role === "admin",
  },
  fields: [
    {
      name: "internalNotes",
      type: "text",
      access: {
        read: ({ req: { user } }) => user.role === "admin",
      },
    },
  ],
});
```

---

## Hooks

Hooks allow you to execute logic at specific points in the document lifecycle.

### Collection Hooks

Supported: `beforeRead`, `afterRead`, `beforeChange`, `afterChange`, `beforeDelete`, `afterDelete`.

```ts
hooks: {
  beforeChange: [
    ({ data }) => {
      return {
        ...data,
        slug: slugify(data.title)
      }
    }
  ],
  afterChange: [
    async ({ doc }) => {
      await sendWebhook(doc)
    }
  ]
}
```

### Field Hooks

Fields can also have hooks for transformation or validation.

```ts
{
  name: 'email',
  type: 'email',
  hooks: {
    beforeChange: [({ value }) => value.toLowerCase()]
  }
}
```

### Auth Hooks

Global hooks for authentication events.

- `afterLogin`
- `afterForgotPassword`

---

## Bulk Operations

The backend supports atomic bulk operations for efficiency.

- `PATCH /collections/:slug`: Updates multiple documents matched by a filter.
- `DELETE /collections/:slug`: Deletes multiple documents matched by a filter.

The Admin UI uses these for bulk status changes and deletions.

```
Agency workspace
  ├── clientA.com          (site)
  ├── clientA-staging.com  (site)
  ├── clientB.com          (site)
  └── clientC.com          (site)

ClientB workspace (if they want their own login)
  ├── main-site.com        (site)
  └── campaign-site.com    (site)
```

**Workspaces** manage: billing, team members, roles, invites.
**Sites** manage: content, schemas, API keys, storage config.

---

| Behaviour       | `cloud`                         | `self-hosted`                          |
| --------------- | ------------------------------- | -------------------------------------- |
| Workspaces      | Multi, managed via API          | Single, implicit — not exposed         |
| Sites           | Multiple per workspace          | Single, hardcoded from config          |
| Billing routes  | Enabled                         | Disabled                               |
| Invite system   | Enabled                         | Disabled                               |
| Site resolution | Dynamic DB lookup by API key    | Pre-resolved singleton at boot         |
| Schema source   | Stored in DB, managed via admin | Read from `dyrected.config.ts` at boot |
| Admin UI        | Workspace switcher + site list  | Content editor only                    |

Cloud mode is activated by a `DYRECTED_LICENSE_KEY` environment variable issued by Dyrected — it is not configurable in the code. Self-hosted is the default.

Self-hosted is cloud with a singleton workspace and site. The routes, adapters, hooks, and access control are identical. The middleware short-circuits instead of doing a DB lookup.

Embedded (Next.js / Nuxt) is self-hosted running inside a framework adapter — the same code path, just mounted differently.

---

## Framework Adapters

### Next.js

```ts
// packages/next/src/index.ts
import { handle } from "hono/vercel";
import { dyrected } from "@dyrected/core";

export const { GET, POST, PUT, PATCH, DELETE } = handle(dyrected);
```

Drop into `app/dyrected/[...route]/route.ts`. Works on Vercel, Railway, and any Node host.

### Nuxt / Nitro

```ts
// packages/nuxt/src/runtime/plugin.ts
import { fromNodeMiddleware } from "h3";
import { dyrected } from "@dyrected/core";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.h3App.use("/dyrected", fromNodeMiddleware(dyrected.fetch));
});
```

### Standalone (Node / Bun / Deno)

```ts
// apps/dev/src/index.ts
import { serve } from "@hono/node-server";
import { dyrected } from "@dyrected/core";

serve({ fetch: dyrected.fetch, port: 3000 });
```

---

## Database Adapters

Dyrected never talks to a database directly. It talks to a `DatabaseAdapter` interface. You choose which adapter to use in your config. Official adapters are separate packages.

### Adapter Interface

```ts
interface DatabaseAdapter {
  find(collection: string, query: QueryOptions): Promise<PaginatedResult>;
  findOne(collection: string, id: string): Promise<Record | null>;
  findWhere(collection: string, where: WhereClause): Promise<Record[]>;
  create(collection: string, data: Record): Promise<Record>;
  update(collection: string, id: string, data: Record): Promise<Record>;
  delete(collection: string, id: string): Promise<void>;
  migrate(collections: CollectionConfig[], globals: GlobalConfig[]): Promise<void>;
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}
```

### Official Adapters

| Database   | Package                 | Notes                                                  |
| ---------- | ----------------------- | ------------------------------------------------------ |
| PostgreSQL | `@dyrected/db-postgres` | Drizzle ORM, JSONB storage, recommended for production |
| MySQL      | `@dyrected/db-mysql`    | Drizzle ORM, JSON column storage                       |
| MongoDB    | `@dyrected/db-mongodb`  | Native driver, document storage                        |
| SQLite     | `@dyrected/db-sqlite`   | Drizzle ORM, zero-dependency, ideal for local dev      |

SQLite is deliberately supported — it makes local development require zero external services. Run `dyrected dev` and everything works with no setup.

### Usage in Config

```ts
// PostgreSQL
import { postgresAdapter } from "@dyrected/db-postgres";

defineConfig({
  db: postgresAdapter({
    url: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
  }),
});

// MongoDB
import { mongoAdapter } from "@dyrected/db-mongodb";

defineConfig({
  db: mongoAdapter({
    url: process.env.MONGODB_URL,
    dbName: "dyrected",
  }),
});

// SQLite (local dev)
import { sqliteAdapter } from "@dyrected/db-sqlite";

defineConfig({
  db: sqliteAdapter({
    filename: "./dyrected.db",
  }),
});
```

### Custom Adapter

Any object that satisfies the `DatabaseAdapter` interface is a valid adapter. You can write your own for any database Dyrected does not officially support.

```ts
import { defineConfig } from '@dyrected/core'
import type { DatabaseAdapter } from '@dyrected/core'

const myAdapter: DatabaseAdapter = {
  find: async (collection, query) => { ... },
  findOne: async (collection, id) => { ... },
  create: async (collection, data) => { ... },
  // ... remaining methods
}

defineConfig({ db: myAdapter })
```

---

## Storage Adapters

File storage follows the same adapter pattern. Dyrected calls a `StorageAdapter` interface — the adapter handles the actual upload, deletion, and URL generation.

### Adapter Interface

```ts
interface StorageAdapter {
  upload(args: {
    file: Buffer | ReadableStream;
    filename: string;
    mimeType: string;
    size: number;
    prefix?: string;
  }): Promise<{ url: string; key: string }>;

  delete(key: string): Promise<void>;

  getSignedUrl?(key: string, expiresInSeconds: number): Promise<string>;
}
```

### Official Adapters

| Provider         | Package                        | Notes                                 |
| ---------------- | ------------------------------ | ------------------------------------- |
| AWS S3           | `@dyrected/storage-s3`         | Also works with any S3-compatible API |
| Backblaze B2     | `@dyrected/storage-b2`         | Cheap egress, S3-compatible API       |
| Cloudinary       | `@dyrected/storage-cloudinary` | Auto image transformation support     |
| Local filesystem | `@dyrected/storage-local`      | For self-hosted or dev environments   |

The local filesystem adapter serves files directly through the Hono app — no external service required. Useful for small self-hosted deployments and development.

### Usage in Config

```ts
// AWS S3
import { s3Adapter } from '@dyrected/storage-s3'

defineConfig({
  storage: s3Adapter({
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  }),
})

// Backblaze B2
import { b2Adapter } from '@dyrected/storage-b2'

defineConfig({
  storage: b2Adapter({
    keyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APP_KEY,
    bucket: process.env.B2_BUCKET,
  }),
})

// Cloudinary
import { cloudinaryAdapter } from '@dyrected/storage-cloudinary'

defineConfig({
  storage: cloudinaryAdapter({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  }),
})

// Local filesystem
import { localAdapter } from '@dyrected/storage-local'

defineConfig({
  storage: localAdapter({
    directory: './uploads',
    serveFrom: '/files',   // URL path Hono serves files from
  }),
})

Storage is fully pluggable. Any service that satisfies the `StorageAdapter` interface can be used, and Dyrected officially supports S3, B2, Cloudinary, and Local storage.
```

### Custom Adapter

```ts
import type { StorageAdapter } from '@dyrected/core'

const myAdapter: StorageAdapter = {
  upload: async ({ file, filename, mimeType }) => {
    // upload to wherever you want
    return { url: 'https://...', key: 'files/filename.jpg' }
  },
  delete: async (key) => { ... },
}

defineConfig({ storage: myAdapter })
```

---

## Media Collections

Media is not a special system. It is a collection with `upload: true`. This means it gets everything a normal collection gets — access control, hooks, relationships, querying — plus file upload handling routed through the storage adapter.

You can define as many upload collections as you need, each with different storage configs, access rules, and allowed file types.

### Defining a Media Collection

```ts
export const Media = defineCollection({
  slug: "media",
  upload: true,
  fields: [
    { name: "alt", type: "text" },
    { name: "caption", type: "text" },
  ],
  access: {
    read: () => true,
    create: ({ user }) => !!user,
    update: ({ user }) => !!user,
    delete: ({ user }) => user?.role === "admin",
  },
});
```

When `upload: true`, Dyrected automatically manages these metadata fields — never define them manually:

| Field              | Type   | Description                      |
| ------------------ | ------ | -------------------------------- |
| `url`              | string | Full public URL of the file      |
| `filename`         | string | Stored filename (UUID-based)     |
| `originalFilename` | string | Original name from the upload    |
| `mimeType`         | string | MIME type of the file            |
| `filesize`         | number | Size in bytes                    |
| `width`            | number | Image width in px (images only)  |
| `height`           | number | Image height in px (images only) |

### Multiple Upload Collections

```ts
// images only — public read, with auto-generated sizes
export const Images = defineCollection({
  slug: "images",
  upload: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    imageSizes: [
      { name: "thumbnail", width: 400, height: 300 },
      { name: "card", width: 800, height: 600 },
    ],
  },
  fields: [{ name: "alt", type: "text", required: true }],
  access: {
    read: () => true,
    create: ({ user }) => !!user,
    delete: ({ user }) => user?.role === "admin",
  },
});

// PDFs — restricted to authenticated users
export const Documents = defineCollection({
  slug: "documents",
  upload: {
    allowedMimeTypes: ["application/pdf"],
    maxFileSize: 25 * 1024 * 1024, // 25MB
  },
  fields: [{ name: "title", type: "text", required: true }],
  access: {
    read: ({ user }) => !!user,
    create: ({ user }) => !!user,
    delete: ({ user }) => user?.role === "admin",
  },
});
```

When `imageSizes` is defined, Dyrected generates resized versions on upload and stores each URL alongside the original:

```json
{
  "url": "https://cdn.example.com/images/abc.jpg",
  "sizes": {
    "thumbnail": { "url": "https://cdn.example.com/images/abc-400x300.jpg", "width": 400, "height": 300 },
    "card": { "url": "https://cdn.example.com/images/abc-800x600.jpg", "width": 800, "height": 600 }
  }
}
```

---

## Authentication

Dyrected uses dynamic auth — auth is not a fixed system bolted on the side, it is a collection. Any collection can become authenticatable by setting `auth: true`. The default `users` collection is built-in but fully customisable.

### How Dynamic Auth Works

When Dyrected boots, it reads all collection configs. For any collection with `auth: true`, it automatically adds `email` and `password` fields, generates auth endpoints scoped to that collection's slug, handles password hashing and JWT issuance, and enforces the collection's own access rules.

This means you can have multiple authenticatable collections — `users`, `admins`, `clients`, `members` — each with their own login flow, token scope, and access rules.

### Collection Config (Auth Enabled)

```ts
export const Users = defineCollection({
  slug: "users",
  auth: true,
  fields: [
    { name: "firstName", type: "text", required: true },
    { name: "lastName", type: "text", required: true },
    { name: "role", type: "select", options: ["admin", "editor", "viewer"] },
  ],
  access: {
    read: ({ user }) => !!user,
    create: ({ user }) => user?.role === "admin",
    update: ({ user, doc }) => user?.id === doc.id || user?.role === "admin",
    delete: ({ user }) => user?.role === "admin",
  },
});
```

### Auth Endpoints (Auto-Generated Per Auth Collection)

```
POST   /auth/:collectionSlug/login
POST   /auth/:collectionSlug/logout
POST   /auth/:collectionSlug/refresh
GET    /auth/:collectionSlug/me
POST   /auth/:collectionSlug/forgot-password
POST   /auth/:collectionSlug/reset-password
GET    /auth/:collectionSlug/verify-email/:token
```

### JWT Strategy

- **Access token** — 15 minutes, signed with `JWT_SECRET`, contains `userId`, `collectionSlug`, `workspaceId`, `siteId`, `role`
- **Refresh token** — 7 days, stored in `httpOnly` cookie, rotated on every use
- **Preview token** — 15 minutes, scoped to `siteId`, stored in Redis

### Password Rules

- Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
- Hashed with bcrypt, salt rounds 10
- Reset tokens expire after 1 hour
- Rate limited: 5 login attempts per 15 minutes per IP

---

## Access Control

Access control is function-based. Every collection and global defines its own access rules as functions that receive the current user and the document. There is no global role system — each collection owns its own rules completely.

### Access Function Signature

```ts
type AccessFunction = (args: {
  user: AuthenticatedUser | null;
  doc?: Record<string, any>;
  data?: Record<string, any>;
  req: HonoRequest;
}) => boolean | Promise<boolean>;
```

### Examples

```ts
// blog posts — public reads, controlled writes
access: {
  read: ({ user, doc }) => doc?.status === 'published' || !!user,
  create: ({ user }) => ['editor', 'admin'].includes(user?.role),
  update: ({ user, doc }) => user?.id === doc?.authorId || user?.role === 'admin',
  delete: ({ user }) => user?.role === 'admin',
}

// contact form — anyone can submit, only authenticated users can read submissions
access: {
  create: () => true,
  read: ({ user }) => !!user,
  update: () => false,
  delete: ({ user }) => user?.role === 'admin',
}

// fully public content
access: {
  read: () => true,
  create: () => true,
  update: () => true,
  delete: () => true,
}
```

There is no special `form` flag. A public form is just a collection where `create` returns `true`. The access functions express the intent directly and completely — no additional abstraction needed.

### Field-Level Access

```ts
{
  name: 'internalNotes',
  type: 'text',
  access: {
    read: ({ user }) => user?.role === 'admin',
    update: ({ user }) => user?.role === 'admin',
  }
}
```

Fields the user cannot read are stripped from the response automatically. Fields the user cannot update are silently ignored on write.

---

## Collections

Collections are the primary data model. Each collection is backed by a table (SQL) or document collection (MongoDB) created automatically by the DB adapter at startup.

### Collection Config Shape

```ts
export const Posts = defineCollection({
  slug: "posts",
  label: { singular: "Post", plural: "Posts" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "status", "author", "publishedAt"],
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", unique: true },
    { name: "status", type: "select", options: ["draft", "published"], defaultValue: "draft" },
    { name: "author", type: "relationship", relationTo: "users", required: true },
    { name: "cover", type: "relationship", relationTo: "images" },
    { name: "body", type: "richText" },
    { name: "publishedAt", type: "date" },
  ],
  hooks: {
    beforeCreate: [setAuthorFromSession, generateSlug],
    afterCreate: [sendPublishNotification],
    beforeUpdate: [validateSlugUniqueness],
  },
  access: {
    read: ({ user, doc }) => doc?.status === "published" || !!user,
    create: ({ user }) => !!user,
    update: ({ user, doc }) => user?.id === doc?.authorId || user?.role === "admin",
    delete: ({ user }) => user?.role === "admin",
  },
});
```

### Auto-Generated REST Endpoints Per Collection

```
GET    /collections/:slug              list (paginated, filterable, sortable)
POST   /collections/:slug              create
GET    /collections/:slug/:id          get single
PATCH  /collections/:slug/:id          update
DELETE /collections/:slug/:id          delete
POST   /collections/:slug/:id/publish  publish (if status field exists)
```

### Hooks

Available hooks: `beforeRead`, `afterRead`, `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete`.

```ts
type BeforeCreateHook = (args: {
  data: Record<string, any>;
  user: AuthenticatedUser | null;
  req: HonoRequest;
}) => Promise<Record<string, any>>;

type AfterCreateHook = (args: {
  doc: Record<string, any>;
  user: AuthenticatedUser | null;
  req: HonoRequest;
}) => Promise<void>;
```

---

## Globals

Globals are single-instance documents. There is exactly one document per Global — no list, no pagination, no creation endpoint. The document is initialised automatically on first access.

```ts
export const Navbar = defineGlobal({
  slug: "navbar",
  label: "Navigation",
  fields: [
    { name: "logo", type: "relationship", relationTo: "images" },
    {
      name: "links",
      type: "array",
      fields: [
        { name: "label", type: "text" },
        { name: "url", type: "url" },
      ],
    },
    { name: "ctaText", type: "text" },
    { name: "ctaUrl", type: "url" },
  ],
  access: {
    read: () => true,
    update: ({ user }) => !!user,
  },
});
```

### Endpoints Per Global

```
GET    /globals/:slug
PATCH  /globals/:slug
POST   /globals/:slug/publish
```

---

## Config File

The entire CMS is driven by a single config file. Developers define this. Everything else — admin UI, API routes, database tables, validation — is generated from it.

```ts
// dyrected.config.ts
import { defineConfig } from "@dyrected/core";
import { postgresAdapter } from "@dyrected/db-postgres";
import { s3Adapter } from "@dyrected/storage-s3";

import { Users } from "./collections/users";
import { Posts } from "./collections/posts";
import { Pages } from "./collections/pages";
import { Images } from "./collections/images";
import { Documents } from "./collections/documents";
import { ContactSubmissions } from "./collections/contact-submissions";
import { Navbar } from "./globals/navbar";
import { Footer } from "./globals/footer";
import { SiteSettings } from "./globals/site-settings";

export default defineConfig({
  collections: [Users, Posts, Pages, Images, Documents, ContactSubmissions],
  globals: [Navbar, Footer, SiteSettings],

  db: postgresAdapter({
    url: process.env.DATABASE_URL,
  }),

  storage: s3Adapter({
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  }),

  email: {
    provider: "seamailer",
    apiKey: process.env.SEAMAILER_API_KEY,
    from: "noreply@dyrected.com",
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  cors: {
    origins: ["https://yoursite.com", "http://localhost:3000"],
  },
});
```

There is no `mode` flag in the config file. Self-hosted is the default. Cloud mode is activated by a `DYRECTED_LICENSE_KEY` environment variable issued by Dyrected — it is not configurable by the developer. The config file is always the schema source of truth for self-hosted installations. Schema changes require a config edit and redeploy.

---

## Full API Surface

### Auth (Dynamic — Per Auth Collection)

```
POST   /auth/:collection/login
POST   /auth/:collection/logout
POST   /auth/:collection/refresh
GET    /auth/:collection/me
POST   /auth/:collection/forgot-password
POST   /auth/:collection/reset-password
GET    /auth/:collection/verify-email/:token
```

### Workspaces (Cloud Only)

```
GET    /workspaces
POST   /workspaces
GET    /workspaces/:id
PATCH  /workspaces/:id
DELETE /workspaces/:id
GET    /workspaces/:id/members
POST   /workspaces/:id/members
PATCH  /workspaces/:id/members/:userId
DELETE /workspaces/:id/members/:userId
```

### Sites (Cloud Only)

```
GET    /workspaces/:workspaceId/sites
POST   /workspaces/:workspaceId/sites
GET    /workspaces/:workspaceId/sites/:siteId
PATCH  /workspaces/:workspaceId/sites/:siteId
DELETE /workspaces/:workspaceId/sites/:siteId
POST   /workspaces/:workspaceId/sites/:siteId/api-keys
DELETE /workspaces/:workspaceId/sites/:siteId/api-keys/:keyId
```

### Collections (Dynamic — Per Collection)

Site is resolved automatically from the `x-api-key` header. In self-hosted mode this is pre-resolved at boot and the header is not required.

```
GET    /collections/:slug
POST   /collections/:slug
GET    /collections/:slug/:id
PATCH  /collections/:slug/:id
DELETE /collections/:slug/:id
POST   /collections/:slug/:id/publish
```

### Globals (Dynamic — Per Global)

```
GET    /globals/:slug
PATCH  /globals/:slug
POST   /globals/:slug/publish
```

### Schemas

```
POST   /schemas/sync
GET    /schemas/active
GET    /schemas/diff/:fromHash/:toHash
POST   /schemas/diff/:id/approve
```

---

## Middleware Stack

```ts
dyrected.use("*", cors());
dyrected.use("*", rateLimiter());
dyrected.use("*", requestId());
dyrected.use("*", logger());
dyrected.use("/collections/*", resolveSite());
dyrected.use("/globals/*", resolveSite());
dyrected.use("/workspaces/*", authenticate());
dyrected.use("/collections/*", authenticate({ optional: true }));
dyrected.use("/globals/*", authenticate({ optional: true }));
```

### Site Resolution Middleware

`resolveSite()` is the single point where cloud and self-hosted behaviour diverges. In cloud mode it performs a DB lookup by API key and attaches both the site and workspace to the request context. In self-hosted mode it short-circuits and attaches a pre-resolved singleton.

```ts
// middleware/resolveSite.ts
export const resolveSite = () => async (c, next) => {
  if (config.mode === "self-hosted") {
    c.set("site", config._singletonSite);
    c.set("workspace", config._singletonWorkspace);
    return next();
  }

  const apiKey = c.req.header("x-api-key");
  const site = await db.findSiteByApiKey(apiKey);
  if (!site) return c.json({ error: true, code: "INVALID_API_KEY" }, 401);

  c.set("site", site);
  c.set("workspace", site.workspace);
  return next();
};
```

`authenticate({ optional: true })` attaches the user to context if a valid token is present but never rejects unauthenticated requests — the collection's access functions make that decision.

---

## Database Schema (PostgreSQL Reference)

For SQL adapters, content is stored as JSONB so collection schemas can evolve without a migration per field change. Indexes are created on commonly queried fields automatically.

```sql
-- workspaces
workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMP NOT NULL DEFAULT now()
)

-- sites (one per website, belongs to a workspace)
sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  api_key         TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
)

-- dynamic collection table (one per collection, scoped to a site)
collection_{slug} (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id         UUID REFERENCES sites(id) ON DELETE CASCADE,
  data            JSONB NOT NULL DEFAULT '{}',
  status          TEXT DEFAULT 'draft',
  created_by      UUID REFERENCES users(id),
  updated_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
)

-- upload collection (adds file columns alongside data)
collection_{slug} (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id             UUID REFERENCES sites(id) ON DELETE CASCADE,
  data                JSONB NOT NULL DEFAULT '{}',
  url                 TEXT NOT NULL,
  filename            TEXT NOT NULL,
  original_filename   TEXT NOT NULL,
  mime_type           TEXT NOT NULL,
  filesize            BIGINT NOT NULL,
  width               INT,
  height              INT,
  storage_key         TEXT NOT NULL,
  sizes               JSONB,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMP NOT NULL DEFAULT now()
)

-- globals (one row per global per site)
globals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  site_id         UUID REFERENCES sites(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  data            JSONB NOT NULL DEFAULT '{}',
  status          TEXT DEFAULT 'draft',
  updated_by      UUID REFERENCES users(id),
  updated_at      TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(site_id, slug)
)
```

In self-hosted mode, `workspace_id` and `site_id` columns still exist but always contain the same pre-seeded singleton UUIDs. This keeps the schema identical across both modes.

---

## Field Types

| Type           | Description                                 |
| -------------- | ------------------------------------------- |
| `text`         | Short single-line string                    |
| `textarea`     | Multi-line string                           |
| `richText`     | Structured rich text (Lexical)              |
| `number`       | Numeric value                               |
| `boolean`      | True / false                                |
| `date`         | ISO date string                             |
| `select`       | Single value from defined options           |
| `multiSelect`  | Multiple values from defined options        |
| `email`        | Validated email string                      |
| `url`          | Validated URL string                        |
| `relationship` | Reference to another collection entry by ID |
| `array`        | Repeatable group of sub-fields              |
| `object`       | Nested non-repeatable group of sub-fields   |
| `json`         | Raw JSON (escape hatch)                     |

Image and file fields are `relationship` fields pointing to an upload collection. There are no separate `image` or `file` field types — relationships to upload collections carry all the metadata automatically.

---

## Package Reference

| Package                        | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `@dyrected/core`               | Hono backend — the entire CMS engine   |
| `@dyrected/db-postgres`        | PostgreSQL database adapter (Drizzle)  |
| `@dyrected/db-mysql`           | MySQL database adapter (Drizzle)       |
| `@dyrected/db-mongodb`         | MongoDB database adapter               |
| `@dyrected/db-sqlite`          | SQLite database adapter — local dev    |
| `@dyrected/storage-s3`         | AWS S3 / S3-compatible storage adapter |
| `@dyrected/storage-b2`         | Backblaze B2 storage adapter           |
| `@dyrected/storage-cloudinary` | Cloudinary storage adapter             |
| `@dyrected/storage-local`      | Local filesystem storage adapter       |
| `@dyrected/sdk`                | Framework-agnostic content client      |
| `@dyrected/next`               | Next.js adapter and hooks              |
| `@dyrected/nuxt`               | Nuxt module and composables            |
| `@dyrected/admin`              | Standalone React admin UI              |
| `dyrected`                | Setup, migration, and management CLI   |

---

## Error Philosophy

Errors are always explicit and structured. No silent failures.

```json
{
  "error": true,
  "code": "UNAUTHORIZED",
  "message": "You do not have permission to perform this action",
  "field": "email"
}
```

HTTP status codes are used correctly — `400` validation, `401` unauthenticated, `403` unauthorized, `404` not found, `409` conflict, `429` rate limited, `500` server error.

---

## Environment Variables

```env
# Required
JWT_SECRET=your-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-aes-256-key

# Cloud mode (enterprise / managed only — issued by Dyrected, not set manually)
# Absence of this key means self-hosted mode. Do not set this yourself.
# DYRECTED_LICENSE_KEY=

# Database (depends on adapter used)
DATABASE_URL=postgres://user:pass@host:5432/dyrected
MONGODB_URL=mongodb://localhost:27017

# Storage (depends on adapter used)
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=

B2_KEY_ID=
B2_APP_KEY=
B2_BUCKET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email
SEAMAILER_API_KEY=
SEAMAILER_FROM_EMAIL=noreply@dyrected.com

# Optional
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://yoursite.com,http://localhost:3000
```

---

_This document reflects the v1 implementation target._
