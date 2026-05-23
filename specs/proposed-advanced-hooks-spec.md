# Specification: Proposed Advanced Lifecycle Hooks

This specification outlines the API design, configuration schema, execution contexts, and integration flows for proposed advanced hooks in Dyrected:
1. **Authentication Hooks** (`beforeLogin`, `afterLogin`, `beforeRegister`, `afterRegister`)
2. **Media Upload Hooks** (`beforeUpload`, `afterUpload`)
3. **Server Lifecycle Hooks** (`onInit`, `onShutdown`)
4. **Client-Side Async Validation Hooks** (`admin.hooks.onValidate`)
5. **API Serialization Hooks** (`beforeResponse`)

---

## 1. Authentication Lifecycle Hooks

These hooks are registered under collections that have `auth: true` configured.

```typescript
export const Users = defineCollection({
  slug: 'users',
  auth: true,
  hooks: {
    // Prevent registration based on rules (e.g., domain whitelist)
    beforeRegister: [
      async ({ data }) => {
        if (!data.email.endsWith('@company.com')) {
          throw new Error('Registration restricted to company domain emails.');
        }
        return data;
      }
    ],
    // Trigger onboarding actions after registration
    afterRegister: [
      async ({ user }) => {
        await sendWelcomeEmail(user.email);
      }
    ],
    // Log active sessions
    afterLogin: [
      async ({ user, req }) => {
        await logUserSession(user.id, req.ip);
      }
    ]
  },
  fields: [...]
})
```

### Execution Parameters:
* **`beforeRegister`:** Receives `{ data, req }`. Must return modified user `data` or throw an error to abort.
* **`afterRegister` / `afterLogin`:** Receives `{ user, req }`. Returns `void`.

---

## 2. Media Upload Hooks

These hooks are registered under collections that have `upload: true` configured, executing during the file upload pipeline.

```typescript
export const Media = defineCollection({
  slug: 'media',
  upload: true,
  hooks: {
    // Validate file properties before writing to storage
    beforeUpload: [
      async ({ file, req }) => {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          throw new Error('File size exceeds the 10MB limit.');
        }
        return file;
      }
    ],
    // Process images after saving to storage
    afterUpload: [
      async ({ doc, file }) => {
        if (file.mimeType.startsWith('image/')) {
          await generateImageSizes(doc.id, file.buffer);
        }
      }
    ]
  },
  fields: [...]
})
```

### Execution Parameters:
* **`beforeUpload`:** Receives `{ file: { filename, buffer, mimeType, size }, req }`. Returns modified `file` object (allowing buffer transforms like pre-compression) or throws.
* **`afterUpload`:** Receives `{ doc, file }`. Returns `void`.

---

## 3. Server Lifecycle Hooks

These are registered globally in the `defineConfig` setup, executing during application startup and shutdown.

```typescript
export default defineConfig({
  collections: [...],
  globals: [...],
  hooks: {
    // Run server initialization tasks
    onInit: [
      async ({ db, config }) => {
        console.log('[dyrected] Booting server, checking database connection...');
        await seedDefaultRoles(db);
      }
    ],
    // Run cleanup on shutdown
    onShutdown: [
      async ({ db }) => {
        await db.closeConnection();
      }
    ]
  }
})
```

### Execution Parameters:
* **`onInit` / `onShutdown`:** Receives `{ db, config }`. Returns `void` / `Promise<void>`.

---

## 4. Client-Side Async Validation Hook

Registered inside individual field definitions under the `admin` object.

```typescript
{
  name: 'username',
  type: 'text',
  admin: {
    hooks: {
      // Runs live in the browser during form validation
      onValidate: async ({ value, siblingData, api }) => {
        const isAvailable = await api.get(`/api/users/check-username?username=${value}`)
        if (!isAvailable) {
          return 'This username is already taken.'; // Returns validation error string
        }
        return true; // Return true to pass validation
      }
    }
  }
}
```

### Execution Parameters:
* **`onValidate`:** Receives `{ value, siblingData, api }` where `api` is a pre-authenticated HTTP utility. Returns `true` (valid) or `string` (validation error message).

---

## 5. API Response Serialization Hook

Registered under a collection or global. It runs right before sending the final HTTP response, allowing dynamic sanitization or transformations.

```typescript
export const Articles = defineCollection({
  slug: 'articles',
  hooks: {
    // Format JSON response based on the requesting user's role
    beforeResponse: [
      async ({ doc, user }) => {
        if (user?.role !== 'admin') {
          // Strip internal drafts and internal notes for public users
          delete doc.internalNotes;
          delete doc.draftRevisions;
        }
        return doc;
      }
    ]
  },
  fields: [...]
})
```

### Execution Parameters:
* **`beforeResponse`:** Receives `{ doc, user, req }`. Must return the final sanitized/transformed `doc` object.
