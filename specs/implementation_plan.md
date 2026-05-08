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

## Phase 6: Architectural Alignment & Fixes [COMPLETED]

### Phase 6.1: Core Engine Purification

- [x] **Extract Workspace & Site Routes**: Remove `workspacesRoutes` and `sitesRoutes` from `@dyrected/core/src/index.ts`. These belong exclusively in the closed-source `apps/cloud` package.
- [x] **Remove `isCloud` Logic from Core**: Remove the `resolveSite` middleware's dependency on `config.isCloud` inside `@dyrected/core`. The core engine should unconditionally run in self-hosted (singleton) mode.
- [x] **Refactor `dyrected-backend.md`**: Update the backend documentation to remove references to `workspacesRoutes` and `sitesRoutes` within the `@dyrected/core` code examples, reflecting the true architecture.

### Phase 6.2: Cloud App Bootstrapping

- [x] **Initialize `apps/cloud`**: Create the private `apps/cloud` workspace if it doesn't exist, marked as `"private": true`.
- [x] **Implement `apps/cloud/src/boot.ts`**: Implement the `DYRECTED_LICENSE_KEY` validation gate here, not in the core engine. This file will orchestrate the startup of the Cloud platform and wrap the `@dyrected/core` engine.
- [x] **Migrate Multi-Tenant Middleware**: Move the `resolveSite` (API key to site resolution) and multi-tenant logic entirely into `apps/cloud`.

## Phase 7: Multi-Tenant Foundation & Infrastructure

### Phase 7.1: Redis & Caching Infrastructure

- [x] Set up the `apps/cloud` `turbo.json` configuration and environment variables.
- [x] Integrate Redis connection handling for caching, session synchronization, and rate limiting.

### Phase 7.2: Multi-tenant Data Architecture

- [x] Create database schema extensions for Workspaces, Sites, and Subscriptions within `@dyrected/cloud`.
- [x] Build the `SiteResolver` middleware for header-based (`x-api-key`) and host-based tenant identification.
- [x] Implement the `QueryInterceptor` to automatically inject `workspace_id` and `site_id` bounds into database queries.
- [x] Validate database-level isolation to ensure data cannot leak across tenants.

## Phase 8: Cloud Identity & Access Management (IAM)

### Phase 8.1: Identity & Authentication

- [x] Define the `Users` collection with `auth: true` within the `apps/cloud` configuration.
- [x] Implement workspace owner authentication using the `@dyrected/sdk` (`dyrected.auth.login()`).
- [x] Build secure, cookie-based session management for the Cloud Dashboard using native Dyrected tokens.

### Phase 8.2: Access Management & Collaboration

- [x] Implement the Workspace Invitation system with secure token-based email links.
- [x] Build the team management API (invite, revoke, update roles).
- [x] Implement Role-Based Access Control (RBAC) middleware for Owner, Admin, and Editor roles.

## Phase 9: Cloud Platform Dashboard

### Phase 9.1: Dashboard Application Shell

- [x] Scaffold the Cloud Admin dashboard application shell (Next.js/Nuxt).
- [x] Build the "Workspace Overview" page showing active sites and top-level metrics.
- [x] Build the "Site Detail" page for managing a specific site's settings.

### Phase 9.2: Configuration Management UI

- [x] Create interfaces for creating, viewing, and rotating Site API Keys.
- [x] Build forms for configuring custom storage adapters per site (S3, B2, Cloudinary).
- [x] Build the UI for team management and invitation workflows.

## Phase 10: Cloud Operations, Webhooks & Billing

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

## Phase 11: Ecosystem & Documentation [COMPLETED]

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

## Phase 12: Public Release & Stabilization [IN PROGRESS]

### Phase 12.1: Package Publishing

- [x] Configure `changesets` for monorepo package management.
- [x] Update package access to `public` in `.changeset/config.json`.
- [x] Publish initial `@dyrected/*` packages to NPM (v0.0.1).

### Phase 12.2: Infrastructure Hardening

- [ ] Finalize environment variable validation for all adapters.
- [ ] Implement global error handling and reporting in `apps/cloud`.

## Phase 13: Live Preview (Docs-to-Reality) [COMPLETED]

### Phase 13.1: `@dyrected/core` — Missing Backend Features

- [x] Auth Collection Endpoints (`/login`, `/logout`, `/me`, `/refresh-token`).
- [x] Access Flags in /api/schemas (resolved per-user).
- [x] Preview Controller (POST /preview-token, GET /preview-data).
- [x] Admin: LivePreviewPane.tsx.
- [x] Admin: Integration in edit-page.tsx.
- [x] Core API: Integration in router.ts.
- [x] Nuxt: useLivePreview implementation.
- [x] postMessage Sync protocol implementation.
- [x] `CollectionConfig.admin` — Missing `previewUrl`, `previewMode`.
- [x] `UploadConfig` — Missing `staticDir`, `staticURL`, `adminThumbnail`.
- [x] `Field` — Added `fit`, `withoutEnlargement` (standardized image handling).
- [x] Top-level `DyrectedConfig.admin` branding.
- [x] `where` / `sort` Params implemented in Controller.
- [x] `HookFunction` updated with `operation` argument.

### Phase 13.2: `@dyrected/sdk` — Missing Client Methods

- [x] Auth Methods on the Collection Builder (`.login()`, `.logout()`, etc.).
- [x] Token Management (`setToken`, `clearToken`).
- [x] `DyrectedError` Class exported.
- [x] `global(slug)` Fluent Builder.
- [x] `defaultDepth` Client Option.

### Phase 13.3: `@dyrected/nuxt` — Missing Composables

- [x] `useDyrectedGlobal(slug, opts?)`.
- [x] `useDyrectedAuth()`.
- [x] `useLivePreview<T>(options)`.

### Phase 13.4: `@dyrected/admin` — UI Gaps

- [x] Delete row action with confirmation.
- [x] Pagination controls.
- [x] `admin.condition` reactive evaluation.
- [x] `admin.group` sidebar grouping.
- [x] Live Preview pane (integration with iframe).
- [x] RBAC buttons (conditional rendering based on access flags).
- [x] Field `access.read/update` enforcement in form engine.

### Phase 13.5: Missing Package — `@dyrected/react` [COMPLETED]

- [x] Scaffold `packages/react/`.
- [x] Implement `useLivePreview<T>` hook.
- [x] Export `DyrectedError` re-export from SDK.

## Phase 14: Embedded Admin UI — Browser History & Routing [COMPLETED]

- [x] Add `basename?: string` prop to `<AdminUI>`.
- [x] Add `onNavigate?: (path: string) => void` prop.
- [x] Implement `AdminStandalone` export using `MemoryRouter`.
- [x] Update Next.js/Nuxt embed documentation for catch-all routes.

## Phase 15: Frontend Roadmap & Admin UX (Priority: P1)

This phase implements the comprehensive frontend improvements defined in `specs/dyrected-frontend-roadmap.md`.

### Phase 15.1: Admin UI Config Parity

- [x] **Labels & Badges**: Support `labels.singular/plural`, `auth: true` badges, and `shared: true` indicators.
- [x] **Field Metadata**: Show `required` asterisks, `unique` badges, and respect `admin.placeholder/description`.
- [x] **Grouping & Visibility**: Enforce `admin.hidden` and implement sidebar collapsible grouping by `admin.group`.

### Phase 15.2: Relationship & Media Display Overhaul

- [x] **Relationship Cells**: Implement type-aware cell rendering in list tables (thumbnails for media).
- [x] **Relationship Picker**: Add debounced server-side search and multi-select support.
- [x] **Media Picker**: Store/match by ID, use absolute URLs, and add upload-from-picker capability.
- [x] **Media Page Sidebar**: Show file details (URL, dimensions, filesize) and alt text editor.

### Phase 15.3: Live Preview System

- [x] **Core Backend**: Implement `POST /api/preview-token` and `GET /api/preview-data` (JWT/Redis).
- [x] **Admin Split-Pane**: Add a side-by-side preview panel in the Edit page using iframes.
- [x] **Cross-Window Sync**: Implement `postMessage` protocol between Admin and host framework.
- [x] **Framework Hooks**: Implement `useLivePreview` in `@dyrected/nuxt` and `@dyrected/react`.

### Phase 15.4: RBAC & Access Enforcement

- [x] **Schema Resolution**: Propagate resolved access flags via `/api/schemas`.
- [x] **Button Gating**: Condition Create/Edit/Delete buttons on `access` flags.
- [x] **Field Gating**: Strip or disable fields in `FormEngine` based on `field.access.read/update`.

### Phase 15: Frontend Roadmap (UX & RBAC) [COMPLETED]

- [x] 15.1 Config Parity: Labels, Badges, Field Metadata in Admin UI.
- [x] 15.2 UX: Unsaved Changes Guard (isDirty).
- [x] 15.3 UX: Bulk Operations (Row Checkboxes + Toolbar).
- [x] 15.4 RBAC: "Button Gating" & "Field Gating" in FormEngine.
- [x] 15.5 Integration: Embedded Admin routing stability.

## Phase 16: Multi-Tenant Database Isolation (Priority: P1)

This phase transitions the cloud platform to a robust schema-per-workspace model as defined in `specs/database-multi-tenancy.md`.

### Phase 16.1: Schema Provisioning

- [ ] **Provisioner Service**: Implement `provisionWorkspaceSchema` and `deprovisionWorkspaceSchema`.
- [ ] **Lifecycle Hooks**: Trigger schema creation/deletion on workspace CRUD events.

### Phase 16.2: Schema-Aware Query Interceptor

- [ ] **Qualified Table Names**: Update `QueryInterceptor` to use `"schema"."table"` notation for full PgBouncer compatibility.
- [ ] **Adapter Updates**: Update `@dyrected/db-postgres` to respect `collection.dbTableName`.

### Phase 16.3: Collection-level Table Provisioning

- [ ] **Dynamic Tables**: Create scoped tables (`{siteId}_{slug}`) within workspace schemas on config sync.
- [ ] **Cleanup**: Implement cascading deletion for collection tables.

### Phase 16.4: Legacy Data Migration

- [ ] **Migration Script**: Build `migrate-to-schemas.ts` to move data from legacy shared/prefixed tables to new schemas.

## Phase 17: Platform Metrics & Licensing (Priority: P2)

This phase introduces internal operations tooling for platform management as defined in `specs/platform-metrics-and-licensing.md`.

### Phase 17.1: Internal Ops Dashboard (`apps/platform`)

- [ ] **Next.js Scaffold**: Initialize a full-stack Next.js app for platform administration.
- [ ] **Authentication**: Simple email/password admin auth for internal staff.

### Phase 17.2: License Key Management

- [ ] **CRUD API**: Implement license key issuance, revocation, and expiry management.
- [ ] **Validation Endpoint**: `POST /api/validate` for cloud boot authorization.

### Phase 17.3: Usage Telemetry & Events

- [ ] **Event Logging**: Implement `platform_events` table and instrumentation for high-value business events.
- [ ] **Operational Health**: Track API error rates, queue depths, and response latencies.

### Phase 17.4: Business KPI Dashboard

- [ ] **Revenue Metrics**: Visualize MRR, churn, and plan distribution (Paystack sync).
- [ ] **Usage Metrics**: Visualize active workspaces, sites, and API traffic.

## Phase 18: Advanced Image Handling (`imageSizes`) (Priority: P2)

This phase implements the dynamic image resizing engine as defined in `specs/image-sizes-implementation.md`.

### Phase 18.1: Core `sharp` Integration

- [ ] **Dependency Management**: Add `sharp` to `@dyrected/core`.
- [ ] **Startup Validation**: Ensure `sharp` is available if `imageSizes` are configured.

### Phase 18.2: `ImageResizeService`

- [ ] **Resize Pipeline**: Implement buffer-to-buffer resizing with support for `fit`, `crop`, and `withoutEnlargement`.
- [ ] **Variant Generation**: Upload multiple sizes and return a metadata map (`sizes`).

### Phase 18.3: Controller Upload Flow

- [ ] **Synchronous Processing**: Update `CollectionController.upload` to generate sizes during the request for self-hosted mode.
- [ ] **Response Normalization**: Merge `sizes` into the document response.

### Phase 18.4: Async Processing (Cloud)

- [ ] **BullMQ Integration**: Enqueue `image-processing` jobs for background variant generation.
- [ ] **Patch Update**: Update document with `sizes` metadata once processing completes.
