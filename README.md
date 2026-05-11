# Dyrected: The AI-First Headless CMS

Dyrected is the **AI-First Headless CMS**. It replaces manual UI-based schema building with a **Code-First Content Contract** that AI tools can generate and maintain in seconds.

## Project Structure

### Applications (`apps/`)
- `apps/cloud`: The multi-tenant CMS platform backend.
- `apps/platform`: **[NEW]** Internal operations dashboard for license & metrics management.
- `apps/docs`: Developer documentation (Fumadocs).
- `apps/admin`: The standalone Admin UI shell.

### Core Engine & SDKs (`packages/`)
- `packages/core`: The core CMS engine (Hono-based).
- `packages/admin`: React-based editor UI components.
- `packages/sdk`: Universal JavaScript client for content fetching.
- `packages/db-postgres`: PostgreSQL database adapter with multi-schema support.
- `packages/storage-s3`: AWS S3 / Cloudflare R2 storage adapter.

## Getting Started

This is a monorepo managed with **pnpm** and **Turborepo**.

```bash
pnpm install
pnpm dev
```

For more details, see [specs/dyrected-installation.md](./specs/dyrected-installation.md).

## Docs

Developer documentation lives in `apps/docs/` and is powered by [Fumadocs](https://fumadocs.vercel.app).

To start the local docs server:

```bash
# Start the dev server — runs on http://localhost:3001
pnpm --filter @dyrected/docs dev
```
