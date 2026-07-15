# Nested Block Editor and Preview Layout Spec

## Overview

Redesign the edit page for collections with a `previewUrl`: preview on the left, nested block editor on the right. Instead of a long flat form, users navigate *inside* nested elements (`array`, `object`, `blocks` fields) — clicking a block/item drills into it, showing only its fields, with breadcrumb navigation back up. Clicking an element in the live preview iframe auto-navigates the editor to the owning block and focuses the specific input field.

This spec also covers the site-side authoring package work required to make click-to-edit annotation trivial for consumer site authors (both React and Vue).

---

## Decisions

> [!IMPORTANT]
> **Default Layout Flip.** For collections *with* a `previewUrl`, the preview panel is on the left (visible by default, ~55% width) and the edit form is on the right (~45% width).

> [!IMPORTANT]
> **Workflow Sidebar — two-pane only.** When a collection has both `workflowConfig` and `previewUrl`, the workflow sidebar is hidden by default and replaced with a toggle button in the form header (same affordance as the existing Eye/preview icon). The active panel (`'preview' | 'workflow'`) is persisted per-user via a new scalar `usePreference` hook (see below) under the key `preview-panel-mode-{slug}`. No 3-pane layout, no new storage mechanism.

> [!IMPORTANT]
> **Drill-in is opt-in for `array`/`object`, default-on for `blocks`.** `blocks` fields always use drill-in — the block list is the natural entry point, replacing today's inline expand/collapse. `array` and `object` fields render inline exactly as today (**zero behaviour change**) unless the schema sets `admin.drillIn: true`, in which case they follow the same drill-in pattern as `blocks`. This is an explicit author opt-in, not a heuristic (e.g. field count), and has zero blast radius on existing `array`/`object` fields.

> [!IMPORTANT]
> **Tab state survives breadcrumb navigation.** `activeTab` stays in `form-engine.tsx` local state and is untouched by drilling in/out. Drilling in hides the tab bar and shows the breadcrumb header instead; returning to root restores the tab bar with whatever `activeTab` was active before.

---

## Open Questions

> [!WARNING]
> - None outstanding — object/array threshold was resolved via `admin.drillIn` (schema-driven, not heuristic).

---

## Part 1: Core State — `NestedEditorContext`

Path tracking uses **stable segment objects**, not raw array indices, so drilling stays correct across delete/reorder/duplicate mutations (`useFieldArray`'s `field.id` is the stable id RHF already generates per row).

### `PathSegment`

```ts
export interface PathSegment {
  /** Schema field name at this level (e.g. "body", "cta"). */
  fieldName: string;
  /**
   * Cumulative RHF-resolvable path up to and including this segment
   * (e.g. "body.2" or "body.2.items.1"). Used to disambiguate
   * identically-named sub-arrays/objects that live inside different
   * parent block types, and to correlate mutation reports back to a
   * depth in activePath.
   */
  basePath: string;
  /**
   * Stable id from useFieldArray (`field.id`) if this segment is an
   * item inside an array/blocks field. Undefined for object fields
   * and the root.
   */
  stableId?: string;
  /** Human-readable label for the breadcrumb (e.g. "Hero", "Button"). */
  breadcrumbLabel: string;
}
```

### `NestedEditorContextValue`

```ts
export interface NestedEditorContextValue {
  /** Ordered path segments. Root = []. */
  activePath: PathSegment[];
  /** Push a segment. Called by BlockBuilder/ArrayFieldRenderer/ObjectFieldRenderer "Edit"/"Drill In" actions. */
  drillInto: (segment: PathSegment) => void;
  /** Navigate back to a specific depth. 0 = root. Called by breadcrumb clicks. */
  navigateTo: (depth: number) => void;
  /**
   * Called after move/remove/insert on a field array. Matches by
   * basePath (NOT bare fieldName — see "Signature correction" below)
   * against activePath. If the active segment's stableId is no longer
   * present in liveStableIds, pops back to the parent level.
   */
  reconcileAfterMutation: (basePath: string, liveStableIds: string[]) => void;
  /**
   * Imperatively navigate to a resolved container path. Called by the
   * error-summary click handler and the preview click-to-edit handler.
   */
  navigateToPath: (resolvedSegments: PathSegment[]) => void;
}
```

**Signature correction (resolved during review):** both `reconcileAfterMutation` and `getStableId` (below) must key on the cumulative `basePath`, not the bare schema `fieldName`. Two different block types can each define a sub-array field with the same name (e.g. two block types both have an `items` array) — matching on bare `fieldName` alone cannot disambiguate `body.2.items` from `body.5.items`. `PathSegment.basePath` and this signature exist specifically to close that gap.

### File

#### [NEW] `packages/admin/src/components/forms/nested-editor-context.tsx`
- Implements `NestedEditorContextValue`, `NestedEditorProvider`, `useNestedEditor()` hook.

---

## Part 2: Shared Path Resolver

Both the error-summary click handler and the preview click-to-focus handler need to convert a dotted value path (e.g. `body.2.cta.url`) into an ordered list of drillable `PathSegment[]`.

```ts
// packages/admin/src/components/forms/utils.ts — new export

/**
 * Walks the schema tree alongside a dot-notation path and returns the
 * ordered PathSegments for each drillable container boundary crossed
 * (every `blocks` field, and every `array`/`object` field with
 * `admin.drillIn: true`). Leaf field names/indices are consumed but
 * not emitted as segments.
 *
 * @param getStableId  Resolves (basePath, rawIndex) → stableId from
 *   live useFieldArray state. Takes the full cumulative RHF path
 *   (e.g. "body.2.items"), not just the leaf field name — see the
 *   signature correction note in Part 1.
 */
export function resolveContainerPath(
  fields: FieldSchema[],
  path: string,
  getStableId: (basePath: string, rawIndex: number) => string | undefined
): PathSegment[] | null
```

### File

#### [MODIFY] `packages/admin/src/components/forms/utils.ts`
- Add `resolveContainerPath` export.

---

## Part 3: Field Renderer Modifications

#### [MODIFY] `packages/admin/src/components/forms/fields/block-builder.tsx`
- Consume `useNestedEditor()`.
- Always drill-in (replaces today's inline expand/collapse entirely).
- Replace expand/collapse toggle with a "Drill In" row action → `drillInto(segment)`.
- If `activePath` points inside one of this builder's items (matched by `stableId`), render only that item's sub-form via the existing `FormFieldRenderer` + composed `basePath`.
- On every `move`/`remove`/`insert`: call `reconcileAfterMutation(basePath, fields.map(f => f.id))`.
- Keep existing drag handle, duplicate, delete controls on list rows — unchanged.

#### [MODIFY] `packages/admin/src/components/forms/fields/array-field-renderer.tsx`
- Consume `useNestedEditor()`.
- `admin.drillIn !== true` → render inline exactly as today, zero behaviour change.
- `admin.drillIn === true` → same drill-in pattern as `block-builder.tsx`, including `reconcileAfterMutation` on mutation.

#### [MODIFY] `packages/admin/src/components/forms/fields/object-field-renderer.tsx`
- `admin.drillIn !== true` → render inline exactly as today, zero behaviour change.
- `admin.drillIn === true` → render a summary row with an "Edit" button → `drillInto(segment)`. No `stableId` (object fields are singular, not list items).

---

## Part 4: Form Engine & Edit Page

#### [MODIFY] `packages/admin/src/components/forms/form-engine.tsx`
- Wrap form content in `<NestedEditorProvider>`.
- Sticky breadcrumb header above the fields area, hidden at root (`activePath.length === 0`). Each segment is a button calling `navigateTo(depth)`.
- Hide the tab bar (`<Tabs>`) when `activePath.length > 0`; `activeTab` local state is left untouched so it restores on return to root.
- Global error summary `onClick` (currently `querySelector` + scroll): before that, call `resolveContainerPath` → `context.navigateToPath(segments)` → wait one tick (`setTimeout(fn, 0)`) for the sub-form to mount → then the existing `querySelector('[data-dy-field="path"]')` + `scrollIntoView` + `.focus()`.

#### [MODIFY] `packages/admin/src/pages/collections/edit-page.tsx`
- `previewUrl` present → default `showPreview = true`; layout flips to Preview-Left (55%) / Form-Right (45%).
- `handleFieldFocus` (preview iframe click): same `resolveContainerPath` → `navigateToPath` → one-tick-wait → `querySelector` + `focus` sequence as the error-summary handler above.
- Workflow sidebar replaced with an icon-only toggle in the form header; persists `'preview' | 'workflow'` via the new `usePreference` hook under `preview-panel-mode-{slug}`.
- Mobile (`<lg`): preview stays hidden as today (`lg:block`), form takes full width.

---

## Part 5: `usePreference` — scalar preference hook

`useLayoutPreference` (existing) is hard-typed around **arrays** — `reconciledLayout` short-circuits with `if (!data || !Array.isArray(data)) return defaultKeys`, and `layout`/`setLayout`/`saveLayout` all operate on `T[]`. It's built for reorderable field-width lists, not a scalar `'preview' | 'workflow'` toggle. Forcing a scalar through it (e.g. `defaultKeys: ['preview']`) would fight its reconciliation logic for no benefit.

The SDK already exposes generic `client.getPreference<T>()` / `client.setPreference<T>()` (which `useLayoutPreference` itself calls internally) — use those directly.

```ts
// packages/admin/src/hooks/usePreference.ts
export function usePreference<T>(key: string, defaultValue: T) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<T>({
    queryKey: ['preference', key],
    queryFn: async () => {
      const res = await client!.getPreference<T>(key)
      return (res.value as T) ?? defaultValue
    },
    enabled: !!client,
    staleTime: 5_000,
  })

  const mutation = useMutation({
    mutationFn: async (value: T) => client!.setPreference(key, value, { scope: 'personal' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preference', key] }),
  })

  return { value: data ?? defaultValue, setValue: (next: T) => mutation.mutate(next), isLoading }
}
```

Usage:
```ts
const { value: panelMode, setValue: setPanelMode } =
  usePreference<'preview' | 'workflow'>(`preview-panel-mode-${slug}`, 'preview')
```

### File

#### [NEW] `packages/admin/src/hooks/usePreference.ts`

---

## Part 6: Preview Click-to-Edit — Site-Side Work

### Current state (verified against source, not assumed)

- **Admin side** (`packages/admin/src/components/live-preview/LivePreviewPane.tsx`): already listens for `dyrected-element-clicked` and forwards `event.data.path` to `onFieldFocus` (lines 33-35). The "Edit Mode" toggle button that would trigger `dyrected-enter-edit-mode`/`exit-edit-mode` exists but is commented out (lines 107-124).
- **Vue site package** (`packages/vue/src/composables/useLivePreview.ts`): **already implements the full click-capture mechanism.** On `dyrected-enter-edit-mode`, it does `querySelectorAll('[data-dy-path]')`, attaches click + hover-outline listeners to each match, and posts `dyrected-element-clicked` with the element's `data-dy-path` value on click (lines 32-71). This is further along than initially assumed — no new listener needs to be built for Vue, only the authoring ergonomics (Part 6b) and one robustness fix (below).
- **React site package** (`packages/react/src/hooks/useLivePreview.ts`): has no equivalent. Only handles `dyrected-live-preview` (data sync) and the ready handshake. Needs the click-capture mechanism built from scratch.
- **No `data-dy-path` convention exists** in any consumer site checked (`apps/www`), and no `<Blocks>`-style renderer helper exists in either `packages/react` or `packages/vue` today.

### 6a. Fix: Vue's edit-mode listener should use event delegation, not a static snapshot

`enterEditMode()` currently does one `querySelectorAll('[data-dy-path]')` scan at the moment edit mode is entered. If the block list re-renders afterward (new preview data arrives, conditional rendering changes), newly mounted elements never get listeners attached, since there's no re-scan.

**Fix:** attach a single capture-phase listener on `document` and resolve the target via `event.target.closest('[data-dy-path]')` at click time, instead of pre-binding listeners to a fixed element set. This survives Vue's reactive re-renders without needing to re-scan on every data change.

#### [MODIFY] `packages/vue/src/composables/useLivePreview.ts`
- Replace per-element `querySelectorAll` + bound listeners with a single delegated `document` click listener using `closest('[data-dy-path]')`.
- Keep the hover-outline behavior, but attach/detach via delegated `mouseover`/`mouseout` + `closest()` for the same reason.

### 6b. Build: React click-capture (parity with Vue)

#### [MODIFY] `packages/react/src/hooks/useLivePreview.ts`
- Add handling for `dyrected-enter-edit-mode` / `dyrected-exit-edit-mode` messages.
- While active, attach a capture-phase `click` listener on `document`; on click, `preventDefault()`, resolve `event.target.closest('[data-dy-path]')`, and if found, `postMessage({ type: 'dyrected-element-clicked', path }, serverURL || '*')` to `window.parent`.
- Add matching hover-outline affordance (delegated `mouseover`/`mouseout` + `closest()`), mirroring Vue's existing visual behavior.
- Respect `serverURL` for the outgoing `postMessage` target origin (already an existing option on this hook) rather than hardcoding `'*'`, for production hardening.

### 6c. Build: low-effort attribute authoring — `<Blocks>` + ambient path context + `useDyPath`

Goal: site authors should never hand-type a full dotted path like `"body.2.cta.url"`. They should only ever name the field they're rendering (`'heading'`, `'cta.url'`); index/ancestor-path bookkeeping is handled once, centrally, by a renderer component.

**Pattern chosen, and why:** evaluated against how Storyblok (`storyblokEditable(blok)` spread per block root), Contentful (`useContentfulInspectorMode().getProps(...)` per field), and Sanity (steganographic content-source-maps, no markup at all but only for text nodes and requires a much larger encoding/decoding investment) solve this. Sanity's zero-markup approach isn't reachable without new infrastructure we don't have and doesn't cover non-text elements (images, buttons); Builder.io's zero-markup approach isn't reachable at all since it requires owning the entire render tree. The Storyblok/Contentful model — one small helper call per bindable element — is the realistic target, made lighter by ambient context so authors never write indices.

#### React — `packages/react`

```tsx
// useDyPath.ts
const DyPathContext = createContext<string>('')

export function DyPathProvider({ path, children }: { path: string; children: ReactNode }) {
  return <DyPathContext.Provider value={path}>{children}</DyPathContext.Provider>
}

export function useDyPath(field: string) {
  const basePath = useContext(DyPathContext)
  return { 'data-dy-path': basePath ? `${basePath}.${field}` : field }
}
```

```tsx
// Blocks.tsx
export function Blocks({ items, components, path = 'body' }: BlocksProps) {
  return (
    <>
      {items.map((item, i) => {
        const Comp = components[item.blockType]
        if (!Comp) return null
        return (
          <DyPathProvider key={item.id ?? i} path={`${path}.${i}`}>
            <Comp {...item} />
          </DyPathProvider>
        )
      })}
    </>
  )
}
```

Author usage:
```tsx
function HeroBlock({ heading, cta }: HeroBlockProps) {
  return (
    <section>
      <h1 {...useDyPath('heading')}>{heading}</h1>
      <a {...useDyPath('cta.url')} href={cta.url}>{cta.label}</a>
    </section>
  )
}
// page:
<Blocks items={data.body} components={{ hero: HeroBlock }} />
```

##### Files
- [NEW] `packages/react/src/providers/DyPathProvider.tsx`
- [NEW] `packages/react/src/hooks/useDyPath.ts`
- [NEW] `packages/react/src/components/Blocks.tsx`
- [MODIFY] `packages/react/src/index.ts` — export the three above.

#### Vue — `packages/vue` (including JSX/TSX authoring)

Vue's `provide`/`inject` is the composition-API equivalent of React context, and works identically whether the author writes SFC templates or `.tsx` render functions.

**Vue-specific nuance:** `provide()` is scoped to the *calling component instance*, not to a render/JSX position. Looping and calling `provide()` multiple times inside one `setup()` just overwrites the same value — unlike React, where each `<Context.Provider>` in a mapped list gets its own scoped subtree from a single function component. Per-item scoping in Vue therefore requires a dedicated child component instance per item (`DyPathScope`), not a loop-and-provide inside `Blocks` itself.

```ts
// useDyPath.ts
const DY_PATH_KEY: InjectionKey<string> = Symbol('dyPath')
export function provideDyPath(path: string) { provide(DY_PATH_KEY, path) }
export function useDyPath(field: string) {
  const basePath = inject(DY_PATH_KEY, '')
  return { 'data-dy-path': basePath ? `${basePath}.${field}` : field }
}
```

```tsx
// DyPathScope.tsx — exists solely to own one provide() scope
export const DyPathScope = defineComponent({
  props: { path: { type: String, required: true } },
  setup(props, { slots }) {
    provideDyPath(props.path)
    return () => slots.default?.()
  },
})
```

```tsx
// Blocks.tsx
export const Blocks = defineComponent({
  props: {
    items: { type: Array as PropType<any[]>, required: true },
    components: { type: Object as PropType<Record<string, any>>, required: true },
    path: { type: String, default: 'body' },
  },
  setup(props) {
    return () =>
      props.items.map((item, i) => {
        const Comp = props.components[item.blockType]
        if (!Comp) return null
        return (
          <DyPathScope path={`${props.path}.${i}`} key={item.id ?? i}>
            <Comp {...item} />
          </DyPathScope>
        )
      })
  },
})
```

Author usage (`.tsx`, no templates/directives — same shape as React):
```tsx
export const HeroBlock = defineComponent({
  props: { heading: String, cta: Object },
  setup(props) {
    return () => (
      <section>
        <h1 {...useDyPath('heading')}>{props.heading}</h1>
        <a {...useDyPath('cta.url')} href={props.cta?.url}>{props.cta?.label}</a>
      </section>
    )
  },
})
// page:
<Blocks items={data.body} components={{ hero: HeroBlock }} />
```

##### Files
- [NEW] `packages/vue/src/composables/useDyPath.ts`
- [NEW] `packages/vue/src/components/DyPathScope.tsx`
- [NEW] `packages/vue/src/components/Blocks.tsx`
- [MODIFY] `packages/vue/src/index.ts` — export the three above.

### 6d. Scoping note

Because `data-dy-path` only appears where an author has used `useDyPath`/`<Blocks>`, click-to-edit only works on pages/blocks that adopt this pattern — it cannot retroactively work on arbitrary hand-written pages. Recommend rolling out `<Blocks>` first for whatever component library backs `blocks`-type fields (schema-driven, centrally maintained — annotate once, every page using it benefits), rather than promising blanket coverage across hand-authored pages.

---

## Verification Plan

### Unit Tests (new, `packages/admin/src/components/forms/__tests__/`)

- **`resolveContainerPath.test.ts`**
  - Given a schema with a nested `blocks` field containing a `cta` object, resolves `"body.2.cta.url"` to the correct `PathSegment[]` (one boundary at `body.2`, `cta` not emitted unless `admin.drillIn`).
  - Returns `null` for a path that doesn't match the schema.
  - Does not emit a boundary for leaf field segments.
  - Disambiguates two different block types that each define a same-named sub-array (`items`) at different `basePath`s.

- **`nested-editor-context.test.ts`**
  - `drillInto` pushes a segment; `navigateTo(0)` resets to root.
  - `reconcileAfterMutation` pops the path when the active segment's `stableId` is no longer present in the reported live ids, matched by `basePath`.
  - `reconcileAfterMutation` leaves the path unchanged when the active item still exists.
  - `reconcileAfterMutation` does not false-positive-match when two different containers share a bare `fieldName` but different `basePath`.

- **`isActiveOrChild.test.ts`**
  - Helper used by field renderers to decide list-view vs. focused-subform rendering — correct at each depth.

### Manual Verification

- **Drill-in**: click a block → right panel shows only that block's fields + breadcrumb. Navigate back → full block list restored, `activeTab` unchanged from before drilling in.
- **Error navigation**: trigger a validation error inside a nested block; click it in the global error summary → editor drills into the correct block and scrolls/focuses the exact field.
- **Preview click-to-edit (React site)**: click an element in the left preview iframe (rendered via `<Blocks>`/`useDyPath`) → right panel drills into the owning block and focuses the specific input.
- **Preview click-to-edit (Vue site)**: same, using the Vue `<Blocks>`/`useDyPath` equivalent, and confirm click targets added *after* entering edit mode (e.g. a newly appended block) are still clickable — validates the event-delegation fix in 6a.
- **Delete/reorder reconciliation**: drill into item at index 1; delete index 0 (so the drilled item shifts to index 0 under the hood). Breadcrumb and mounted sub-form must still reflect the correct (now-shifted) item, matched by stable id, not by stale index.
- **Workflow toggle**: on a workflow-enabled collection with a `previewUrl`, verify the preview/workflow panel choice persists across a page reload via `usePreference`.
- **`admin.drillIn` opt-out check**: confirm an existing collection with `array`/`object` fields that do *not* set `admin.drillIn` renders identically to current production behavior (regression check for the "zero blast radius" claim).
