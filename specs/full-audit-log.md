# Full Audit Log

A low-level system collection for tracking all state mutations.

## Overview

Dyrected maintains a hidden internal collection named `__audit` that acts as a ledger for all write operations across the entire CMS.

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
