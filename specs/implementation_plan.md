# Dyrected Implementation Plan

This document outlines the phased roadmap for building the Dyrected CMS ecosystem.

## Phase 1: Core Engine Foundation (@dyrected/core)
The goal is to establish the Hono-based engine and the plugin/adapter architecture.

- [ ] Define core types and interfaces (Collection, Global, Field, Adapter).
- [ ] Implement the base Hono application with standard middleware (CORS, Logger, Error handling).
- [ ] Create the `defineConfig` and `defineCollection/Global` utility functions.
- [ ] Implement the singleton resolution logic for self-hosted mode.
- [ ] Build the basic REST routing layer for collections and globals.

## Phase 2: Persistence & Storage (@dyrected/db-* & @dyrected/storage-*)
Enable data saving and file management.

- [ ] Implement `@dyrected/db-sqlite` (using Drizzle) for local development.
- [ ] Implement `@dyrected/db-postgres` (using Drizzle) for production.
- [ ] Implement `@dyrected/storage-local` for local file hosting.
- [ ] Implement `@dyrected/storage-s3` for cloud storage.
- [ ] Integrate media handling as a special collection with `upload: true`.

## Phase 3: The SDK (@dyrected/sdk)
The bridge between the CMS and the website.

- [ ] Implement the framework-agnostic `createClient`.
- [ ] Build the query builder logic for `find`, `findOne`, and `where` clauses.
- [ ] Implement the authentication client (login, logout, refresh).
- [ ] Create the CLI command `generate:types` to produce TS definitions from the config.

## Phase 4: Framework Adapters (@dyrected/next & @dyrected/nuxt)
Embedding Dyrected into the modern stack.

- [ ] **Next.js**: 
    - Implement the catch-all route handler.
    - Create the server-side direct client (`getDyrectedClient`).
- [ ] **Nuxt**:
    - Build the Nuxt module to auto-register Nitro routes.
    - Create auto-imported composables (`useDyrectedServer`, `useDyrectedClient`).

## Phase 5: The Admin UI (@dyrected/admin)
The user-facing editorial dashboard.

- [ ] Set up the React/Shadcn/Tailwind environment.
- [ ] Implement the dynamic sidebar and list views.
- [ ] Build the auto-generated forms for all field types.
- [ ] Integrate the **Scribe** editor for rich text fields.
- [ ] Implement the login/auth screens.

## Phase 6: Cloud & Platform (apps/cloud)
The managed multi-tenant layer.

- [ ] Implement the license key validation middleware.
- [ ] Build the Workspace and Site management models.
- [ ] Implement the database-backed schema provider (Visual Builder).
- [ ] Set up the private deployment pipeline for the Cloud Docker image.

---

## Verification Plan

### Automated Testing
- [ ] Unit tests for the core engine routing.
- [ ] Integration tests for each DB adapter using a test suite.
- [ ] E2E tests for the Next.js/Nuxt adapters using Playwright.

### Manual Verification
- [ ] Validation of the "Type-Safe Cycle" (Config -> CLI -> SDK).
- [ ] Testing media uploads across all storage adapters.
- [ ] Cross-browser testing of the Admin UI.
