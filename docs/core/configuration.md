---
title: Configuration Reference
description: Detailed reference for the Dyrected configuration object and content contract.
---

Your `dyrected.config.ts` is the source of truth for your entire application. It defines your data model (the "Content Contract"), access rules, and system integrations.

## Core Configuration (`DyrectedConfig`)

The `defineConfig` helper expects an object with the following properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `collections` | `CollectionConfig[]` | List of content collections (multi-entry). |
| `globals` | `GlobalConfig[]` | List of global singletons (single-entry). |
| `db` | `DatabaseAdapter` | The database adapter to use (e.g., `@dyrected/db-postgres`). |
| `storage` | `StorageAdapter` | (Optional) The storage adapter for media uploads. |
| `email` | `EmailConfig` | (Optional) Enables the forgot-password flow. Provide a `send` function wired to any email library. |
| `redis` | `RedisConfig` | (Optional) Connection details for Redis (required for Cloud). |

---

## Collection Configuration (`CollectionConfig`)

| Property | Type | Description |
| :--- | :--- | :--- |
| `slug` | `string` | Unique identifier used in API paths and database tables. |
| `fields` | `Field[]` | The list of fields that define this collection's schema. |
| `labels` | `object` | Singular and plural labels for the Admin UI. |
| `auth` | `boolean` | Enable built-in authentication for this collection. |
| `upload` | `boolean \| object` | Enable file uploads and define image sizes/mime types. |
| `access` | `object` | Control `read`, `create`, `update`, and `delete` permissions. |
| `hooks` | `object` | Lifecycle hooks (e.g., `beforeChange`, `afterRead`). |
| `admin` | `object` | UI customizations like `useAsTitle` and `defaultColumns`. |

---

## Global Configuration (`GlobalConfig`)

Globals follow a similar structure to collections but are intended for singleton data.

| Property | Type | Description |
| :--- | :--- | :--- |
| `slug` | `string` | Unique identifier for the global. |
| `fields` | `Field[]` | The schema for this global. |
| `label` | `string` | Display name in the Admin UI. |
| `access` | `object` | Control `read` and `update` permissions. |
| `hooks` | `object` | Lifecycle hooks (same as collections, excluding delete). |

---

## Field Configuration (`Field`)

Every field in a collection or global supports these base properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The key used in the database and JSON responses. |
| `type` | `FieldType` | The type of field (e.g., `text`, `richText`, `relationship`). |
| `label` | `string` | (Optional) Display name in the Admin UI. Defaults to a title-cased `name`. |
| `required` | `boolean` | (Optional) Enforcement of data presence. |
| `unique` | `boolean` | (Optional) Enforcement of unique values in the collection. |
| `defaultValue` | `any` | (Optional) The initial value for new entries. |
| `admin` | `object` | UI options: `placeholder`, `description`, `readOnly`, `hidden`, `condition`. |
| `access` | `object` | Field-level permissions. |
| `hooks` | `object` | Field-level lifecycle hooks. |

### Type-Specific Properties

- **`select` / `multiSelect`**: Requires `options` array (strings or `{ label, value }`).
- **`relationship`**: Requires `collection` (slug of the target collection).
- **`array` / `object`**: Requires a nested `fields` array.
- **`blocks`**: Requires a `blocks` array of `Block` definitions.

---

## Content Contract Best Practices

1. **Keep Slugs Stable**: Changing a slug after deployment will result in a new database table and orphaned data.
2. **Use `object` for Grouping**: Use the `object` field type to group related fields in the UI and API response without creating new tables.
3. **Leverage `condition`**: Use `admin.condition` to show/hide fields based on the values of other fields in the same document.

---

## Email Configuration

The `email` config enables transactional emails for all auth collection events (welcome, invite, password reset, password changed). In development with no config set, emails are automatically intercepted by Ethereal so you can preview them without any setup.

```ts
export default defineConfig({
  email: {
    from: 'noreply@mysite.com',
    send: async ({ to, subject, html }) => {
      // wire in Resend, Nodemailer, Postmark, etc.
    },
  },
})
```

See [Email](/docs/core/email) for the full guide — provider examples, the Ethereal dev fallback, and custom template overrides.

---

## JSON Response Contract

When you fetch data from the API, Dyrected returns a standardized JSON structure based on your fields:

- **Relationships**: Returned as the `id` string (by default) or the full object if expanded.
- **Blocks**: Returned as an array of objects, each containing a `blockType` (matching the block slug) and its corresponding data.
- **Rich Text**: Returned as a JSON object compatible with Tiptap/ProseMirror.
- **Dates**: Returned as ISO-8601 strings.
