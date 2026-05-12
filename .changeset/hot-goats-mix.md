---
"@dyrected/admin": major
"@dyrected/cli": major
"@dyrected/core": major
"@dyrected/db-mongodb": major
"@dyrected/db-postgres": major
"@dyrected/db-sqlite": major
"@dyrected/next": major
"@dyrected/nuxt": major
"@dyrected/react": major
"@dyrected/sdk": major
"@dyrected/storage-b2": major
"@dyrected/storage-cloudinary": major
"@dyrected/storage-local": major
"@dyrected/storage-s3": major
---

Initial major release of the Dyrected CMS ecosystem. This release establishes the core monorepo architecture, featuring a flexible CMS engine, a premium React-based Admin UI with warm light aesthetics, and native Next.js/Nuxt integrations. Key highlights include Jexl-based RBAC, a specialized media library with S3/Cloudinary support, live preview, automated audit trails, and a separated auth model for enhanced security.

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
