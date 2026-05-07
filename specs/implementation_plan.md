# Dyrected Implementation Plan

This document outlines the phased roadmap for building the Dyrected CMS ecosystem.

## Phase 1: Core Engine Foundation (@dyrected/core) [COMPLETED]

### Phase 1.1: Typings & Configuration API

- [x] Define core TypeScript interfaces for `Collection`, `Global`, `Field`, and `Block`.
- [x] Implement `defineCollection`, `defineGlobal`, and `defineConfig` helper functions with strict generic typing.
- [x] Set up the base `Field` types (text, number, select, relationship, etc.).

### Phase 1.2: App Shell & Middleware

- [x] Initialize the Hono application instance in `packages/core`.
- [x] Implement standard middleware: Request ID, Logger, CORS, and Body Parser.
- [x] Build the `resolveSite` middleware to handle self-hosted singleton resolution.
- [x] Set up the internal context type and `c.set/c.get` helpers.

### Phase 1.3: Dynamic Routing Layer

- [x] Implement the dynamic route generator that reads the config at boot.
- [x] Build the `/collections/:slug` and `/globals/:slug` route groups.
- [x] Implement the `schemas` routes to expose the active config to the SDK/Admin.

### Phase 1.4: Base Controller Logic

- [x] Implement the generic `find`, `findOne`, and `create` controller logic.
- [x] Build the `update` and `delete` handlers with basic response normalization.
- [x] Set up the initial `DatabaseAdapter` interface requirements.

## Phase 2: Persistence & Storage [IN PROGRESS]

### Phase 2.1: SQLite Adapter (@dyrected/db-sqlite)

- [x] Set up Drizzle ORM with `better-sqlite3`.
- [x] **Dynamic Table Mapping**: Automatic table creation for Collections and Globals.
- [x] **Standardized Pagination**: Implementation of `PaginatedResult`.
- [x] **Atomic UPSERT**: Global state management with conflict resolution.

### Phase 2.2: Postgres Adapter (@dyrected/db-postgres)

- [x] Set up Drizzle ORM with `postgres.js`.
- [x] **JSONB Storage**: Dynamic mapping of fields into optimized JSONB columns.
- [x] **Standardized Pagination**: SQL-based limit/offset logic.
- [ ] **Advanced Features**: Implement full-text search support (GIN indexes).

### Phase 2.3: MongoDB Adapter (@dyrected/db-mongodb)

- [x] Set up native MongoDB driver.
- [x] **Dynamic Collections**: Automatic collection creation on demand.
- [x] **Standardized Pagination**: Native cursor-based aggregation.
- [x] **Type Safety**: Automatic `ObjectId` and string ID normalization.

### Phase 2.4: Storage Engine Foundation

- [x] Define the `StorageAdapter` interface (Upload, Delete, GetURL).
- [x] Implement `@dyrected/storage-local` for local filesystem storage.
- [x] **System Media Collection**: Integrated support for file uploads and metadata.
- [x] **Document Support**: Explicit handling for PDF, ZIP, and other non-image formats.

### Phase 2.5: Cloud Storage Adapters

- [x] Implement `@dyrected/storage-s3` (AWS SDK v3).
- [x] Implement `@dyrected/storage-cloudinary` (Cloudinary SDK).
- [x] Implement `@dyrected/storage-b2` (Native Backblaze API).

### Phase 2.6: Relationship Population (Depth)

- [x] Implement the `PopulationService` in `@dyrected/core`.
- [x] Build recursive relationship resolver with circular dependency protection.
- [x] Add `depth` support to `find` and `findOne` in the core engine.
- [x] Support `?depth=N` query parameter in dynamic routes.

### Phase 2.7: Hybrid Media Strategy [NEW]

- [x] **External Media Support**: Support for YouTube, Vimeo, and external URLs in the Media collection.
- [x] **Universal Media Type**: Extend the Media interface to distinguish between `upload` and `remote`.
- [x] **Metadata Fetching**: Optional helper to fetch YouTube thumbnails/titles.

## Phase 3: The SDK (@dyrected/sdk) [IN PROGRESS]

### Phase 3.1: Client Core & Transport

- [x] Implement framework-agnostic `createClient` using `fetch`.
- [x] Build the base request/response interceptors for API keys and errors.
- [x] Implement generic result types for Collections and Globals.

### Phase 3.2: Query Builder API

- [x] Implement the fluent query builder (`.find().where().sort()`).
- [x] Add support for deep relationship population.
- [x] Implement the pagination helper logic.

### Phase 3.3: CLI & Type Generation

- [x] Build the CLI entry point in `packages/cli`.
- [x] Implement the `generate:types` command that fetches schemas from the API.
- [x] Build the code generator for TypeScript interfaces.

## Phase 4: Framework Adapters [IN PROGRESS]

### Phase 4.1: Next.js Adapter (@dyrected/next)

- [x] Implement `dyrectedNextHandler` for Route Handlers.
- [x] Create the server-only direct client for RSC (`getDyrectedClient`).
- [x] **Universal Media Component**: Implement `DyrectedMedia` with support for Images, Videos (YouTube), and Documents.

### Phase 4.2: Nuxt Adapter (@dyrected/nuxt)

- [x] Build the Nuxt module entry point and Nitro handler.
- [x] **Universal Media Component**: Implement `DyrectedMedia` (Vue) with support for hybrid media types.
- [x] Create `useDyrected` and `useDyrectedDoc` composables.

## Phase 5: The Admin UI (@dyrected/admin)

### Phase 5.1: Foundation & Auth

- [x] Set up the React application shell with Tailwind and Shadcn/UI.
- [x] **Dynamic Navigation**: Build the sidebar that populates from the `/api/dyrected/schemas` endpoint.
- [x] Implement the Auth wall (Login/Logout) and Site API Key state management.
- [x] Set up the React Query (TanStack Query) provider for efficient data fetching.

### Phase 5.2: Data Management (List Views)

- [x] Implement the **Universal DataTable** using TanStack Table.
- [x] Build the dynamic filtering UI (mapping to the SDK's `.where()` logic).
- [x] Implement server-side pagination and multi-column sorting.
- [x] Create the "Bulk Actions" framework (Delete, Export).

### Phase 5.3: The Media Library

- [x] Build the **Media Grid** view with lazy-loaded thumbnails.
- [x] Implement the **Hybrid Uploader**: Support for drag-and-drop files and Remote URL inputs.
- [x] Build the Media Detail sidebar for editing metadata (alt text, titles).
- [x] Integrate with `MediaService` to auto-populate metadata for YouTube/Vimeo.

### Phase 5.4: Dynamic Form Engine (Edit Views)

- [x] Build the recursive **Field Renderer** for standard field types (text, number, select, boolean).
- [x] Implement the **Relationship Picker**: Searchable modal for selecting related entries.
- [x] Build the **JSON Editor** field for raw data manipulation.
- [x] Implement real-time validation using `react-hook-form` and `zod`.

### Phase 5.5: Content Experience (Tiptap & Blocks)

#### Phase 5.5.1: Tiptap Rich Text Editor Integration

- [x] Install `@tiptap/react`, `@tiptap/starter-kit`, and necessary extensions.
- [x] Create a `RichTextEditor` component wrapping Tiptap.
- [x] Implement a custom, accessible Toolbar using Shadcn UI components.
- [x] Integrate the `MediaPicker` into Tiptap to support rich media insertion.
- [x] Update the `FormEngine` to utilize the new `RichTextEditor` for fields of type `richText`.

#### Phase 5.5.2: The Block Builder Engine

- [x] Create a `BlockBuilder` component that reads the `blocks` configuration.
- [x] Implement Drag-and-Drop functionality to allow users to reorder block sections.
- [x] Build a "Block Selector" UI to allow users to add new blocks.
- [x] Integrate the `FormEngine` within each block to render the block's specific fields.

#### Phase 5.5.3: Global Settings & Publishing Status

- [x] Build the `GlobalEditorPage` for managing singleton schemas.
- [x] Route `/globals/:slug` to the new `GlobalEditorPage`.
- [x] Implement a `PublishingSidebar` in the `EditEntryPage`.
- [x] Add toggle support for "Draft" vs "Published" if the `status` field is present.
- [x] Implement UI indicators in the `CollectionListPage` for entry status.

## Phase 6: Architectural Alignment & Fixes [NEW]

The current implementation and documentation have drifted from the strict architectural standards defined in `dyrected-architecture.md` and `dyrected-core-vs-cloud.md`. This phase will implement the necessary fixes to ensure the codebase perfectly aligns with the Open Core / Commercial Split model before building the Cloud platform.

### Phase 6.1: Core Engine Purification

- [x] **Extract Workspace & Site Routes**: Remove `workspacesRoutes` and `sitesRoutes` from `@dyrected/core/src/index.ts`. These belong exclusively in the closed-source `apps/cloud` package.
- [x] **Remove `isCloud` Logic from Core**: Remove the `resolveSite` middleware's dependency on `config.isCloud` inside `@dyrected/core`. The core engine should unconditionally run in self-hosted (singleton) mode.
- [x] **Refactor `dyrected-backend.md`**: Update the backend documentation to remove references to `workspacesRoutes` and `sitesRoutes` within the `@dyrected/core` code examples, reflecting the true architecture.

### Phase 6.2: Cloud App Bootstrapping

- [x] **Initialize `apps/cloud`**: Create the private `apps/cloud` workspace if it doesn't exist, marked as `"private": true`.
- [x] **Implement `apps/cloud/src/boot.ts`**: Implement the `DYRECTED_LICENSE_KEY` validation gate here, not in the core engine. This file will orchestrate the startup of the Cloud platform and wrap the `@dyrected/core` engine.
- [x] **Migrate Multi-Tenant Middleware**: Move the `resolveSite` (API key to site resolution) and multi-tenant logic entirely into `apps/cloud`.

## Phase 7: Multi-Tenant Foundation & Infrastructure

This phase establishes the base data model and infrastructure required for the cloud environment.

### Phase 7.1: Redis & Caching Infrastructure
- [x] Set up the `apps/cloud` `turbo.json` configuration and environment variables.
- [x] Integrate Redis connection handling for caching, session synchronization, and rate limiting.

### Phase 7.2: Multi-tenant Data Architecture
- [x] Create database schema extensions for Workspaces, Sites, and Subscriptions within `@dyrected/cloud`.
- [x] Build the `SiteResolver` middleware for header-based (`x-api-key`) and host-based tenant identification.
- [x] Implement the `QueryInterceptor` to automatically inject `workspace_id` and `site_id` bounds into database queries.
- [x] Validate database-level isolation to ensure data cannot leak across tenants.

## Phase 8: Cloud Identity & Access Management (IAM)

This phase introduces user authentication and team collaboration to the cloud platform.

### Phase 8.1: Identity & Authentication
- [x] Define the `Users` collection with `auth: true` within the `apps/cloud` configuration.
- [x] Implement workspace owner authentication using the `@dyrected/sdk` (`dyrected.auth.login()`).
- [x] Build secure, cookie-based session management for the Cloud Dashboard using native Dyrected tokens.

### Phase 8.2: Access Management & Collaboration
- [x] Implement the Workspace Invitation system with secure token-based email links.
- [x] Build the team management API (invite, revoke, update roles).
- [x] Implement Role-Based Access Control (RBAC) middleware for Owner, Admin, and Editor roles.

## Phase 9: Cloud Platform Dashboard

This phase builds the actual UI where customers will manage their Dyrected instances.

### Phase 9.1: Dashboard Application Shell
- [x] Scaffold the Cloud Admin dashboard application shell (Next.js/Nuxt).
- [x] Build the "Workspace Overview" page showing active sites and top-level metrics.
- [x] Build the "Site Detail" page for managing a specific site's settings.

### Phase 9.2: Configuration Management UI
- [x] Create interfaces for creating, viewing, and rotating Site API Keys.
- [x] Build forms for configuring custom storage adapters per site (S3, B2, Cloudinary).
- [x] Build the UI for team management and invitation workflows.

## Phase 10: Cloud Operations, Webhooks & Billing

This phase introduces background processing, usage tracking, and monetization.

### Phase 10.1: Background Jobs & Webhooks
- [x] Integrate BullMQ for asynchronous task queues, connected to Redis.
- [x] Implement the `WebhookDispatcher` service to listen to content lifecycle events.
- [x] Create the database tables to store Webhook Endpoint configurations and Delivery Logs.
- [x] Build the Webhook management UI in the dashboard.

### Phase 10.2: Usage Tracking & Analytics
- [x] Implement middleware to track incoming API requests and increment usage counters in Redis.
- [x] Create a cron job to flush Redis usage counters to the main database periodically.
- [x] Implement storage space calculation logic.
- [x] Build the Analytics dashboard view for users to monitor their bandwidth and API consumption.

### Phase 10.3: Paystack Billing Integration
- [x] Integrate the Paystack Node SDK.
- [x] Implement the payment flow for creating subscriptions and handling one-off payments.
- [x] Create the Paystack webhook listener to process `subscription.create`, `charge.success`, and `invoice.payment_failed` events.
- [x] Build the Billing Management UI for users to manage cards, view invoices, and upgrade/downgrade plans.
- [x] Enforce usage limits based on the active Paystack subscription tier.

---

## Phase 11: Ecosystem & Documentation

This phase focuses on the developer experience and public release stability.

### Phase 11.1: Technical Documentation
- [x] Create a comprehensive documentation outline.
- [x] Implement the documentation site using **Mintlify**.
- [x] Remove all legacy references to "Scribe".

### Phase 11.2: API Discoverability
- [x] Implement automated OpenAPI 3.0 specification generation in `@dyrected/core`.
- [x] Integrate interactive Swagger UI at `/api/docs`.

### Phase 11.3: CLI & Onboarding
- [x] Implement `npx @dyrected/cli init` for rapid project bootstrapping.
- [x] Create the "AI Cloud Setup Prompt" for instant scaffolding.

---

## Phase 12: Public Release & Stabilization

### Phase 12.1: Package Publishing
- [x] Configure `changesets` for monorepo package management.
- [x] Update package access to `public` in `.changeset/config.json`.
- [x] Publish initial `@dyrected/*` packages to NPM (v0.0.1).

### Phase 12.2: Infrastructure Hardening
- [ ] Finalize environment variable validation for all adapters.
- [ ] Implement global error handling and reporting in `apps/cloud`.



---

## Phase 13: Docs-to-Reality Gap Closure

This phase tracks everything **documented as existing** but not yet implemented, discovered during the May 2026 documentation audit. Items are grouped by package.

> All design questions for this phase have been resolved (see the decisions table at the bottom). Items marked ✅ are already implemented.

---

### Phase 13.1: `@dyrected/core` — Missing Backend Features

#### Auth Collection Endpoints
> **Context:** `apps/cloud` already has a full auth system at `/cloud/auth/*` — but that authenticates **Dyrected platform accounts** (who can log in to the dashboard). This is **different**. What's missing here is auth for **developer-defined collections** with `auth: true` on their *own site*, so that a developer building a membership site can have `/api/collections/customers/login` etc.

- [x] `POST /api/collections/:slug/login` — email + password → JWT
- [x] `POST /api/collections/:slug/logout` — invalidate session
- [x] `GET  /api/collections/:slug/me` — return current user (strip `password`)
- [x] `POST /api/collections/:slug/refresh-token` — issue fresh JWT
- [x] `POST /api/collections/:slug/forgot-password` — send reset email
- [x] `POST /api/collections/:slug/reset-password` — consume reset token
- [x] Auto-inject `email` + `password` (bcrypt-hashed) fields when `auth: true`
- [x] Strip `password` from all response bodies unconditionally
- [x] JWT decode middleware: expose decoded user as `c.get('user')` for access functions

#### Access Flags in `/api/schemas`
`/api/schemas` returns raw config with **no resolved access**. Docs say it should return computed flags when a JWT is present:

- [x] Resolve each collection's `access.*` functions against `c.get('user')`
- [x] Resolve each field's `access.*` functions against the user
- [x] Merge computed flags into the schema response

#### Preview Token Endpoints (Live Preview — token mode)
- [ ] `POST /api/preview-token` — issue signed JWT stored in Redis, 15-minute TTL
- [ ] `GET  /api/preview-data?token=<jwt>` — return draft document for the token
- [ ] Return `501 Not Implemented` when `redis` is not configured

#### `CollectionConfig.admin` — Missing Type Properties
- [x] `previewUrl?: string | ((doc: any, opts: { locale?: string }) => string | null)`
- [x] `previewMode?: 'postMessage' | 'token'`

#### `UploadConfig` — Missing Properties
**Decision:** Keep `allowedMimeTypes` (matches the type). Docs updated to match. Still missing from the type:
- [x] `staticDir?: string`, `staticURL?: string` (LocalStorage only)
- [x] `adminThumbnail?: string`
- [x] `imageSizes[].fit?: string`
- [x] `imageSizes[].withoutEnlargement?: boolean`
- [x] `imageSizes[].formatOptions?: object`

#### Top-level `DyrectedConfig.admin` Branding — Not in Types
- [x] Define `AdminConfig` interface with `branding` and `meta` sub-objects
- [x] Add `admin?: AdminConfig` to `DyrectedConfig`

#### `where` / `sort` Params Ignored in Controller
`CollectionController.find` never parses or passes `where` or `sort`:
- [x] Parse `where` from query string server-side (qs)
- [x] Parse and pass `sort` to `db.find()`

#### `HookFunction` Missing `operation` Argument
- [x] Add `operation?: 'create' | 'update' | 'delete'` to `HookFunction` args

---

### Phase 13.2: `@dyrected/sdk` — Missing Client Methods

#### Auth Methods on the Collection Builder
- [x] `collection(slug).login(email, password)` → `{ token, user }`
- [x] `collection(slug).logout()` → `void`
- [x] `collection(slug).me()` → `user`
- [x] `collection(slug).refreshToken()` → `{ token }`

#### Token Management
- [x] `client.setToken(token)` — update Authorization header on the instance
- [x] `client.clearToken()` — remove Authorization header

#### `collection(slug).upload(file, data?)` ✅ Implemented
**Decision:** Move to collection builder (docs win). `_upload()` private method added; `uploadMedia()` marked `@deprecated`. No further action needed.

#### `DyrectedError` Class
- [x] Export `class DyrectedError extends Error` with `statusCode: number` and `errors: { field: string, message: string }[]`
- [x] Update `private request()` to throw `DyrectedError`

#### `global(slug)` Fluent Builder ✅ Implemented
**Decision:** Fluent builder (docs win). `client.global(slug).get()` / `.update()` added; flat `getGlobal`/`updateGlobal` kept as `@deprecated` aliases. No further action needed.

#### `defaultDepth` Client Option
- [x] Accept `defaultDepth?: number` in `DyrectedClientConfig` and use as per-call fallback

---

### Phase 13.3: `@dyrected/nuxt` — Missing Composables

#### `useDyrected` Signature — Decision Made
**Decision:** Keep current behaviour — `useDyrected()` returns the raw `DyrectedClient`. Docs updated to match. No code change needed.

#### `useDyrectedGlobal(slug, opts?)`
- [x] Wraps `client.global(slug).get()` in `useAsyncData`, register in `addImports`

#### `useDyrectedAuth()`
- [x] Returns `{ login, logout, user: Ref<User | null>, isLoggedIn: Ref<boolean> }`
- [x] Persists JWT in cookie / `useState` for SSR compatibility

#### `useLivePreview<T>(options)`
- [x] Vue `postMessage`-based live preview composable
- [x] Register in `addImports`

---

### Phase 13.4: `@dyrected/admin` — UI Gaps

- [x] Delete row action — mutation connected to API with confirmation dialog
- [x] Pagination controls — Prev/Next with page/totalPages display
- [x] `admin.condition` — `FormEngine` evaluates it reactively via `useWatch`
- [x] `admin.group` — sidebar groups collections under sub-headings
- [x] `admin.hidden` — sidebar filters hidden collections (already worked; confirmed)
- [ ] Live Preview pane — not built (type also missing)
- [ ] RBAC buttons — Create/Edit/Delete not conditioned on resolved access flags
- [ ] Field `access.read/update` — form engine does not strip or disable fields

---

### Phase 13.5: Missing Package — `@dyrected/react`

`useLivePreview` is documented as importable from `@dyrected/react`. The package does not exist:
- [ ] Scaffold `packages/react/` (package.json, tsconfig, build)
- [ ] Implement `useLivePreview<T>({ initialData, serverURL })` hook
- [ ] Export `DyrectedError` re-export from SDK

---

## Design Decisions — Resolved 2026-05-07

| # | Question | Decision | Action |
|---|---|---|---|
| 1 | `UploadConfig` MIME field name | **`allowedMimeTypes`** (types win) | Docs updated — no code change |
| 2 | SDK global accessor | **`client.global(slug).get()`** (docs win) | ✅ Implemented in SDK |
| 3 | SDK upload method location | **`client.collection(slug).upload()`** (docs win) | ✅ Implemented in SDK; `uploadMedia()` deprecated |
| 4 | Nuxt `useDyrected` shape | **Raw client** (code wins) | Docs updated — no code change |

---

## Phase 14: Embedded Admin UI — Browser History & Routing

**Priority: P1.** When `<AdminUI />` is embedded in a host app (Next.js, Nuxt, etc.), internal navigations do not update the browser URL. Back/Forward buttons don't work. Tested broken in React; Vue/Nuxt host untested.

See `specs/dyrected-frontend-roadmap.md §8` for full root-cause analysis and solution options. Summary of work:

- [x] Add `basename?: string` prop to `<AdminUI>` (default `'/admin'`); pass to `<BrowserRouter basename={basename}>`
- [x] Add `onNavigate?: (path: string) => void` prop; emit on every internal route change via a `useEffect` + `useLocation` sync component
- [x] Add both props to `AdminUIProps` type
- [x] Added `AdminStandalone` export using `MemoryRouter` for iframe / self-hosted use cases
- [ ] Update Next.js embed docs: use `[[...route]]` catch-all page that always renders `<AdminUI>`
- [ ] Update Nuxt embed docs: equivalent catch-all page setup
- [ ] Test in a Nuxt/Vue host app — verify `navigateTo()` integration via `onNavigate`
- [ ] Add `docs/admin/overview.md` section explaining embedding options

---

## Admin UI File Organization — ✅ Complete

`packages/admin/src/index.tsx` was 800+ lines with all components co-located. Refactored:

- [x] `src/pages/dashboard/dashboard.tsx` — extracted `Dashboard`
- [x] `src/pages/setup/setup-prompt.tsx` — extracted `SetupPromptUI`, exported as named package export
- [x] `src/index.tsx` — clean entrypoint: only `AdminUI`, `AdminStandalone`, and re-exports
- [x] `/setup` route added to admin router — prompt reachable any time from the sidebar
- [x] Sidebar footer — persistent "Integration Guide" link visible in all modes
