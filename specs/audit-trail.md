# Audit Trail

Automatic injection of system fields to track document lifecycle.

## Overview
Every collection in Dyrected automatically receives audit fields without explicit developer configuration. These fields are managed by internal system hooks.

## Injected Fields
- `createdBy`: Relationship to the `__admins` collection (or relevant auth collection if created via API).
- `updatedBy`: Relationship to the `__admins` collection.
- `createdAt`: Timestamp of document creation.
- `updatedAt`: Timestamp of last modification.

## Population Logic
- **Create Hook**: On document creation, the `createdBy` and `updatedBy` fields are populated using the ID of the currently authenticated user. `createdAt` and `updatedAt` are set to the current system time.
- **Update Hook**: On document update, the `updatedBy` field is updated with the current user ID, and `updatedAt` is refreshed.
