# Custom Create & Edit Forms Specification

**Document Version:** 0.1.0 (Draft)
**Status:** Implemented (core, admin, react, vue, drawer). Docs remain. See [Implementation Status](#11-implementation-status).
**Scope:** `@dyrected/core` (config types), `@dyrected/admin` (routes, controller), `@dyrected/react`, `@dyrected/vue`
**Part of:** Custom Admin Surfaces (2 of 4). Depends on [Component Registry & Bridge](./custom-components-registry-spec.md).

---

## 1. Context & Motivation

A collection's create and edit screens are generated from its field schema. The only extension points are per-field (`admin.component`) and slots around the list. A developer who needs a different way to create a record has to smuggle a whole UI into a JSON field.

Real example: in `thesweetunion`, the check-in screen is a JSON field named `checkInScanner` inside a "Scanner" tab of the `check_ins` collection. The form still shows the Record tab and Save button. The actual check-in goes through a separate `server/api/check-in/scan.post.ts`, so the admin form is not the write path at all.

The target is to let a collection say:

> "Creating a `check_ins` record uses **this** component, which owns the whole screen. Editing one uses a different component."

The component must be able to create and update records through the normal pipeline (validation, access rules, hooks, drafts) without reimplementing any of it.

## 2. Goals & Non-Goals

**Goals**
1. Separate `createForm` and `editForm` per collection, plus a shared `form` fallback, and `editForm` for globals.
2. Custom forms compose built-in field inputs; they are not all-or-nothing.
3. `submit()` uses the same write path as the default form. No second API.
4. Identical composable/hook API for Vue and React.

**Non-goals**
- Declarative or visual form builders. This is component injection.
- Changing the Detail View (`displayCustomComponent`). It is read-only and separate.
- Replacing the write API. A custom form is still just a client of it.

## 3. Configuration

```ts
defineCollection({
  slug: "check_ins",
  admin: {
    components: {
      createForm: "check_ins.scanForm",     // key in AdminComponents.forms
      editForm:   "check_ins.reviewForm",
      form:       "check_ins.anyForm",       // fallback for both
      formShell:  "header",                  // 'full' | 'header' | 'none'
    },
  },
});
```

Resolution order: `createForm ?? form ?? built-in` for `mode: 'create'`; `editForm ?? form ?? built-in` for `mode: 'edit'`. Globals use `editForm`/`form` (a global is always edit). Access rules gate the route before the component mounts, so `create` access is checked before `createForm` renders.

### Shell modes

| `formShell` | Host renders | Use when |
|---|---|---|
| `full` (default) | header, breadcrumbs, status/workflow badge, default save bar, unsaved-changes guard | custom form only re-lays-out the *body* |
| `header` | header, breadcrumbs, unsaved guard | form supplies its own actions (scanner, wizard) |
| `none` | nothing | full-screen tools |

Default `full` is the least surprising: a developer who swaps the body still gets working Save and navigation.

## 4. Component Contract

Per the registry rule (identity in props, the rest in composables):

```ts
interface AdminFormComponentProps {
  collection: string;
  mode: "create" | "edit";
  documentId?: string;          // edit only
  presentation: "page" | "drawer";
}
```

### `useDocumentForm()`

```ts
interface DocumentFormApi {
  mode: "create" | "edit";
  collection: CollectionConfig;
  document: Doc | undefined;              // undefined on create, or while loading on edit
  isLoadingDocument: boolean;
  form: DyrectedFormHookResult;           // values, errors, isDirty, isSubmitting, setValue … (existing)
  permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean };
  urls: { list: string; edit?: string };
  submit(options?: SubmitOptions): Promise<SubmitResult>;
  cancel(): void;                         // honors unsaved guard
}

interface SubmitOptions {
  overrides?: Record<string, unknown>;    // merged over form values for this call only
  draft?: boolean;                        // save as draft on workflow collections
  redirect?: "edit" | "list" | "stay" | false;   // default 'edit' on create, 'stay' on edit
}

type SubmitResult =
  | { ok: true; doc: Doc }
  | { ok: false; errors: Record<string, string>; error?: DyrectedError };
```

`useDocumentForm()` composes the existing `useDyrectedForm()` and adds document-level concerns. It does not replace it, so `useField(path)` and `useDyrectedForm()` keep working inside custom forms.

### Submit semantics (the important part)

`DyrectedFormController` already has a `submit()` adapter slot (`DyrectedFormControllerAdapters.submit`). The default form wires it to the same save pipeline the admin uses today (draft handling, workflow autosave, drawer-save pipeline). Custom forms **must go through that same adapter**:

- Validation runs first; failures populate controller errors, so `useField(path).error` works with no extra code.
- Server-side validation errors from the API are mapped back into controller errors by field path. `SubmitResult.errors` carries the same map for non-field-bound UIs.
- Hooks, access rules, and audit logging run server-side as with any write. A custom form cannot bypass them.
- `overrides` exist for flows where UI state is not a field (for example, the scanner sets `rsvpRecord` from a scan result). They are merged at submit time and validated like any other value. They are not a way to write fields the user could not otherwise write. Access rules still apply server-side.

### Embedding built-in inputs

| Component | Purpose |
|---|---|
| `<DyrectedField path="guestName" />` | one built-in input, wired to the controller |
| `<DyrectedFields :names="[…]" />` / `exclude` | several fields, in the schema's layout rules (width, conditions) |
| `<DyrectedDefaultForm exclude="checkInScanner" />` | the whole default body, useful to wrap or augment |

Conditional visibility (`admin.condition` / `when`), read-only, and width rules are honored because rendering goes through the same field renderer. In Vue these come through the existing reverse bridge (see registry spec §4).

## 5. Framework Examples

### Vue (Nuxt): check-in scanner as a real create form

```vue
<!-- components/admin/ScanForm.vue -->
<script setup lang="ts">
import { useDocumentForm, useField, useAdminNotify } from "@dyrected/vue";

const { submit, form } = useDocumentForm();
const notify = useAdminNotify();
const rsvp = useField("rsvpRecord");

async function onScan(rsvpId: string) {
  rsvp.setValue(rsvpId);
  const result = await submit({ redirect: "stay" });   // check-in hook stamps the time
  if (result.ok) notify.success("Checked in");
  else notify.error(result.errors.rsvpRecord ?? "Could not check in");
}
</script>

<template>
  <QrScanner @decoded="onScan" />
  <DyrectedField path="scannedBy" />
</template>
```

Registered with `forms: { "check_ins.scanForm": ScanForm }` and `formShell: "header"`.

### React: same form

```tsx
function ScanForm() {
  const { submit } = useDocumentForm();
  const rsvp = useField("rsvpRecord");
  const notify = useAdminNotify();

  const onScan = async (id: string) => {
    rsvp.setValue(id);
    const r = await submit({ redirect: "stay" });
    r.ok ? notify.success("Checked in") : notify.error(r.errors.rsvpRecord ?? "Could not check in");
  };
  return <><QrScanner onDecoded={onScan} /><DyrectedField path="scannedBy" /></>;
}
```

## 6. Routing & Presentation

- Page routes `/collections/:slug/new` and `/collections/:slug/:id/edit` resolve the form key, then mount the component inside the chosen shell.
- **Inline relation creation** (the relationship drawer) uses the target collection's `createForm` with `presentation: "drawer"`. `submit()` then resolves to the caller's `onSuccess` and does not redirect. Opt out per collection with `admin.components.formInDrawer: false` to keep the default form in drawers.
- Prefill via query (`/new?defaults[event]=…`) is read by the default form today or should be. `useDocumentForm().form` exposes it identically. Verify and document.

## 7. Edge Cases

| Case | Behavior |
|---|---|
| Custom form never calls `submit()` | Nothing saves. The default save bar (in `full` shell) still works because it calls the same adapter. |
| Component throws | Error boundary (registry spec §7) shows a card with a "Use default form" action, so a broken custom form never blocks data entry. |
| Key unresolved | Falls back to the default form and emits `component-unresolved`. Unlike a slot, a form is essential, so it must never render empty. |
| Workflow/draft collections | `draft: true` flows through the existing draft pipeline. Custom forms do not reimplement versioning. |
| Field with its own `admin.component` | Still honored inside `<DyrectedField>`. Overrides compose. |
| Read-only / no `update` access | `permissions.canUpdate` is false, form controller is `readOnly`, `submit()` resolves `{ ok: false }` without a network call. |

## 8. Implementation Plan

1. Core types: `admin.components.{createForm,editForm,form,formShell,formInDrawer}` on collections and globals. Config validation in `defineCollection` and diagnostics for unknown shell values.
2. Admin: resolve keys in `EditEntryPage`, mount inside shell variants, wire `DocumentContext` (controller + document loading + permissions).
3. `useDocumentForm` in admin `public`. React re-export and Vue composable. Ambient key `DYRECTED_DOCUMENT_KEY`.
4. `<DyrectedField>`, `<DyrectedFields>`, `<DyrectedDefaultForm>`. Vue via the reverse bridge.
5. Drawer integration.
6. Docs plus a `check-in` recipe in `packages/knowledge` (recipes exist for kanban and order fulfillment).

## 9. Testing

- `submit()` reaches the same handler as the default save (spy on the adapter). Hooks run.
- Server validation errors surface in `useField(path).error` and in `SubmitResult.errors`.
- Each shell mode renders the expected chrome.
- Key resolution order and fallbacks. A throwing form triggers the fallback action.
- Vue island: `useDocumentForm()` works with no manual provide.
- Drawer: `createForm` used, `onSuccess` called, no redirect.

## 10. Open Questions

1. Is `full` the right default shell, or `header`? `full` is safest for body-swaps. `header` is more natural for tools like the scanner.
2. Should `overrides` be allowed on fields marked `admin.readOnly`? Proposal: yes, since server access rules are the real gate and readOnly is a UI hint. Confirm no field-level `access.update` is being bypassed.
3. Should globals get a distinct `mode`? Proposal: no, a global is `mode: "edit"` with no `documentId`.

---

## 11. Implementation Status

| Section | Item | Status | Notes |
|---|---|---|---|
| 3 | `createForm` / `editForm` / `form` / `formShell` on collections, `editForm` / `form` / `formShell` on globals | Done | `DocumentFormComponentSlots`, `GlobalFormComponentSlots`, `FormShell` in `@dyrected/core`. Keys feed `collectReferencedComponentKeys().forms` |
| 3 | Resolution order and fallback | Done | `resolveFormComponent`. An unregistered key renders the default form and warns in development |
| 3 | Shell modes `full` / `header` / `none` | Done | `full` is the default (open question 1) |
| 4 | `AdminFormComponentProps` | Done | Now `{ collection, mode, documentId?, presentation }`. The old `{ id, readOnly }` shape had no consumers |
| 4 | `useDocumentForm()` (React and Vue) | Done | Composes `useDyrectedForm()`. Vue gets refs through a bridge-maintained ref (`DYRECTED_DOCUMENT_KEY`) |
| 4 | `submit()` uses the default save path | Done | Goes through `FormEngine`'s submit adapter. Validation first, then the same mutation the Save bar uses |
| 4 | Server validation errors on fields | Done | `DyrectedError.errors` are set on the matching field, and returned in `SubmitResult.errors`. Errors with no field use the key `_form` |
| 4 | `SubmitOptions.overrides` | Done | Applied through the form so they validate like any value, and restored if the submit fails. Allowed on `admin.readOnly` fields (open question 2). Field `access.update` is enforced by the server only |
| 4 | `SubmitOptions.redirect` | Done | Default `edit` on create, `stay` on edit. `list` goes to the list (the detail page for a global) |
| 4 | `SubmitOptions.draft` | Dropped | The default Save already saves a draft on workflow collections, and publishing is a workflow transition. A `draft` flag would change nothing, so it was left out rather than shipped as a no-op |
| 4 | `SubmitOptions.silent` | Added | Skips the success and error toasts, so a form that reports its own outcome does not show two |
| 4 | `<DyrectedField>`, `<DyrectedFields>`, `<DyrectedDefaultForm>` | Done | Render through `FormFieldRenderer`, so conditions, widths, access and `admin.component` apply. Vue renders them in the React tree through a portal, so form contexts are kept |
| 4 | `cancel()` honors the unsaved guard | Partial | The admin has no router-level blocker, only `beforeunload`. `cancel()` asks for confirmation when the form is dirty. A router blocker is a separate change |
| 6 | Page routes `/new` and `/:id/edit`, globals edit | Done | Access is checked before the form mounts. Globals do not serialize collection-level access, so the server is the gate and `permissions.canUpdate` is `true` |
| 6 | Inline relation creation with `presentation: "drawer"` | Done | Both the relationship drawer and the picker's create dialog. Both now save through `saveDrawerDocument` |
| 6 | `formInDrawer: false` | Done | |
| 6 | Prefill via query | Verified | The default form reads plain `?field=value` into the defaults on create (not `defaults[field]`), and `useDocumentForm().form` sees them. Documented as such |
| 7 | Throwing form shows "Use default form" | Done | `AdminComponentErrorBoundary` gains `onUseDefault` |
| 7 | Unresolved key emits `component-unresolved` | Dropped | Same decision as the registry spec. The default form renders and development builds warn |
| 8.1 | Diagnostics for unknown shell values | Done | Source `adminComponents` in `collectConfigDiagnostics`, returned in `/api/schemas` and listed on the dashboard's attention list |
| 8.6 | Docs and `check-in` recipe | Docs remain | Example app has a walk-in `createForm` and an `editForm` body swap |

### Open questions, resolved

1. **Default shell:** `full`.
2. **`overrides` on `admin.readOnly` fields:** allowed. Server access rules are the gate, and no client-side check was added.
3. **Globals:** `mode: "edit"` with no `documentId`.
