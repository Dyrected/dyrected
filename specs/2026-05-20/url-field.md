# Implementation Plan - Premium URL Field

Currently, the `"url"` field type in Dyrected is rendered as a simple HTML `<input type="url">` string. We will upgrade this to support **dual-mode link editing**:

- **External Mode:** Enter any custom string URL (e.g. `https://google.com` or mailto link).
- **Internal Mode (Collection Reference):** Choose a Collection and search/select a specific target Document (reusing our robust autocomplete dropdown).
- **Custom Link Label:** An optional, dedicated input field for setting the link label (anchor text), perfect for menus and CTA buttons.

### [NEW] [url-field.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/components/forms/fields/url-field.tsx)

The UI field component rendering the dual-mode link selector:

- A segment/tab selector for **External** and **Internal**.
- If **External**: Render a simple `url` text input and an optional `label` input.
- If **Internal**:
  - Render a select dropdown containing all available schemas (Collections) from `useDyrected()`.
  - Render a document picker (similar to `RelationshipPicker`) to fetch and select entries from the chosen collection.
  - Render an optional `label` input.
- Handles state transformations:
  - If a simple string (e.g. `"https://..."`) is passed in, map it to `External` for backward compatibility.
  - Dispatch changes as a structured object:
    ```json
    {
      "type": "internal" | "custom",
      "url": "/pages/about-us",
      "relationTo": "pages",
      "value": "doc-id-123",
      "label": "About Us"
    }
    ```

### [MODIFY] [field-renderer.tsx](file:///Users/busola/Work/dyrected/packages/admin/src/components/forms/field-renderer.tsx)

- Import and register the new `<UrlField>` component under the `"url"` switch case instead of falling back to `<TextField>`.

---

## Verification Plan

### Automated Verification

We will run Vitest specifically on the new sqlite-compliance suite to ensure compliance passes:

```bash
pnpm --filter @dyrected/core test -- --run -t "sqlite-compliance"
```

We will build the entire monorepo to ensure TS types are 100% clean and correct:

```bash
pnpm build
```

### Manual Verification

1. Open the dev dashboard at `/Users/busola/Work/alajo-landing-page` and check that any configured `url` fields display the beautiful new segment selector.
2. Verify that existing text-based URLs load seamlessly in "External" mode.
3. Test selecting "Internal", picking the `pages` collection, and selecting a document from the popover list. Confirm that saving and re-opening the document preserves the collection reference correctly.
