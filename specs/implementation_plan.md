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
- [ ] **Document Support**: Explicit handling for PDF, ZIP, and other non-image formats.

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
- [ ] **External Media Support**: Support for YouTube, Vimeo, and external URLs in the Media collection.
- [ ] **Universal Media Type**: Extend the Media interface to distinguish between `upload` and `remote`.
- [ ] **Metadata Fetching**: Optional helper to fetch YouTube thumbnails/titles.

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
- [ ] **Universal Media Component**: Implement `DyrectedMedia` with support for Images, Videos (YouTube), and Documents.

### Phase 4.2: Nuxt Adapter (@dyrected/nuxt)
- [/] Build the Nuxt module entry point and Nitro handler.
- [ ] **Universal Media Component**: Implement `DyrectedMedia` (Vue) with support for hybrid media types.
- [ ] Create `useDyrected` and `useDyrectedDoc` composables.

## Phase 5: The Admin UI (@dyrected/admin)

### Phase 5.1: Shell & Navigation
- [ ] Set up the React application shell with Tailwind and Shadcn.
- [ ] Build the dynamic sidebar that populates from the schema API.
- [ ] Implement the Auth wall (Login/Logout).

### Phase 5.2: Data Views
- [ ] Implement the generic `DataTable` component for collection lists.
- [ ] Build filtering and sorting UI components.
- [ ] Implement the Global edit view.

### Phase 5.3: Form Engine & Scribe
- [ ] Build the dynamic form builder using `react-hook-form` and `zod`.
- [ ] Integrate **Scribe** as the default rich text editor.
- [ ] Implement relationship pickers and media library integration.

## Phase 6: Cloud & Platform

### Phase 6.1: Multi-tenant Architecture
- [ ] Implement the `licenseKey` gate in the core engine.
- [ ] Build the `SiteResolver` for host-based tenant identification.
- [ ] Implement the platform-wide Auth provider (OAuth/GitHub).

### Phase 6.2: Visual Builder
- [ ] Build a UI for defining collections and fields (GUI -> Config JSON).
- [ ] Implement the dynamic migration runner for schema changes.
- [ ] Build the dashboard for usage analytics and site management.
