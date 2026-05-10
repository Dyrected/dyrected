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
