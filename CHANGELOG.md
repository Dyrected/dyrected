# Changelog

All notable changes to the Dyrected project will be documented in this file.

## [Unreleased]

### Added
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
