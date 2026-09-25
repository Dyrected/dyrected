# Custom Admin Pages Specification

**Document Version:** 0.1.0 (Draft)
**Status:** Proposed
**Scope:** `@dyrected/core` (page + navigation types), `@dyrected/admin` (routes, navigation), `@dyrected/react`, `@dyrected/vue`
**Part of:** Custom Admin Surfaces (4 of 4). Depends on [Component Registry & Bridge](./custom-components-registry-spec.md).

---

## 1. Context & Motivation

Every admin screen today is bound to something Dyrected models: a collection, a global, an operational view, or the dashboard. Real back-office apps need screens that are none of those: a door check-in station, a reconciliation tool, an "invite guests" wizard, an analytics screen that reads several collections, or an integrations settings page.

Without a first-class page, developers either bend one of those four shapes or build the screen outside the admin and lose sidebar placement, access control, breadcrumbs and consistent chrome.

A **custom page** is a screen whose content the developer fully controls, with no collection attached. It is a first-class navigation item.

### Page vs. custom form

| Need | Use |
|---|---|
| Create/edit a record, with a custom UI | [Custom Document Form](./custom-document-forms-spec.md) |
| Show a set of records in a custom way | [Custom View Layout](./custom-view-layouts-spec.md) |
| A screen that isn't a record or a set of records | **Custom Page** |

The `thesweetunion` scanner is a form (it creates `check_ins` records). A "today's arrivals dashboard" combining RSVPs, check-ins and wishlist totals is a page.

## 2. Goals & Non-Goals

**Goals**
1. Declare a page in config. Reference a component by key. Get sidebar placement, access gating, badges, breadcrumbs and user nav customization for free.
2. Pages can implement internal routing (`/pages/reports/2026-09`) without importing the admin's router.
3. Identical hook/composable API for Vue and React.

**Non-goals**
- Server endpoints for pages. Pages call the SDK or the host's own API. Server API extension is covered in `server-api-architecture.md`.
- A page builder or CMS-style page content. That is a separate content-modeling concern.
- Enforcing security in the UI. See §5.

## 3. Configuration

```ts
export interface PageConfig {
  /** URL slug → /pages/:slug. Lowercase kebab, unique. */
  slug: string;
  label: string;
  icon?: AdminIconName;
  /** Key in AdminComponents.pages. */
  component: string;
  /** Sidebar group. Same semantics as workspace groups. Omitted → default group. */
  group?: string;
  /** Live badge in navigation. Reuses NavBadgeConfig. */
  badge?: NavBadgeConfig | string;
  /** UI gating only. See §5. */
  access?: { read?: AccessRule<any> };
  /** 'contained' (default, padded, max-width) or 'full' (edge-to-edge). */
  layout?: "contained" | "full";
  /** Serializable options readable via usePageMeta / props. */
  options?: Record<string, unknown>;
}

export function definePage<const T extends PageConfig>(config: T): T;

// dyrected.config.ts
admin: {
  pages: [
    definePage({
      slug: "arrivals",
      label: "Today's Arrivals",
      icon: "DoorOpen",
      group: "Event Day",
      component: "arrivals",
      badge: { collection: "check_ins", /* … */ },
      layout: "full",
    }),
  ],
}
```

`admin.pages` is a sibling of `admin.navigation`. Placement into groups follows the existing navigation reconciliation.

## 4. Routing

### Reserved prefix, not the catch-all

The route tree (`packages/admin/src/index.tsx`) ends with `/:workspaceSlug/:viewSlug` and `/:workspaceSlug` before `*`. A page at `/:slug` would collide with workspaces. Pages therefore live under a **reserved prefix**:

```
/pages/:slug          → page root
/pages/:slug/*        → page-internal routing (splat)
```

- The `/pages/…` route is registered before the workspace catch-alls.
- Config validation rejects a workspace whose slug is `pages` and a duplicate page slug, both as errors (`page-slug-conflict`).
- Under embedded `HashRouter` this becomes `#/pages/arrivals`. The page never sees the difference. It uses `useAdminNavigate().to.page(slug, subPath?)`.

### Internal routing without the router

```ts
interface PageRoute {
  params: Record<string, string>;      // from optional pattern (see below)
  splat: string;                       // "2026-09/details"
  searchParams: URLSearchParams;
  setSearchParams(next, opts?): void;
  navigate(subPath: string, opts?: { replace?: boolean }): void;   // stays inside this page
}
```

Pages that need parameters can declare a pattern. `slug: "reports"`, `routes: ["/:month", "/:month/:id"]` gives `params.month`. Routing stays optional. A single-screen page ignores it entirely. (See Open Question 2.)

## 5. Access

`page.access.read` hides the nav item and blocks the route with the standard "not found / no access" screen.

**This is UI gating only.** A page's data comes from SDK or host API calls, and those calls are governed by server-side access rules. A user who bypasses the UI still cannot read protected data. Docs for `definePage` must say this on the `access` property, and pages must not embed secrets or perform privileged operations client-side on the strength of the UI gate.

## 6. Component Contract

```ts
interface AdminPageProps { slug: string }
```

### `usePageMeta()`

Lets the page set the host chrome instead of rendering its own header:

```ts
usePageMeta({
  title?: string;                                 // defaults to config.label
  description?: string;
  breadcrumbs?: { label: string; to?: string }[]; // defaults: Admin › {group?} › {label}
  actions?: PageAction[];                         // header buttons: { label, icon?, onClick, disabled?, variant? }
});
```

Called reactively. In Vue it accepts a ref/getter and updates as it changes. In React it takes an object and shallow-compares to avoid effect churn. Returns `{ options }` (the config `options`).

### Other composables (from the registry spec)

`useDyrected()` (SDK client), `useDyrectedAuth()`, `useAdminSchemas()`, `useAdminNavigate()`, `useAdminNotify()`, `useAccess()`, `usePageRoute()` (above).

## 7. Framework Examples

### Vue (Nuxt)

```vue
<!-- components/admin/ArrivalsPage.vue -->
<script setup lang="ts">
import { useDyrected, usePageMeta, useAdminNavigate } from "@dyrected/vue";

const client = useDyrected();
const to = useAdminNavigate().to;

const { data: stats, refresh } = await useAsyncData(() => client.value.aggregate("check_ins", { count: "*" }));

usePageMeta({
  description: "Live door count",
  actions: [
    { label: "Open scanner", icon: "ScanLine", onClick: () => to.document("check_ins", "new") },
    { label: "Refresh", onClick: refresh },
  ],
});
</script>

<template><ArrivalsBoard :stats="stats" /></template>
```

### React

```tsx
function ArrivalsPage() {
  const client = useDyrected();
  const { to } = useAdminNavigate();
  const [stats, setStats] = useState<Stats>();
  usePageMeta({ description: "Live door count", actions: [{ label: "Open scanner", onClick: () => to.document("check_ins", "new") }] });
  useEffect(() => { let off = false; client.aggregate("check_ins", { count: "*" }).then((s) => !off && setStats(s)); return () => { off = true }; }, [client]);
  return <ArrivalsBoard stats={stats} />;
}
```

Registered as `pages: { arrivals: ArrivalsPage }`.

## 8. Navigation Integration

- `CompiledNavItem.type` (`packages/core/src/types/navigation.ts`) gains `"page"`. Page items get stable ids `page:<slug>`, so the user's navigation customizer preferences (hide, reorder, pin via `reconcileNavigation`) work unchanged.
- A page can be a Tier-2 item in a group. Sub-navigation under a page is out of scope for v1 (Open Question 1).
- Badges reuse `NavBadgeConfig`, evaluated by the existing badge pipeline.
- The compiled navigation sent to the admin includes pages the current user passes `access.read` for. The route guard re-checks.

## 9. Edge Cases

| Case | Behavior |
|---|---|
| Unresolved `component` key | Inline placeholder plus `component-unresolved` diagnostic. Nav item stays visible (so the misconfiguration is discoverable). |
| Component throws | Error boundary card in the page area, chrome intact. |
| Slug collision (page vs workspace vs reserved) | Config diagnostic error at load. The offending page is omitted from nav. |
| Embedded (`HashRouter`) vs standalone | Page uses `useAdminNavigate` only, so both work. |
| `layout: 'full'` | Removes content padding and max-width. Header still rendered unless the page sets `chrome: false` (Open Question 3). |
| Deep link to a page the user can't access | Standard no-access screen, no page code loaded. |

## 10. Implementation Plan

1. Core: `PageConfig`, `definePage`, `admin.pages`, `NavItem` type `"page"`. Diagnostics for slug conflicts and missing component.
2. Admin: `/pages/:slug/*` route ahead of the workspace catch-alls. `PageRoute` context. Page shell (header driven by `usePageMeta`, error boundary).
3. Navigation: compile pages into nav, access filtering, `page:<slug>` ids, badges.
4. Composables: `usePageMeta`, `usePageRoute` in admin `public`. React re-exports. Vue composables and ambient key `DYRECTED_PAGE_KEY`.
5. Docs plus an "arrivals" recipe.

## 11. Testing

- `/pages/:slug` resolves before workspace catch-alls. A workspace named `pages` is rejected.
- Access: hidden in nav, blocked on direct URL, component not loaded.
- `usePageMeta` updates header and breadcrumbs reactively, without an effect loop in React (per repo effect-safety rules: stable deps, no-op guarded updates).
- `usePageRoute` splat and search params under both `HashRouter` and `MemoryRouter`.
- Navigation customizer hides and reorders page items and preferences persist.
- Vue island resolves `usePageMeta()` and `usePageRoute()` with no manual provide.

## 12. Open Questions

1. **Sub-navigation.** Should a page be able to contribute Tier-3 items (like workspaces do with views)? Defer to v2 and keep internal routing as the v1 answer.
2. **Route patterns.** Is `splat` enough, leaving pattern parsing to the page (`params` can be dropped for v1), or do we ship declarative `routes` now? Proposal: splat only in v1.
3. **`chrome: false`.** Should a page be able to opt out of the host header entirely (kiosk screens)? Likely yes, mirroring `formShell: 'none'` in the forms spec.
4. **Landing page.** Should `admin.homePage: "slug"` let a page replace the dashboard as the landing route? Small and useful, but separable.
