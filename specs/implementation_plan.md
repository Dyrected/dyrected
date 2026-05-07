# Dyrected Implementation Plan

This document outlines the phased roadmap for building the Dyrected CMS ecosystem.

## Phase 1: Core Engine Foundation (@dyrected/core)

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

## Phase 2: Persistence & Storage

### Phase 2.1: SQLite Adapter (@dyrected/db-sqlite)

- [ ] Set up Drizzle ORM with `better-sqlite3`.
- [ ] Implement dynamic table mapping for Collections and Globals.
- [ ] Build the `DatabaseAdapter` implementation for SQLite CRUD.
- [ ] Support basic indexing and unique constraints.

### Phase 2.2: Postgres Adapter (@dyrected/db-postgres)

- [ ] Set up Drizzle ORM with `postgres.js` or `pg`.
- [ ] Implement connection pooling and transaction support.
- [ ] Build the `DatabaseAdapter` implementation for Postgres CRUD.
- [ ] Implement full-text search support (GIN indexes).

### Phase 2.3: MongoDB Adapter (@dyrected/db-mongodb)
- [ ] Set up native MongoDB driver or `mongoose`.
- [ ] Implement dynamic collection mapping for BSON documents.
- [ ] Build the `DatabaseAdapter` implementation for MongoDB CRUD.
- [ ] Support MongoDB-specific features like `ttl` indexes and flexible schemas.

### Phase 2.4: Storage Engine Foundation
- [ ] Define the `StorageAdapter` interface (Upload, Delete, GetURL).
- [ ] Implement `@dyrected/storage-local` for local filesystem storage.
- [ ] Create the `Media` system collection handler in the core engine.

### Phase 2.5: Cloud Storage Adapters
- [ ] Implement `@dyrected/storage-s3` (AWS SDK).
- [ ] Implement `@dyrected/storage-b2` (B2 SDK).
- [ ] Implement `@dyrected/storage-cloudinary` (Cloudinary SDK).
- [ ] Support image transformation logic (ImageMagick/Sharp integration).

## Phase 3: The SDK (@dyrected/sdk)

### Phase 3.1: Client Core & Transport

- [ ] Implement framework-agnostic `createClient` using `fetch`.
- [ ] Build the base request/response interceptors for API keys and errors.
- [ ] Implement generic result types for Collections and Globals.

### Phase 3.2: Query Builder API

- [ ] Implement the fluent query builder (`.find().where().sort()`).
- [ ] Add support for deep relationship population.
- [ ] Implement the pagination helper logic.

### Phase 3.3: CLI & Type Generation

- [ ] Build the CLI entry point in `packages/cli`.
- [ ] Implement the `generate:types` command that fetches schemas from the API.
- [ ] Build the code generator for TypeScript interfaces.

## Phase 4: Framework Adapters

### Phase 4.1: Next.js Adapter (@dyrected/next)

- [ ] Implement `dyrectedNextHandler` for Route Handlers.
- [ ] Create the server-only direct client for RSC (`getDyrectedClient`).
- [ ] Build the Image component adapter for `next/image`.

### Phase 4.2: Nuxt Adapter (@dyrected/nuxt)

- [ ] Build the Nuxt module entry point.
- [ ] Implement the Nitro server middleware for API mounting.
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

---

## Verification Plan

### Automated Testing

- [x] Unit tests for core engine configuration.
- [x] Integration tests for core engine routing.
- [ ] Integration tests for each DB adapter using a test suite.
- [ ] E2E tests for the Next.js/Nuxt adapters using Playwright.

### Manual Verification

- [ ] Validation of the "Type-Safe Cycle" (Config -> CLI -> SDK).
- [ ] Testing media uploads across all storage adapters.
- [ ] Cross-browser testing of the Admin UI.
