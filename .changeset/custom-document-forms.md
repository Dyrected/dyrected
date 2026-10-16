---
"@dyrected/core": minor
"@dyrected/admin": minor
"@dyrected/react": minor
"@dyrected/vue": minor
---

A collection or global can now replace its create and edit screens with your own component, while saving still goes through the normal pipeline: validation, access rules, hooks and drafts.

**For app developers**

- **Point a collection at a form.** Set `createForm`, `editForm`, or a `form` fallback for both in `admin.components`, then register a component under that key in `components.forms`:

  ```ts
  defineCollection({
    slug: "check_ins",
    admin: {
      components: {
        createForm: "check_ins.scanForm",
        editForm: "check_ins.reviewForm",
        formShell: "header", // "full" (default) | "header" | "none"
      },
    },
  })
  ```

  Globals take `editForm` and `form` the same way. A key that is not registered falls back to the built-in form, so an editor is never left with an empty screen.
- **Choose how much of the page stays.** `formShell: "full"` keeps the header, status badge and Dyrected's Save bar, so you only re-lay-out the body. `"header"` keeps the header and leaves saving to your form. `"none"` gives your form the whole screen.
- **Save with `useDocumentForm()`.** It returns the saved `document`, `permissions`, the `form` (values, errors, `setValue`) and `submit()`. `submit({ overrides, redirect, silent })` resolves to `{ ok: true, doc }` or `{ ok: false, errors }` and never throws. Server validation errors land on the matching field, so `useField(path).error` works with no extra code. `redirect` defaults to opening the new record after a create and staying put after an edit.
- **Reuse the built-in inputs.** `<DyrectedField path="guestName" />`, `<DyrectedFields names={[...]} />` and `<DyrectedDefaultForm exclude={[...]} />` render the real inputs with their labels, conditions, widths, read-only state and `admin.component` overrides.
- **Relationship drawers use it too.** Creating a related record inline opens the target collection's `createForm` with `presentation: "drawer"`. Set `formInDrawer: false` to keep the built-in form there.
- **Vue and Nuxt.** `useDocumentForm()`, `DyrectedField`, `DyrectedFields` and `DyrectedDefaultForm` exist in `@dyrected/vue` with state as refs, and work inside a registered form with no manual `provide`.
- **Safe by default.** A form that throws shows an error card with **Retry** and **Use default form**. `permissions` only decides what to show; the server enforces access on every save.

**For plugin and integration authors**

- `@dyrected/core` exports `FormShell`, `DocumentFormComponentSlots` and `GlobalFormComponentSlots`. `collectReferencedComponentKeys` now fills `forms`, so `npx dyrected generate:types` types `Register.componentKeys.forms` and the unused-registration warning covers forms.
- Config diagnostics report an unknown `formShell` and non-string form keys (source `adminComponents`).
- `@dyrected/admin/public` exports `DocumentContext`, `DYRECTED_DOCUMENT_KEY` and `buildDocumentFormApi` for hosts that embed the document context.

**Upgrade notes**

- `AdminFormComponentProps` changed shape: it is now `{ collection, mode, documentId?, presentation }`. Nothing in Dyrected consumed it before, so this only matters if you typed a placeholder against the old `{ id, readOnly }`.
- The inline "Create" dialog on relationship fields now saves through the same pipeline as the relationship drawer. A failed save shows an error toast instead of only logging to the console, and a successful one shows a success toast.
- The hooks and components are marked experimental.
