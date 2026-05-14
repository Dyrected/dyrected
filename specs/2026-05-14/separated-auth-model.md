# Separated Auth Model

Architectural separation between internal system administration and application-level authentication.

## The `__admins` Collection

Dyrected owns a built-in `__admins` collection. This collection is:

- **Private**: Not directly modifiable via standard developer config.
- **Dedicated**: Exclusively powers the `/admin` dashboard login.
- **Isolated**: Separate from any frontend user sessions.

## Application Auth (`auth: true`)

When a developer sets `auth: true` on a collection (e.g., `customers`), Dyrected initializes a fully independent authentication system for that collection.

### Key Benefits

1. **Security Isolation**: Compromising a frontend user account provides zero access to the admin dashboard.
2. **Clean Data**: Admin users (staff) don't clutter up the customer lists or statistics.
3. **Multi-Tenant Friendly**: Different collections can have different auth strategies (JWT, Cookie, etc.) without impacting the admin environment.
4. **Independent Sessions**: A user can be logged in as an Admin and as a Customer simultaneously in the same browser without session collisions.

## Implementation Plan

### 1. Renaming Default Admin

Existing projects using a generic `users` collection for administrative access will be migrated to the `__admins` slug. This reserves the `users` (or `customers`, `members`) namespace for frontend application logic.

### 2. Core Normalization

The `@dyrected/core` package will ensure that `__admins` is treated as a reserved system collection.

- If no auth collection is provided, the system may inject a default `__admins` schema.
- Fields for `__admins` are standard: `email`, `password`, `roles`, etc.

### 3. Admin UI Auth Priority

The Admin Dashboard (`@dyrected/admin`) will be updated to:

1. Seek the `__admins` collection first for authentication.
2. If `__admins` is present, it becomes the **sole** gateway for dashboard access.
3. Other collections with `auth: true` will **not** be used for dashboard login, ensuring complete isolation.

### 4. Developer API

Developers interact with application-level auth using the standard SDK:

```ts
// Login as a customer
const { token } = await client.collection("customers").login(email, password);

// The Admin UI handles its own auth via __admins automatically
```

## Migration Guide

If you are currently using a `users` collection for administrative access and wish to move to the `__admins` model, follow these steps to preserve your existing accounts.

### Manual Database Rename
Because table names are derived from collection slugs (prefixed with `collection_`), renaming the slug in your code will cause the system to look for a new table. You must rename the existing table in your database to prevent data loss.

#### 1. Rename the Table
Before restarting your server with the new configuration, run the following SQL command in your database:

**SQLite / Postgres / MySQL:**
```sql
ALTER TABLE collection_users RENAME TO collection___admins;
```

#### 2. Update your Code
Update your `dyrected.config.ts` or schema definitions to change the slug from `users` to `__admins`.

```ts
const admins = defineCollection({
  slug: '__admins', // Changed from 'users'
  auth: true,
  // ... rest of config
})
```

#### 3. Restart the Server
Once the table is renamed and the code is updated, restart your application. The Admin UI will now correctly identify the existing records in the `collection___admins` table.

> [!CAUTION]
> Failing to rename the table before restarting will result in the system creating a new, empty `collection___admins` table, and you will be prompted to create a "First User" again. Your old data will still exist in `collection_users` but will be inaccessible to the admin system.



