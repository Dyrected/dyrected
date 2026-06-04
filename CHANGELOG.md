# Changelog

All notable changes to the Dyrected project will be documented in this file.

## [Unreleased]

### Added
- **Admin UI: Date Range Picker**:
    - Added `DateRangePicker` component supporting `mode="range"` selection via react-day-picker v9, rendering two side-by-side months.
    - Registered `daterange` as a new field type in `FieldRenderer` mapping to `DateRangePicker`.
    - Range value shape is `{ from?: string; to?: string }` (ISO strings), compatible with the existing field value contract.

### Changed
- **Admin UI: Date Picker replaced Popover with Inline Calendar**:
    - Removed Radix UI Popover from `DatePicker` and `DateRangePicker`; replaced with a lightweight `InlinePicker` component that stays mounted using CSS visibility/opacity toggling instead of unmounting on close.
    - Keeping the calendar DOM alive preserves react-day-picker v9's internal `firstMonth` navigation state across open/close cycles, so reopening the picker always shows the last navigated month rather than resetting to today.
    - `defaultMonth` is seeded from the selected date on fresh mounts so the calendar always opens at the relevant month.
- **Admin UI: Popover cleanup**:
    - Removed the extra `<div className="dy-admin-ui">` wrapper that was wrapping `PopoverPrimitive.Content` inside the Portal; `dy-admin-ui` is now applied directly on the content element.

### Fixed
- **Admin UI: Edit page double scrollbar / content clipping**:
    - The edit page layout used `dy-h-[calc(100vh)]` with negative top/side margins to escape the shell's inner padding wrapper but was missing the matching negative bottom margin. The shell's `overflow-auto` on `<main>` detected the 48px bottom overflow and showed a second scrollbar. Removing `overflow-y-auto` from the left column suppressed the outer scroll but clipped content. Fixed by adding `dy--mb-6 lg:dy--mb-10` to cancel the bottom padding offset and restoring `dy-overflow-y-auto` on the left column.
- **Admin UI: Calendar navigation buttons requiring multiple clicks**:
    - The nav element is positioned `absolute` inside the `months` container (which is `relative`). Day cells in the same stacking context were painted on top of the nav buttons, intercepting clicks. Fixed by adding `dy-z-10` to the nav classname.
- **Admin UI: `CalendarDayButton` focus racing with click events**:
    - The `useEffect` in `CalendarDayButton` called `ref.current?.focus()` synchronously after render, which conflicted with click-event processing and caused single clicks to register as needing a second click to act. Fixed by wrapping the `focus()` call in `requestAnimationFrame` so it defers until after the browser has processed the click.
- **Admin UI: Calendar always resetting to current month on reopen**:
    - `InlinePicker` previously returned `null` when closed, unmounting the `Calendar`. react-day-picker v9's `useControlledValue` internal `firstMonth` state was lost on unmount; `getInitialMonth` then defaulted to `today` on the next mount. Fixed by switching to CSS visibility/opacity toggling so the Calendar stays mounted and retains navigation state.

- **Core Engine: Type Standardization**:
    - Unified `FieldSchema` and `BlockSchema` definitions in `@dyrected/core` as the single source of truth.
    - Standardized field configuration by renaming `collection` to `relationTo` and adding `hasMany` support.
    - Exposed all core platform types via `@dyrected/sdk` for consistent cross-package type safety.
- **Admin UI: Enhanced Content Management**:
    - **RelationshipPicker Upgrade**: Added support for multi-select (`hasMany`) and debounced server-side search.
    - **MediaPage Improvements**: Added an asset inspection sidebar with URL copying, dimensions, and metadata editing.
    - **RenderCell Component**: Built a type-aware cell renderer for the list table, supporting populated relationship thumbnails and status badges.
- **SDK: Fluent API & Auth**:
    - Implemented `collection(slug).login()` and `logout()` methods for developer-defined auth collections.
    - Added `global(slug)` fluent builder for singleton management.
    - Added `DyrectedError` class for consistent error handling and status code reporting.
- **CLI: Project Bootstrapping**:
    - Implemented `dyrected init` command to automatically scaffold configuration and install dependencies.
- **Framework Integrations**:
    - Added comprehensive Nuxt 3 and Vue 3 portfolio examples demonstrating cloud-to-client integration.
    - Implemented `useLivePreview` composables for real-time content editing feedback.

### Changed
- **Architectural Cleanup**:
    - Renamed internal factory functions to restore the `createDyrectedApp` public API contract.
    - Modularized the Admin UI by extracting `AdminUI` and `AdminStandalone` components for easier embedding.
    - Standardized import paths to use relative references within the admin package.
- **UI/UX Refinement**:
    - Updated typography across the dashboard, switching from bold to semibold for a more premium aesthetic.
    - Improved `DashboardShell` to conditionally hide platform-level navigation on single-site views.
- **Database Adapters**:
    - Updated `SqliteAdapter` to support full pagination metadata (`totalPages`, `hasNextPage`, `hasPrevPage`).

### Fixed
- **Admin UI Routing**: Resolved browser history and back-button issues in embedded environments by implementing `basename` support and `onNavigate` callbacks.
- **Type Safety**: Fixed longstanding TS2367 and TS2352 errors in `FormEngine` caused by mismatched field type literals.
- **Auth Reliability**: Improved cookie management and session invalidation on 401 Unauthorized responses.

## [0.1.0] - 2026-05-07

### Added
- **Cloud IAM: Identity & Access Management (Phase 8)**:
    - Renamed `users` collection to `accounts` to clearly distinguish cloud-internal identities from site-level users managed by self-hosted `@dyrected/core` instances.
    - Added `workspaceMembers` join collection to manage account-to-workspace relationships with `owner`, `admin`, and `editor` roles.
    - Added `invitations` collection as an audit log for pending workspace invitations.
    - Implemented password hashing using Node's built-in `crypto.scrypt` with per-entry salts and constant-time comparison to prevent timing attacks.
    - Implemented JWT token utilities (`signToken`, `verifyToken`) with Redis-backed token blacklisting for secure logout.
    - Built `requireAuth()` middleware reading from `__dyrected_token` HttpOnly cookie or `Authorization: Bearer` header.
    - Built `requireRole()` RBAC middleware for `owner`, `admin`, and `editor` role enforcement.
    - Implemented 6 auth endpoints: `register`, `login`, `logout`, `me`, `forgot-password` (Seamailer email), and `reset-password` (Redis token).
    - Implemented workspace invitation system: send invite via Seamailer, accept invite (creates account if new), revoke membership.
    - Cloud IAM routes (`/cloud/auth/*`, `/cloud/workspaces/*`) are mounted **before** `resolveSite()` so they don't require a site API key.
    - Added `CLOUD_DASHBOARD_URL` environment variable for generating correct reset/invite URLs in emails.
- **Multi-Tenant Foundation (Phase 7)**:
    - Bootstrapped Cloud-specific Schema definition including `workspaces`, `sites`, `subscriptions`, and `users` collections.
    - Built a robust Redis singleton using `ioredis` for session caching and rate-limiting queue logic within the cloud application.
    - Implemented a dynamic `SiteResolver` middleware that correctly maps API requests via `x-api-key` header logic against the cloud database.
    - Integrated a `QueryInterceptor` utilizing Node's `AsyncLocalStorage` and the Adapter proxy pattern to seamlessly inject `workspace_id` and `site_id` data boundaries on all database CRUD operations without modifying the self-hosted core engine.
- **Architectural Alignment (Phase 6)**:
    - Purified `@dyrected/core` by removing cloud-specific multi-tenant routes (`workspacesRoutes`, `sitesRoutes`) from the core architecture and documentation.
    - Updated the `createDyrectedApp` middleware to support upstream dependency injection for `siteId`, providing a `'default'` fallback for self-hosted singletons.
    - Initialized the `apps/cloud` closed-source platform with a private package configuration.
    - Implemented the `DYRECTED_LICENSE_KEY` validation gate and the tenant resolution middleware (`resolveSite`) within the cloud application.
- **Global Settings Editor**: Added `GlobalEditorPage` (`/globals/:slug`) for managing singleton data structures like site settings and navigation menus.
- **Publishing Status Workflow**:
  - Transformed the Collection Edit Page into a two-column layout featuring a new **Publishing Sidebar**.
  - Sidebar surfaces essential document metadata (ID, Creation Date, Last Updated).
  - Automatically renders Status Badges for schema models that incorporate a `status` field.
  - Dynamically injects a Status column and badge directly into the `CollectionListPage` data table.
- **Admin UI Content Experience (Phase 5.5)**:
    - Added a robust **Block Builder Engine** with drag-and-drop (`@dnd-kit`) to allow page-builder-like functionality.
    - Implemented a "Block Selector" to insert complex, deeply nested blocks dynamically.
    - Added the `blocks` FieldType to `@dyrected/core` to support block definitions in configuration schemas.
- **Admin UI Data Management (Phase 5.4)**:
    - Implemented a dynamic **Form Engine** using `react-hook-form` and `zod`.
    - Automated form generation based on backend schemas with support for Text, Number, Boolean, Select, and Media fields.
    - Built **EditEntryPage** for full CRUD management of any collection.
    - Integrated a visual **MediaPicker** component for seamless asset selection within forms.
- **Admin UI Media Library (Phase 5.3)**:
    - Created a central **MediaPage** with an asset inspection grid.
    - Built a robust file uploader with drag-and-drop support and real-time progress tracking.
    - Added quick-action tools for asset deletion and external viewing.
- **SDK Media Management**:
    - Added core methods to `DyrectedClient`: `listMedia`, `uploadMedia`, and `deleteMedia`.
    - Standardized media upload flow using `FormData` and dynamic header resolution.
- **Project Configuration**:
    - Established standardized `.env.example` templates for root, core, and framework adapters.
    - Documented all required variables for storage (S3, B2, Cloudinary) and databases.
- **Admin UI Foundation (@dyrected/admin)**:
    - Initialized Vite + React + TypeScript environment.
    - Integrated Tailwind CSS v3 and Shadcn UI with custom design system.
    - Implemented **AdminShell** with dynamic, schema-driven sidebar navigation.
    - Built **AuthGate** for instance-level authentication and Site API Key management.
    - Set up **TanStack Query** for efficient client-side state and caching.
- **SDK Schema Support (@dyrected/sdk)**:
    - New `getSchemas()` method to fetch architectural metadata.
    - Exposed `getBaseUrl()` for dynamic asset and API resolution.
- **Monorepo Type Unification**:
    - Implemented `pnpm overrides` for consistent React 19 type definitions.
    - Resolved JSX component type conflicts across `@dyrected/next` and `@dyrected/admin`.

- **SDK Fluent Query Builder (@dyrected/sdk)**:
    - New `.collection(slug).find()` chainable API.
    - Support for `.where()`, `.sort()`, `.limit()`, `.page()`, and `.depth()`.
    - Native `Promise` support for direct `await`.
- **S3 Storage Adapter (@dyrected/storage-s3)**:
    - AWS SDK v3 integration.
    - Multipart upload support via `@aws-sdk/lib-storage`.
    - Compatible with DigitalOcean Spaces, Cloudflare R2, and Backblaze B2.
- **Backblaze B2 Storage Adapter (@dyrected/storage-b2)**:
    - Native B2 API integration for high-performance uploads.
    - Optimized for large files and cost-effective object storage.
- **Next.js Adapter (@dyrected/next)**:
    - `dyrectedNextHandler` for Hono-to-Next API bridging.
    - `getDyrectedClient` for Server Component data fetching.
    - `DyrectedImage` component for optimized media rendering.
- **Nuxt Adapter (@dyrected/nuxt)**:
    - Nitro server handler for seamless API mounting.
    - `useDyrected` composable for client-side data access.
    - `DyrectedImage` Vue component for media handling.
- **Cloudinary Storage Adapter (@dyrected/storage-cloudinary)**:
    - Native Cloudinary SDK integration.
    - Automatic metadata extraction (width, height, resource type).
    - Secure URL generation.
- **MongoDB Database Adapter (@dyrected/db-mongodb)**:
    - Native driver integration.
    - Automatic `ObjectId` handling and string fallback.
    - Native document-to-object mapping.
    - Highly scalable document storage for large-scale CMS deployments.
- **Postgres Database Adapter (@dyrected/db-postgres)**:
    - Native `postgres.js` integration.
    - JSONB storage for flexible schemas.
    - Efficient UPSERT logic for global state management.
    - Connection pooling ready for production workloads.
- **SQLite Database Adapter (@dyrected/db-sqlite)**:
    - Native `better-sqlite3` integration.
    - Dynamic table creation for Collections.
    - Global state management using internal tables.
    - JSON-based flexible storage for fast prototyping.
- **Core Engine Improvements**:
    - Enhanced `DatabaseAdapter` interface with pagination support (`docs`, `total`, `limit`, `page`).
    - Standardized `PaginatedResult` type for API consistency.
- **Core Engine Foundation (@dyrected/core)**:
    - Content Contract Typings (Collection, Global, Field).
    - Configuration API (`defineConfig`, `defineCollection`, `defineGlobal`).
    - Hono-based App Shell with core middleware (Logger, CORS, RequestID).
    - Dynamic Routing system for Collections and Globals.
    - Generic CRUD Controllers.
    - `DatabaseAdapter` interface for pluggable backends.
- **Monorepo Structure**:
    - PNPM Workspaces setup.
    - Turborepo configuration.
    - Full directory tree for packages and apps.
- **Documentation**:
    - Organized specifications in `specs/`.
    - Detailed [Implementation Plan](./specs/implementation_plan.md) with granular breakdown of all 6 build phases, including support for SQLite, Postgres, and MongoDB.
    - READMEs for all packages and apps.
