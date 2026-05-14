# Dyrected Packages

The modular building blocks of the Dyrected CMS.

## Core
- **core/**: The Hono-based CMS engine.

## SDKs & Adapters
- **sdk/**: Framework-agnostic client library.
- **next/**: Next.js embedded adapter.
- **nuxt/**: Nuxt.js embedded adapter.
- **admin/**: React/Shadcn admin dashboard.
- **cli/**: Setup and management tool.

## Database Adapters
- **db-postgres/**: PostgreSQL (Drizzle).
- **db-mysql/**: MySQL (Drizzle).
- **db-mongodb/**: MongoDB.
- **db-sqlite/**: SQLite (Drizzle).

> [!NOTE]
> While these adapters include Drizzle for future-proofing and metadata handling, the core CRUD operations use raw SQL via the underlying drivers (`postgres.js`, `better-sqlite3`). This was a deliberate choice to better support **dynamic collection schemas** defined at runtime, which are difficult to map to Drizzle's static, compile-time type system.

## Storage Adapters
- **storage-s3/**: AWS S3.
- **storage-b2/**: Backblaze B2.
- **storage-cloudinary/**: Cloudinary.
- **storage-local/**: Local filesystem.
