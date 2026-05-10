# Spec: Authentication & Authorization (Payload-Inspired Auth Gate)

## Objective
To implement a flexible, collection-based authentication system inspired by Payload CMS. Instead of a hardcoded auth system, authentication is enabled via configuration on any collection.

## Core Concept: Auth-Enabled Collections

### 1. The `auth` Property
Any collection can be designated as an "Auth Collection" by adding `auth: true` (or an configuration object) to its schema.
```typescript
export const Users = {
  slug: 'users',
  auth: true, // Enables auth logic for this collection
  fields: [
    { name: 'role', type: 'select', options: ['admin', 'editor', 'user'] }
  ]
};
```
When `auth: true` is set, Dyrected will automatically:
- Inject `email`, `password`, `salt`, and `hash` fields.
- Generate endpoints: `/api/{slug}/login`, `/api/{slug}/logout`, `/api/{slug}/me`, `/api/{slug}/refresh`.
- Handle JWT generation and cookie management.

### 2. Default User Collection
- **Bootstrap**: On first run, Dyrected will check for an auth-enabled collection. If none exists, it will provision a default `users` collection.
- **Admin Panel Access**: The Admin UI will target the first collection with `auth: true` (or a specific one defined in config) for its login flow.

### 3. Multiple Auth Collections (Admins vs. Customers)
You can define multiple collections with `auth: true` to separate different user types:
- `users`: For internal admins/editors.
- `customers`: For frontend application users.
- **Independence**: Each collection has its own login endpoint and token scope. A user logged into `customers` will not automatically have access to `users` or the Admin Panel unless explicitly granted.

## Access Control (RBAC)

Access is controlled via **Jexl expressions** defined at the Collection, Global, or Field level. Using Jexl allows access rules to be serialized and evaluated dynamically.

### 1. Access Expressions (Jexl)
Access rules are strings evaluated against a context containing `user`, `req`, and (where applicable) the `doc` being accessed.

```typescript
export const Posts = {
  slug: 'posts',
  access: {
    // Returns true/false or a filter object
    read: "true", // Publicly readable
    update: "!!user", // Any logged-in user
    delete: "user.role == 'admin'", // Only admins
    
    // Example of owner-only access (Document level)
    // update: "user.id == doc.createdBy"
  }
};
```
Using Jexl ensures that access logic remains consistent whether the request comes from the Admin UI, the REST API, or the SDK.

### 2. The `admin` Access Property
Specifically controls who can see and manage the collection within the Dyrected Admin Dashboard.

## Detailed Implementation Plan

### 1. Core Package Refactor

#### [MODIFY] [router.ts](file:///Users/busola/Work/dyrected/packages/core/src/router.ts)
- **Jexl Integration**: Replace the current `resolveAccess` function with one that uses the `jexl` library.
- **Context Injection**: Ensure the evaluation context includes `user`, `req`, and `doc`.
- **Schema Filtering**: The `/api/schemas` endpoint must use Jexl to determine which collections/fields the current user is allowed to see.

#### [MODIFY] [Schema Loader / Compiler]
- **Automatic Field Injection**: When a collection has `auth: true`, the system must automatically inject the following fields if they aren't defined by the user:
  - `email`: `type: 'text'`, `required: true`, `unique: true`.
  - `password`: `type: 'password'`, `required: true`, `admin: { hidden: true }`.
- **Default User Provisioning**: If `config.collections` contains no auth-enabled collection, Dyrected should automatically append a standard `users` collection to the config at runtime.

### 2. Admin UI Package Additions

#### [NEW] [login.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/pages/auth/login.tsx)
- Create a high-quality, flat-design login page.
- Should handle the `client.login()` call and store the resulting token.
- Error handling for invalid credentials.

#### [MODIFY] [index.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/index.tsx)
- **Auth Route**: Add `<Route path="/login" element={<LoginPage />} />` to the `AdminRoutes`.
- **Token Persistence**: On mount, check `localStorage` for a token. If present, call `client.setToken(token)`.
- **Auth Guard**: Implement a `ProtectedRoot` component that wraps the dashboard and collection routes. If `client.me()` fails or no token is present, redirect to `/login`.

#### [MODIFY] [AdminShell](file:///Users/busola/Work/dyrected/packages/admin/src/components/layout/admin-shell.tsx)
- Add a "User Profile" or "Logout" button to the sidebar/header.
- Use `client.logout()` and `client.clearToken()` to handle session termination.

### 3. Setup & "First User" Flow

To ensure the system isn't locked out immediately after enabling auth, we implement a "First User" registration flow similar to Payload CMS.

#### [NEW] [create-first-user.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/pages/auth/create-first-user.tsx)
- **Detection**: The Admin UI will query an endpoint (e.g., `GET /api/auth/init`) to check if any users exist in the system.
- **Auto-Redirect**: If the check returns `initialized: false`, the user is automatically redirected to this page instead of the Login page.
- **Account Creation**: A form for Email and Password that creates the first user with the `admin` role.

#### [MODIFY] [auth.controller.ts](file:///Users/busola/Work/dyrected/packages/core/src/controllers/auth.controller.ts)
- **`init` Endpoint**: A new endpoint that returns whether the primary auth collection has any records.
- **`createFirstUser` Endpoint**: A special POST route that allows creating a user *without* authentication, but **ONLY** if the collection is currently empty. This prevents malicious registration after the system is set up.

#### [MODIFY] [setup-prompt.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/pages/setup/setup-prompt.tsx)
- Integrate the "Create First User" step as the final stage of the site setup wizard if auth is enabled.
