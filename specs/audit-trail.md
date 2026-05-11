# Audit Trail

Automatic injection of system fields and activity logging to track document lifecycle and version history.

## Overview
Auditing in Dyrected consists of two layers:
1.  **System Metadata (Always On)**: Fields on the document itself (`createdBy`, `updatedAt`, etc.) that are present in every collection.
2.  **Activity Logs (`__audit`)**: An opt-in historical record of every change, including snapshots and diffs.

## 1. System Metadata (Always On)
Every collection in Dyrected automatically receives the following fields. Developers do not need to define these manually.

| Field | Type | Description |
| :--- | :--- | :--- |
| `createdBy` | `relationship` | ID of the user who created the document. |
| `updatedBy` | `relationship` | ID of the user who last modified the document. |
| `createdAt` | `date` | ISO timestamp of creation. |
| `updatedAt` | `date` | ISO timestamp of last modification. |

### Technical Implementation:
- **Normalization**: During `normalizeConfig`, these fields are added to every collection's `fields` array with `admin: { hidden: true, readOnly: true }`.
- **Hooks**: A `beforeChange` hook intercepts every write operation to populate these fields using the `DyrectedContext.user`.
- **Timestamps**: The `timestamps: true` configuration is now the global default and cannot be disabled.

## 2. Activity Logs (`__audit`)
While metadata is always on, full version history and diff tracking are opt-in to save database space.

### Configuration
```ts
const posts = defineCollection({
  slug: 'posts',
  audit: true, // Enables logging of changes to the __audit collection
  fields: [ /* ... */ ]
})
```

### The `__audit` Collection Schema:
When `audit: true` is enabled, every change triggers a new entry in this reserved collection:
- `entity`: (String) The slug of the collection or global affected.
- `entityId`: (String) The ID of the affected document.
- `action`: (Select) `create`, `update`, `delete`, or `publish`.
- `user`: (Relationship) Polymorphic reference to the user who performed the action.
- `changes`: (JSON) An object representing the delta (old vs new) for `update` actions.
- `snapshot`: (JSON) A full copy of the document at that point in time (used for version rollback).
- `timestamp`: (Date) When the action occurred.

## 3. Implementation Workflow

### Step 1: Hook Interception
The `CollectionController` calls an `AuditService` before and after database execution.

```ts
// Example internal flow
async update(c: Context) {
  const original = await db.findOne(id);
  const data = await c.req.json();
  
  // 1. Mandatory Metadata (Always happens)
  data.updatedBy = c.get('user').id;
  data.updatedAt = new Date().toISOString();
  
  // 2. Perform DB update
  const updated = await db.update(id, data);
  
  // 3. Conditional Logging (Only if audit: true)
  if (this.collection.audit) {
    await auditService.log({
      action: 'update',
      entity: this.collection.slug,
      entityId: id,
      changes: diff(original, updated),
      snapshot: updated,
      user: c.get('user')
    });
  }
}
```
