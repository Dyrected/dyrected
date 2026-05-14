# Full Audit Log

A low-level system collection for tracking all state mutations.

## Overview

Dyrected maintains a hidden internal collection named `__audit` that acts as a ledger for all write operations for collections that have explicitly enabled auditing.

## The `__audit` Collection

This collection is not visible in the standard sidebar but can be queried via the SDK or viewed by Super Admins.

### Schema

- `collection`: The slug of the collection being modified.
- `documentId`: The ID of the document being changed.
- `operation`: The type of change (`create`, `update`, `delete`).
- `user`: Reference to the user who performed the action.
- `timestamp`: Precise time of the operation.
- `changes`: A JSON object storing the diff of the changes (previous vs. current state).

## Performance & Storage

Audit logs are written asynchronously to minimize impact on API response times. Older logs can be archived or purged based on system configuration.


## Extended Use Cases: Revisions & Rollbacks

The `__audit` collection serves as the source of truth for high-level content management features:

- **Revision History**: By filtering for a specific `documentId`, we can reconstruct the history of a document and show a "Who changed what" timeline.
- **Point-in-Time Rollback**: Because we store the previous vs. current state in `changes`, the system can programmatically revert a document to any previous state recorded in the log.
- **Publishing Audit**: Tracks the transition of documents through various lifecycle states (e.g., `draft` -> `review` -> `published`), identifying bottlenecks or unauthorized changes.

## Technical Implementation Example

### Internal System Hook
This hook is injected by the core engine but only executes for collections that have opted-in via their configuration.

### Usage in Config
```typescript
const posts = defineCollection({
  slug: 'posts',
  audit: true, // <--- Opt-in to full state mutation logging
  fields: [...]
})
```

```typescript
// packages/core/src/audit/hooks.ts

export const globalAuditHook = async ({ collection, operation, req, doc, previousDoc }) => {
  // 0. Check if auditing is enabled for this collection
  if (!collection.config.audit) return;

  // 1. Identify the actor
  const userId = req.user?.id;
  if (!userId) return; // Skip tracking for unauthenticated/system tasks if desired

  // 2. Persist the ledger entry
  await req.dyrected.collection('__audit').create({
    collection: collection.slug,
    documentId: doc.id,
    operation, // 'create' | 'update' | 'delete'
    user: userId,
    timestamp: new Date().toISOString(),
    changes: {
      before: previousDoc || null,
      after:  operation === 'delete' ? null : doc,
    }
  }, { skipHooks: true }); // Crucial: avoid infinite audit loops
};
```
