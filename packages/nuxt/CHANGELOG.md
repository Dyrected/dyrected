# @dyrected/nuxt

## 2.0.0

### Major Changes

- Updated all storage adapters to support `Uint8Array` buffers and file prefixing.
  - **Storage API Update**: The `buffer` parameter in `StorageAdapter.upload` and `resolve` now expects a `Uint8Array` instead of a Node.js `Buffer`. This ensures better compatibility across different JavaScript environments.
  - **File Prefixing**: Added support for an optional `prefix` parameter in `StorageAdapter.upload` to allow organizing files into subfolders or prefixes (supported by Cloudinary, S3, B2, and Local storage).
  - **Alignment**: Standardized `CloudinaryStorageAdapter`, `LocalStorageAdapter`, `S3StorageAdapter`, and `B2StorageAdapter` to strictly follow the `@dyrected/core` interface.

### Patch Changes

- Updated dependencies
  - @dyrected/admin@2.0.0
  - @dyrected/core@2.0.0
  - @dyrected/sdk@2.0.0

## 1.0.10

### Patch Changes

- d8e1f29: bump package versions and update export conditions for admin package
- Updated dependencies [d8e1f29]
  - @dyrected/admin@1.0.9
  - @dyrected/core@1.0.9
  - @dyrected/sdk@1.0.9

## 1.0.9

### Patch Changes

- Updated dependencies
  - @dyrected/core@1.0.8
  - @dyrected/sdk@1.0.5

## 1.0.8

### Patch Changes

- fix: use defineEventHandler and upgrade h3 to resolve deprecation warnings in Nuxt module

## 1.0.7

### Patch Changes

- Add functional exports for all database and storage adapters (e.g., mongodbAdapter, sqliteAdapter, s3Storage) to provide a more ergonomic API and fix runtime re-attachment errors in Nuxt.
- Updated dependencies
  - @dyrected/admin@1.0.6
  - @dyrected/core@1.0.7
  - @dyrected/sdk@1.0.5

## 1.0.6

### Patch Changes

- Standardize framework integrations for Next.js and Nuxt. Refactor AI setup prompt into a Senior Content Architect mission with explicit architecture and discovery requirements. Fix CLI Nuxt template for zero-import architecture.
- Updated dependencies
  - @dyrected/admin@1.0.5
  - @dyrected/core@1.0.6
  - @dyrected/sdk@1.0.4

## 1.0.5

### Patch Changes

- Updated dependencies
  - @dyrected/core@1.0.5
  - @dyrected/sdk@1.0.3

## 1.0.4

### Patch Changes

- Standardized environment variable handling across Next.js and Nuxt (prioritizing `NEXT_PUBLIC_` and `NUXT_PUBLIC_` prefixes).
  Improved CLI initialization flow by saving AI setup prompts to `dyrected-ai-prompt.md` and refining the framework-specific setup instructions.
  Fixed type emission and dependency exports for `@dyrected/admin` to ensure stable builds in consuming applications.
  Added a drop-in `DyrectedAdmin` component for Next.js.
  Updated documentation with clearer self-hosted and cloud integration steps.
- Updated dependencies
  - @dyrected/core@1.0.4
  - @dyrected/admin@1.0.4
  - @dyrected/sdk@1.0.3

## 1.0.3

### Patch Changes

- Standardized environment variable handling across Next.js and Nuxt integrations.
  - CLI now generates .env templates with framework-specific prefixes (NEXT*PUBLIC* / NUXT*PUBLIC*).
  - Next.js and Nuxt clients automatically resolve these prefixed variables for client-side use.
  - Added a dedicated `@dyrected/next/admin` component for easy dashboard embedding in Next.js.
  - Fixed TypeScript type generation for the Admin UI package.
- Updated dependencies
  - @dyrected/admin@1.0.3
  - @dyrected/core@1.0.3
  - @dyrected/sdk@1.0.3

## 1.0.1

### Patch Changes

- bfc3468: Initial public release of the Dyrected CMS ecosystem.
- Updated dependencies [bfc3468]
  - @dyrected/admin@1.0.1
  - @dyrected/core@1.0.1
  - @dyrected/sdk@1.0.1

## 1.0.0

### Major Changes

- 00f9439: Initial major release of the Dyrected CMS ecosystem. This release establishes the core monorepo architecture, featuring a flexible CMS engine, a premium React-based Admin UI with warm light aesthetics, and native Next.js/Nuxt integrations. Key highlights include Jexl-based RBAC, a specialized media library with S3/Cloudinary support, live preview, automated audit trails, and a separated auth model for enhanced security.

  ### Breaking Changes

  **WHAT:**
  - Renamed `createApp` to `createDyrectedApp` across all core and framework packages.
  - Removed the hardcoded `/api` prefix from internal routing logic; API paths now default to the handler root or are controlled via `apiPrefix` config.
  - Administrative users are now isolated in a reserved `__admins` collection by default.
  - Standardized database adapter return types to ensure consistent ID handling across SQL and NoSQL providers.

  **WHY:**
  - The rename prevents naming collisions with native framework initializers (like Vue's `createApp`).
  - Decoupling the `/api` prefix provides better compatibility with Next.js/Nuxt server routes and custom proxy configurations.
  - The `__admins` separation ensures system-level security isolation from application-level user data.

  **HOW:**
  - Update your server entry points to use the new `createDyrectedApp` factory function.
  - If you have custom integrations targeting internal endpoints, ensure your base URL paths are updated to reflect the removal of the mandatory `/api` prefix.
  - If upgrading an existing installation, migrate your administrative users from the `users` collection to the new `__admins` collection.

### Patch Changes

- Updated dependencies [00f9439]
  - @dyrected/admin@1.0.0
  - @dyrected/core@1.0.0
  - @dyrected/sdk@1.0.0
