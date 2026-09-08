# Workspace Editing & Settings Specification

**Status:** Proposed / Future  
**Package:** `@dyrected/admin`, `@dyrected/core`  
**Related Components:** `WorkspaceSwitcher` (`packages/admin/src/components/layout/workspace-switcher.tsx`), `FormEngine`  

---

## 1. Context & Motivation

In multi-tenant Dyrected applications, tenants or workspaces are represented by a designated workspace collection (e.g. `workspaces`, `tenants`, `sites`, or configured via `admin.workspaceCollection`). 

Currently:
1. **Creation**: Users can create a new workspace directly from the sidebar `WorkspaceSwitcher` dropdown via an "Add Workspace..." dialog rendered by `FormEngine`.
2. **Document Management**: Because workspaces are standard Dyrected collection items, users with appropriate permissions can navigate to `/collections/workspaces` (or the configured slug), open the document, and edit any field (branding, slug, domains, custom metadata).
3. **The UX Gap**: When working inside a specific workspace, there is no direct shortcut in the `WorkspaceSwitcher` to view or edit the active workspace's settings without having to manually locate the workspace collection in the sidebar and find the specific row.

This specification outlines proposals to enable seamless workspace editing and settings management directly from the `WorkspaceSwitcher` when building multi-tenant workspace examples.

---

## 2. Proposed Solutions

### Option A: In-Place Workspace Settings Dialog / Sheet (Recommended)

When a workspace collection is active and the current user has `update` permission on the active workspace document:

1. Add a **"Workspace Settings"** action or gear icon at the top of the `WorkspaceSwitcher` dropdown menu next to the active workspace label.
2. Clicking it opens an in-place modal or slideover sheet containing `FormEngine`, pre-populated with the active workspace's document data.
3. On save:
   - Updates the workspace record via `client.collection(workspaceCollection.slug).update(workspaceId, data)`.
   - Invalidates the `["admin-workspaces-collection"]` query cache.
   - Updates the active workspace label and metadata in context without requiring a full reload.

```
┌────────────────────────────────────────┐
│ [🏢 Acme Corp           ⚙️] [ ▾ ]      │
├────────────────────────────────────────┤
│ WORKSPACES                             │
│   Acme Corp                         ✓  │
│   Beta Staging                         │
│ ────────────────────────────────────── │
│ ⚙️ Workspace Settings...                │
│ ➕ Add Workspace...                    │
└────────────────────────────────────────┘
```

### Option B: Quick Navigation Shortcut

For setups where workspace documents have complex nested sub-collections (e.g., membership lists, billing subscriptions, domain verification tabs):

1. Provide a gear icon button in the header of the `WorkspaceSwitcher` or an item in the dropdown: `Edit Workspace Details`.
2. Clicking it navigates directly to `/collections/${workspaceCollection.slug}/${currentWorkspaceDoc.id}`.
3. Automatically sets the return breadcrumb so the user can easily return to their operational view.

---

## 3. Technical Requirements

1. **Active Document Resolution**:
   - The switcher already executes `useQuery(["admin-workspaces-collection", workspaceCollection?.slug])`.
   - Match `config.siteId` to the active document:
     ```ts
     const activeWorkspaceDoc = workspaceDocs?.find(
       (doc) => String(doc.slug || doc.siteId || doc.id) === currentSiteId
     );
     ```

2. **Permission Guarding**:
   - Check user access before rendering the edit/settings trigger. If the current user only has read/switch access but lacks update permission on the workspace collection, suppress the edit button.

3. **FormEngine Integration**:
   ```tsx
   <FormEngine
     collection={workspaceCollection.slug}
     fields={workspaceCollection.fields}
     initialValues={activeWorkspaceDoc}
     onSubmit={handleUpdateWorkspace}
     submitLabel="Save Workspace Settings"
   />
   ```

4. **Single-Tenant Compatibility**:
   - Remains completely hidden when multi-tenancy is not active (`isExplicitMultitenant === false`), preserving zero clutter for single-tenant applications.

---

## 4. Next Steps & Timeline

- Implement alongside the upcoming multi-tenant example application (`example-creator-multitenant` or AgencyOS demo).
- Verify access control rules (`read`, `update`, `delete`) for tenant administrators vs. organization members.
