# Operational Views & Dynamic Navigation Specification

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Owner:** Core Architecture & Admin UI Team  
**Scope:** `@dyrected/core`, `@dyrected/admin`, `@dyrected/sdk`  

---

## 1. Context & Motivation

In traditional content management systems, admin navigation mirrors the physical database schema:

```text
- Dashboard
- Media (fixed bucket)
- Collections (all database tables listed alphabetically)
- Auth / Users (fixed bucket)
- Globals / Configuration
```

While functional for basic content editing, this schema-bound structure fails in **operational, backoffice, and fintech applications** (e.g., investment portals, fulfillment desks, compliance hubs, risk operations).

### The Operational Reality

Real-world operations teams think in **workflows and queues**, not database tables:

1. **Multi-Collection Tasks:** A "KYC Review" workflow touches `investors` (user profiles), `documents` (identity proofs in media/uploads), and `compliance_notes`. Forcing an analyst to navigate between disconnected menu sections degrades throughput.
2. **Artificial Entity Prisons:** Treating `users` and `media` as rigid, unmovable sections prevents grouping related resources logically (e.g., placing `investor_documents` inside an "Onboarding" group or `admins` under "Security").
3. **Personal Noise & Clutter:** A compliance reviewer only cares about pending verifications; an inventory manager only cares about shipments. Just as Dyrected supports reordering and toggling table columns, users should be able to reorganize, hide, and pin navigation items to suit their personal role and daily routine.

This specification details the end-to-end design for **Operational Views**, **Polymorphic Navigation**, **Contextual Workspace Routing**, and **User-Level UI Navigation Customization**.

---

## 2. Navigation Hierarchy & Mental Model

The hierarchy is strictly bounded to a clean 3-tier structure to eliminate sidebar cognitive overload:

```text
Tier 1: Group (Collapsible Section Header)
  └── Tier 2: Nav Item (Operational View, Collection, or Global)
        └── Tier 3: Subnav Item (Specific View / Filtered Workspace)
```

### Visual Representation

```text
▼ COMPLIANCE & RISK (Group)
  ▼ 🛡️ KYC Review (Operational View Nav Item)
      • Pending Verification [14] (Subnav View - investors collection)
      • Flagged Documents [3]     (Subnav View - media/uploads collection)
      • Escalated Cases           (Subnav View - audit_logs collection)
    Accredited Investors          (Subnav View - investors collection)

▼ OPERATIONS (Group)
  ▼ 📦 Order Desk (Operational View Nav Item)
      • Needs Shipment [8]        (Subnav View - orders collection)
      • Returns & Disputes        (Subnav View - returns collection)

▼ PLATFORM DATA (Default/Fallback Group)
    📁 All Media                  (Collection Nav Item)
    👥 User Directory             (Collection Nav Item)
```

---

## 3. Developer API (`@dyrected/core`)

### 3.1 The Unified Navigation Primitive: `defineWorkspace`

Instead of fragmenting the API into multiple single-purpose functions, Dyrected provides **one unified, strongly-typed primitive**:

```ts
defineWorkspace({ ... })
```

> [!NOTE]
> **API Unification & Multi-Tenancy Disambiguation:**
> `defineWorkspace` is the canonical primitive for operational workspaces, custom navigation items, and collection-level views. `defineWorkspace` has been removed.
>
> To avoid naming collision with multi-tenancy (which previously used `WorkspaceSwitcher`), multi-tenancy will be renamed to `Tenant` / `TenantSwitcher` in an upcoming PR, reserving the term "Workspace" strictly for operational hubs.

#### How Grouping Works: Consistent with Collections

In Dyrected collections, grouping is achieved simply by setting `group: "Operations"`. **Navigation items follow the exact same model:**

- Every `defineWorkspace` can declare `group: "Operations"`.
- Dyrected automatically aggregates all collections, operational views, and links sharing that group into a collapsible section in the sidebar.
- No bulky wrapper functions or artificial nesting required.

#### The "First View is Default" Rule

When defining views on an operational workspace item, **the first view in the `views` array is automatically the default view**, eliminating redundant `default: true` flags.

---

### 3.2 Covering All Existing Scenarios with `defineWorkspace`

`defineWorkspace` elegantly satisfies every admin navigation requirement across the framework:

#### Scenario 1: Standalone Operational Workspace (Multi-Collection)

Omit `addToCollection`. The item renders as a top-level operational workspace in the sidebar:

```ts
export const kycReviewWorkspace = defineWorkspace({
  slug: "kyc-review",
  label: "KYC Review",
  icon: "ShieldAlert",
  group: "Compliance & Risk",
  badge: { count: true },
  views: [
    defineView({
      collection: "investors",
      slug: "pending",
      label: "Pending Verification", // <-- Automatically the default view!
      filter: { kycStatus: "pending" },
      layout: "table",
      columns: ["name", "email", "bvn", "createdAt"],
    }),
    defineView({
      collection: "documents",
      slug: "identity-proofs",
      label: "ID Documents",
      filter: { verified: false },
      layout: "cards",
    }),
  ],
});
```

#### Scenario 2: Injecting Views into an Existing Collection (`addToCollection`)

Specify `addToCollection: "investors"`. Instead of creating a new menu item, this **injects views directly into the `investors` collection's submenu**:

```ts
defineWorkspace({
  addToCollection: "investors",
  group: "Operations", // Optionally moves Investors into this group too
  views: [
    defineView({
      slug: "accredited",
      label: "Accredited Investors",
      icon: "Award",
      filter: { accredited: true },
    }),
  ],
});
```

#### Scenario 3: Sparse Ordering Without Declaring the Whole Menu (`after`, `before`, `order`, `position`)

In projects with 15–30 collections, developers should **never** have to re-declare every single collection in `admin.navigation` just to insert an item or change an order. Dyrected provides 3 complementary sparse ordering mechanisms:

##### 1. Relative Anchoring (`after` / `before`)

Insert an item immediately before or after any existing collection or nav item without declaring the rest:

```ts
// Inserts Fraud Review right after the "orders" collection in the sidebar
defineWorkspace({
  slug: "fraud-review",
  label: "Fraud Review",
  after: "orders", // 👈 Spliced immediately after the orders collection
  views: [ /* ... */ ],
});

// Moves existing Media collection into Content, positioned right before Articles
defineWorkspace({
  collection: "media",
  group: "Content",
  before: "articles", // 👈 Positioned immediately before articles
});
```

##### 2. Numeric Sort Weight (`order`)

Items within the same group are sorted in ascending order (default `order: 100`):

```ts
defineWorkspace({
  slug: "urgent-queue",
  label: "Urgent Actions",
  group: "Operations",
  order: 1, // 👈 Floats to the top of the "Operations" group
  views: [ /* ... */ ],
});
```

*Tip:* Collections can also define `admin: { group: "Commerce", order: 10 }` directly in their collection schema, keeping ordering co-located.

##### 3. Group and Extreme Anchoring (`position`, `NavGroup.order`)

- `position: "first"` or `position: "last"`: Instant shortcut to stick an item at the head or tail of its group.
- `group: { name: "Operations", order: 1 }`: Sets the sort order of the entire group accordion in the sidebar relative to other groups.

#### Scenario 4: Global Configuration Singletons

Place or re-group any global:

```ts
defineWorkspace({
  global: "site_settings",
  group: "Settings",
});
```

#### Scenario 5: Dashboard Shortcut

Customize or position the dashboard:

```ts
defineWorkspace({
  dashboard: true,
  label: "Executive Summary",
  icon: "LayoutDashboard",
});
```

#### Scenario 6: Custom Internal Routes & External URLs

Add direct links to external tools (e.g. Stripe, Metabase) or custom pages:

```ts
defineWorkspace({
  label: "Stripe Dashboard",
  href: "https://dashboard.stripe.com",
  icon: "ExternalLink",
  group: "Finance",
});
```

#### Scenario 7: Single-View vs. Multi-View UX (Smart Accordion)

- **`views.length === 1`:** Clicking the menu item navigates **directly** to that view without rendering an unnecessary dropdown accordion arrow.
- **`views.length > 1`:** Renders as an expandable accordion showing all child views in the sidebar.

#### Scenario 8: Group Configuration with Metadata

If a group requires an explicit icon or a custom default collapsed state:

```ts
defineWorkspace({
  slug: "disputes",
  label: "Disputes Desk",
  group: {
    name: "Risk & Fraud",
    icon: "ShieldAlert",
    defaultExpanded: false,
  },
  views: [ /* ... */ ],
});
```

#### Scenario 9: Role-Based Access Control (`access`)

Hide sensitive operational views from unauthorized team members:

```ts
defineWorkspace({
  slug: "audit-logs",
  label: "Security Audit",
  access: ["super_admin", "compliance_lead"],
  views: [ /* ... */ ],
});
```

#### Scenario 10: Automatic Merge & Splice Algorithm

Developers only declare what they care about customizing. Dyrected's navigation compiler resolves the sidebar menu using a deterministic 5-step pipeline:

1. **Auto-Discovery:** Collects all defined collections, globals, and media resources.
2. **Override & Placement:** Applies items defined in `admin.navigation`. If an item targets an existing collection via `collection: "media"`, it adopts those properties (e.g. custom group or label).
3. **Relative Splice:** Evaluates `before` and `after` anchors, splicing items immediately adjacent to their target slugs.
4. **Group & Order Sorting:** Sorts groups by `group.order` (ascending), then sorts items within each group by `order` (ascending, default 100), maintaining insertion order stability for unweighted items.
5. **Fallback Auto-Merge:** Any collections or globals omitted from `admin.navigation` automatically merge below in their default sections (`Collections`, `Globals`, `Media`), ensuring zero orphaned resources and zero boilerplate.

---

### 3.3 TypeScript Definitions for `defineWorkspace`

```ts
export interface NavGroup {
  name: string;
  slug?: string;
  icon?: string;
  defaultExpanded?: boolean;
  /** Sort order for the group section in the sidebar (lower numbers appear first). */
  order?: number;
}

/** Backwards-compatible type alias */
export type NavGroupMetadata = NavGroup;

export interface DefineWorkspaceOptions {
  /** If provided, injects views into an existing collection submenu. If omitted, stands alone. */
  addToCollection?: string;

  /** References an existing collection to position it in navigation. */
  collection?: string;

  /** References an existing global to position it in navigation. */
  global?: string;

  /** Designates this item as the dashboard link. */
  dashboard?: boolean;

  /** Stable URL slug for standalone operational workspaces (`/:slug`). */
  slug?: string;

  /** Display label in the sidebar (defaults to collection/global label when applicable). */
  label?: string;

  /** Lucide icon name (e.g. "ShieldAlert", "Users", "Briefcase"). */
  icon?: string;

  /** Section group name (string) or group object with icon and default expanded state. */
  group?: string | NavGroup;

  /** Relative position: insert immediately after this collection or nav item slug. */
  after?: string;

  /** Relative position: insert immediately before this collection or nav item slug. */
  before?: string;

  /** Numeric sort weight within its group (lower numbers first, default 100). */
  order?: number;

  /** Fast shortcut to pin item to start or end of its group: 'first' | 'last'. */
  position?: "first" | "last";

  /** Real-time counter badge (auto-computed from primary view or custom aggregate). */
  badge?: { count: boolean } | string;

  /** Role-based access rules controlling who can see this navigation item. */
  access?: string[] | AccessRule;

  /** Custom internal route or external URL. */
  href?: string;

  /** Views belonging to this item. The first view is automatically the default. */
  views?: DefineViewOptions[];
}

/** Configuration options for defining an operational workspace or customizing placement of collections/globals. */
export type DefineWorkspaceOptions = DefineWorkspaceOptions;

/** Helper to define an operational workspace or customize placement of collections/globals. */
export function defineWorkspace(options: DefineWorkspaceOptions): DefineWorkspaceOptions {
  return options;
}

/** @deprecated Use `defineWorkspace` instead. */
export function defineWorkspace(options: DefineWorkspaceOptions): DefineWorkspaceOptions {
  return defineWorkspace(options);
}
```

---

## 4. Direct Contextual Workspace Routing (`/:workspaceSlug/:viewSlug`)

To keep URLs clean, professional, and natural, operational workspaces mount directly at the root path level **without any `/ops` route prefix**.

### 4.1 Route Hierarchy & Behavior

| URL Pattern | Target | Resolution & Engine Behavior |
| :--- | :--- | :--- |
| `/:workspaceSlug` | Root Workspace Entrypoint | **HTTP 307 / Client Redirect** to the workspace's default first view (`/:workspaceSlug/:firstViewSlug`). Single-view items also resolve seamlessly here. |
| `/:workspaceSlug/:viewSlug` | Operational View Interface | **Mounts directly**: Resolves the operational workspace, activates the designated collection view, and renders `CollectionViewLayout`. |
| `/:workspaceSlug/:viewSlug?record=:id` | Record Drawer / Detail Peek | Keeps the operator within their operational queue while inspecting or editing the target record in a side peek drawer. |

#### Why No `/ops` Prefix?

- **Domain-Driven URL Design:** Operational workspaces are first-class business contexts. URLs such as `/kyc-review/pending`, `/fraud-queue/unresolved`, and `/fulfillment/backordered` read naturally and feel like custom enterprise software rather than a generic CMS wrapper.
- **Direct Link Shareability:** Operators copying and pasting links to teammates in Slack or email share clear, self-explanatory URLs that land directly on the exact view with all active filters.

### 4.2 Router Matching Precedence & Reserved System Protection

Because workspace routes are mounted dynamically at root (`/:workspaceSlug/:viewSlug`), the router strictly enforces precedence so dynamic routes never collide with static system routes.

```text
Incoming Request
       │
       ▼
1. Exact Static Routes? ──────► `/` (Dashboard), `/setup`, `/login`, `/logout`
       │ (No match)
       ▼
2. Static Prefix Routes? ─────► `/collections/*`, `/globals/*`, `/settings/*`, `/api/*`
       │ (No match)
       ▼
3. Active Workspace Routes? ──► Matches registered `slug` in `admin.navigation`
       │                         ├── `/:workspaceSlug/:viewSlug` (Renders Operational View)
       │                         └── `/:workspaceSlug` (Redirects to first view)
       │ (No match)
       ▼
4. Fallthrough ───────────────► `<AdminNotFound />` (404 Page)
```

#### Build-Time & Schema Validation Protection

`@dyrected/core` validates all navigation item slugs during schema initialization. If a developer attempts to declare a workspace with a reserved name:

```ts
// ❌ Throws compile/runtime configuration error
defineWorkspace({
  slug: "collections", // or "globals", "api", "setup", "settings", "login"
  label: "All Collections",
  views: [ /* ... */ ],
});
```

Dyrected terminates initialization immediately with:
> `Error: [Dyrected Config] The slug 'collections' in navigation item 'All Collections' is a reserved system path and cannot be used as an operational workspace slug.`

### 4.3 Breadcrumbs & Header Hierarchy

When navigating to `/kyc-review/pending`:

```text
Home / KYC Review / Pending Verification
```

- **Top Bar / Page Header:** Renders the operational workspace icon and title (`KYC Review`), the view switch tabs (when multiple views exist), view-level metrics, and bulk action triggers.
- **Underlying Engine Reuse:** The page mounts Dyrected's existing `CollectionViewLayout` component (`table`, `kanban`, `cards`, `calendar`, `gantt`, or `spreadsheet`), pointing to the view's designated collection with preset filters, sort rules, actions, and columns applied. Zero duplicate view engine plumbing is required.
- **Stateful Query Parameters:** Search, pagination, and filter modifications are synchronized to URL query parameters:

  ```text
  /kyc-review/pending?page=2&sort=-createdAt&search=adams&status=flagged
  ```

---

## 5. Dynamic Badges & Counters

Operational items in the sidebar can display real-time numeric badges (e.g. `[14]` pending items).

### 5.1 Badge Configuration

```ts
defineWorkspace({
  slug: "kyc-review",
  label: "KYC Review",
  badge: {
    // Mode 1: Auto-count based on primary view's filter
    count: true,
    
    // Mode 2: Custom aggregate rule evaluated on the database
    aggregate: {
      collection: "investors",
      where: { kycStatus: { equals: "pending" } },
    },
    
    // Visual variant
    variant: "warning", // 'default' | 'warning' | 'destructive' | 'info'
  },
  views: [ /* ... */ ],
});
```

### 5.2 Server Resolution & Client Refresh

1. Badges are resolved using high-speed indexed count queries:

   ```sql
   SELECT COUNT(*) FROM collection_investors WHERE kyc_status = 'pending';
   ```

2. The Admin UI fetches navigation badge counts in a batched single-payload endpoint:
   `GET /api/admin/navigation/badges`
3. Badges refresh automatically when actions/mutations complete or when navigating between views.

---

## 6. User Experience: UI Reorganization & Personalization

Just like table columns in Dyrected can be reordered, hidden, or pinned, users can personalize their Admin sidebar.

### 6.1 The "Customize Navigation" Drawer

A gear icon (`Customize Navigation`) in the sidebar footer opens a dedicated reordering and customization drawer:

1. **Dual Reordering Modes (Drag-and-Drop + Stepper Buttons):**
   - **Drag-and-Drop Handles:** Direct sorting with `@dnd-kit/sortable` via grip icons (`GripVertical`).
   - **Move Up (↑) / Move Down (↓) Buttons:** Accessible, single-click buttons on every item and section to reorder sequentially without requiring mouse dragging.
   - **Keyboard Navigation:** Full ARIA-compliant keyboard sorting (Space/Enter to pick up, Arrow keys to reposition, Enter to drop).
2. **Pinned / Favorites Section:** Users can pin frequently visited views, operational queues, or collections to a "Favorites" zone at the very top of the sidebar.
3. **Visibility Toggles:** Hide clutter with one click (e.g. hiding `media` or `audit_logs` for team members who never touch them).
4. **Reset Button:** "Reset to System Default" restores the developer's original config.

### 6.2 Visual Navigation Customizer: Groups, Nav Items & Views

To give operations leads and power users full workflow autonomy without code changes, the navigation customizer allows creating and organizing resources across all **three tiers**.

**100% Code-UI Schema Parity:** There is zero difference between what can be defined in code schema (`defineWorkspace`, `defineView`, `NavGroup`) and what can be configured in the UI. Both produce identical data structures. This allows `@dyrected/cli` schema sync to seamlessly serialize UI configurations back into TypeScript config files, and vice versa.

```text
┌──────────────────────────────────────────────────────────────┐
│  Customize Navigation                                        │
│                                                              │
│  [ + New Group ]   [ + New Nav Item ]                        │
│                                                              │
│  ▼ Daily Triage (Group)                                [✏️]  │
│  ▼ 🛡️ KYC Desk (Nav Item)                              [✏️]  │
│      ⋮⋮ • Pending Verification (investors) [↑] [↓]     [...] │
│      ⋮⋮ • ID Documents (documents)         [↑] [↓]     [...] │
│      [ + Add Subview ]                                       │
│                                                              │
│  ▼ Compliance & Risk (Group)                                 │
│  ▼ 👥 Investors (Collection Nav Item)                        │
│      • All Investors                                         │
│      • Accredited Investors                                  │
│      [ + Add Subview ]                                       │
│                                                              │
│  [ Reset to System Defaults ]               [ Save Changes ] │
└──────────────────────────────────────────────────────────────┘
```

#### The 3 Creation Modals & Capabilities

1. **`[ + New Group ]` (Tier 1: Section Header / Folder):**
   - **Fields:** Group Title (e.g. `"Daily Triage"`), Icon picker (e.g. `Folder`, `Inbox`, `Briefcase`), and default collapsed state.
   - **Behavior:** Creates an empty collapsible group container that can receive both developer-defined and user-created Nav Items.

2. **`[ + New Nav Item ]` (Tier 2: Operational Workspace / Menu Item):**
   - **Fields:** Label (e.g. `"KYC Desk"`), Icon, URL slug (`/kyc-desk`), and Parent Group (or Standalone).
   - **Behavior:** Creates an operational workspace container mounted directly at `/:workspaceSlug/:subviewSlug`. Users can immediately populate it by adding new subviews or dragging existing views into it.

3. **`[ + Add Subview ]` (Tier 3: View / Subnav Queue):**
   - **Schema Equivalence:** Subviews created in the UI use the **exact same `DefineViewOptions` interface** from `@dyrected/core` as developer-defined views (`defineView`). There is zero impedance mismatch.
   - **Configuration:** View Label (e.g. `"Pending KYC"`), Icon, Target Collection (`investors`), Target Nav Item / Collection, Layout (`table`, `kanban`, `cards`, `calendar`, `gantt`), Columns, and Filter Presets (e.g. `{ kycStatus: "pending" }`).
   - **Behavior:** Mounts as an active tab and subnav link under the selected Nav Item or Collection.

#### Moving and Relocating Subviews Across the Hierarchy

1. **Moving Views Between Nav Items & Collections:**
   - Any subview (e.g. `KYC Review` inside `investors`) can be moved into any Nav Item or Group.
   - **Interaction:**
     - **Option 1 (Drag & Drop):** Drag the subview handle across groups/items using `@dnd-kit/sortable`.
     - **Option 2 ("Move to..." Menu):** Click the item's `...` action menu -> select `Move to...` -> pick the destination Nav Item or Group.
     - **Option 3 (Step Up/Down):** Use `Move Up` / `Move Down` buttons across section delimiters.
2. **Behavior in the Original Collection:**
   - By default, moving a subview to a custom Nav Item relocates it to eliminate sidebar noise.
   - An option toggle `[x] Keep shortcut in collection submenu` allows preserving a reference in the original collection.

### 6.3 Structured Preferences Architecture: Hybrid Frontend/Backend Contract

Managing complex UI states (e.g. customized navigation trees, custom groups, column layouts) requires a resilient contract between the client and server.

To maintain maximum **frontend agility** without compromising **backend security and data integrity**, Dyrected adopts a **hybrid division of responsibilities**:

```text
┌────────────────────────────────────────────────────────┐
│                   FRONTEND (UI & SDK)                  │
│  • Strongly-typed Preference Registry (TypeScript)    │
│  • 0ms Optimistic UI via localStorage                  │
│  • Debounced Server Writes (400ms)                     │
│  • Schema Versioning & Client Migrations (v1 -> v2)   │
│  • Fallback on corrupt JSON                            │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST (PUT /api/preferences/:key)
┌──────────────────────────▼─────────────────────────────┐
│                    BACKEND (@dyrected/core)            │
│  • Schema-Agnostic JSON Storage (Doesn't care about UI)│
│  • 3-Tier Cascading Resolution:                        │
│      Personal -> Role Default -> Global -> null        │
│  • RBAC Access Control:                                │
│      - Anyone can write personal                       │
│      - Only Admins can write Role/Global               │
└────────────────────────────────────────────────────────┘
```

#### 6.3.1 Backend Responsibilities (`@dyrected/core`)

The backend engine remains **schema-agnostic** regarding UI payload shapes, but strictly enforces **storage, scoping, and RBAC authorization**:

1. **Schema-Agnostic JSON Storage:**
   - Personal preferences are stored on the user document under `__preferences[key]`.
   - Role-level templates are stored in `__role_preferences[role][key]`.
   - Global workspace defaults are stored in `__global_preferences[key]`.
2. **3-Tier Cascading Resolution on `GET /api/preferences/:key`:**
   When a client requests a preference without an explicit scope override, the backend resolves the value down a priority waterfall:
   $$\text{Personal Preference} \longrightarrow \text{Role Default Template} \longrightarrow \text{Global Default} \longrightarrow \text{null}$$
   *If a user has never touched their navigation customizer, they seamlessly inherit their role's layout. If no role layout exists, they inherit the workspace global layout.*
3. **RBAC Security Enforcement (`PUT /api/preferences/:key`):**
   - Any authenticated user can write `scope=personal`.
   - **Only Administrators** (`isUserAdmin(user)`) can write `scope=role` or `scope=global`. Any non-admin attempting a role/global mutation receives a `403 Forbidden`.
4. **Promoted Physical Column by Default (`promoted: true`):**
   - On all auth-enabled collections (e.g. `users`, `admins`, `investors`), `__preferences` is **automatically promoted to a dedicated physical database column** (`type: "json"`, `promoted: true`):
     - **PostgreSQL:** `ALTER TABLE collection_users ADD COLUMN IF NOT EXISTS "__preferences" JSONB DEFAULT '{}'::jsonb;`
     - **MySQL:** `ALTER TABLE \`collection_users\` ADD COLUMN \`__preferences\` JSON;`
     - **SQLite:** `ALTER TABLE collection_users ADD COLUMN "__preferences" TEXT;`
   - *Why this is essential:*
     - **Zero Read-Modify-Write Collisions:** Updating an operator's navigation layout or theme preference modifies *only* the `__preferences` column. It never loads, deserializes, or rewrites the full user record's JSON blob, preventing race-condition lost updates against profile edits or password resets.
     - **Atomic In-Database JSON Patching:** In MySQL and Postgres, adapters can execute atomic key updates (`jsonb_set` / `JSON_SET`) directly in SQL without holding memory-lock races.
     - **High-Speed Projections:** `SELECT __preferences FROM collection_users WHERE id = ?` fetches exclusively preference data, bypassing heavy profile fields and large relation lookups.

#### 6.3.2 Frontend & SDK Responsibilities (`@dyrected/admin` & `@dyrected/sdk`)

The frontend owns **type safety, UI responsiveness, migrations, and corruption recovery**:

1. **Central Strongly-Typed Registry (`DyrectedPreferences`):**
   Magic strings are eliminated. All preference keys are mapped directly to their schema payloads:

   ```ts
   // packages/admin/src/types/preferences.ts
   export interface DyrectedPreferences {
     "admin:navigation": UserNavigationPreferences;
     "admin:theme": "light" | "dark" | "system";
     "admin:sidebar-width": number;
     [key: `table-columns:${string}`]: ColumnVisibilityPreferences;
     [key: `view-mode:${string}`]: "table" | "kanban" | "cards";
   }
   ```

2. **Client-Side Versioning & Schema Migrations (`version` & `migrate`):**
   When the navigation preference schema evolves across software releases, the client handles the upgrade transparently in memory without requiring database-level schema migrations:

   ```ts
   import type { DefineWorkspaceOptions, DefineViewOptions, NavGroup } from "@dyrected/core";

   export interface UserNavigationPreferences {
     _version: number;
     pinned: Array<{ type: "workspace" | "collection" | "global" | "link"; slug: string; view?: string }>;
     hidden: string[]; // Slugs of hidden groups, nav items, or views
     groupOrder: string[]; // Custom ordering of group slugs
     itemOrder: Record<string, string[]>; // groupSlug -> array of nav item slugs
     groups: NavGroup[]; // Tier 1: Groups (exact same interface as code)
     items: DefineWorkspaceOptions[]; // Tier 2: Nav Items (exact same interface as defineWorkspace, views use DefineViewOptions)
   }
   ```

3. **Debounced Remote Sync (400ms):**
   - State and `localStorage` update **synchronously (0ms latency)**, providing instant 60fps drag-and-drop and step button interactions.
   - Remote network sync (`client.setPreference`) is debounced by **400ms**. If an operator rapidly clicks `Move Up` 5 times, only the final resting state is sent over the wire.
4. **Validation & Corruption Shielding:**
   If local storage contains corrupted JSON or a mismatched schema, `usePreference` validates the structure and falls back to `defaultValue` safely, avoiding unhandled React exceptions.

#### 6.3.3 The Upgraded `usePreference` Hook API

```ts
export interface UsePreferenceOptions<T> {
  scope?: "personal" | "role" | "global";
  role?: string;
  version?: number;
  migrate?: (stored: unknown, fromVersion: number) => T;
  validate?: (stored: unknown) => boolean;
  debounceMs?: number; // Defaults to 400ms
}

export function usePreference<K extends keyof DyrectedPreferences>(
  key: K,
  defaultValue: DyrectedPreferences[K],
  options?: UsePreferenceOptions<DyrectedPreferences[K]>
): [DyrectedPreferences[K], (updater: Updater<DyrectedPreferences[K]>) => void] {
  // 1. Sync local state & localStorage immediately (0ms)
  // 2. Debounce remote client.setPreference call
  // 3. Fallback on validate failure
  // 4. Run migrate if stored._version < options.version
}
```

### 6.4 Role Defaults vs. Personal Overrides

- **Developer Definition:** Declared in `dyrected.config.ts`.
- **Admin/Manager Override:** Users with `admin` or `owner` privileges have an option inside the customizer: *"Publish this layout as default for role [Compliance Reviewer]"*. This calls `setPreference("admin:navigation", layout, { scope: "role", role: "compliance-reviewer" })`.
- **Personal Preference:** Stored per user. Personal preferences always take precedence over role defaults in the resolution waterfall.

---

## 7. Production Hardening & Architectural Edge Cases (Blind Spots)

When building customizable navigation, operational views, and user preferences into enterprise and high-concurrency applications, the following edge cases and failure modes must be explicitly guarded against:

### 7.1 Schema Drift & Tombstone Handling (The Ghost View Problem)

- **Risk:** A developer removes a collection (`legacy_documents`) or renames a view (`kyc` $\rightarrow$ `kyc-v2`) in code, but an operator still has the old slug pinned or saved in a custom group in their user preferences. Without guards, the sidebar or router will throw unhandled exceptions or render blank screens.
- **Architecture Safeguard:**
  - The navigation hydration pipeline reconciles `userPreferences` against `activeSchemas` on every load.
  - Any item referencing an unknown collection or deleted view is marked as a *Tombstone*.
  - The UI renders tombstoned items with a disabled state and an indicator: `KYC Review (Archived)` along with a 1-click `Remove from Sidebar` button, completely preventing React crashes.

### 7.2 Delta-Based Layout Merging vs. Static Snapshots (New Feature Discovery)

- **Risk:** If a user personalizes their sidebar and the system serializes their *entire navigation tree* as a static JSON snapshot, any newly deployed collections or views added by developers in future releases will **never appear** in that user's sidebar.
- **Architecture Safeguard:**
  - Preferences **never store static tree snapshots**. They store a **sparse delta** (`hiddenIds`, `pinnedIds`, `customGroups`, and `orderOverrides`).
  - At render time, Dyrected executes a non-destructive merge:
    `activeNavigation = reconcile(codebaseNavigation, userNavDelta)`
  - Any new collection or operational view present in code that is absent from the user's delta is automatically inserted in its default position.

### 7.3 Badge Query Performance & N+1 Denial of Service

- **Risk:** If 15 operational views each trigger independent SQL `COUNT(*)` queries on every page load or navigation change, 50 concurrent backoffice operators will flood the database with hundreds of aggregate queries per minute, degrading database throughput.
- **Architecture Safeguard:**
  - **Coalesced Endpoint:** Badges are fetched via a single batch request: `GET /api/admin/navigation/badges`.
  - **Strict Indexing:** Badge queries are only permitted against indexed or promoted fields.
  - **Short-Lived Caching:** Badge counts are cached with a 30-second TTL and actively invalidated only when mutations occur on the target collection.
  - **Tab Visibility Throttling:** Background polling pauses immediately when `document.visibilityState === 'hidden'`.

### 7.4 RBAC Enforcement & Data Leak Prevention

- **Risk:** An operational view or custom group might aggregate views across multiple collections (`investors`, `documents`, and `audit_logs`). If a junior analyst lacks permissions to `audit_logs`, the view could leak row counts or fail with an unhandled 403 error.
- **Architecture Safeguard:**
  - **Dynamic Node Pruning:** The sidebar renderer evaluates `canRead(collection)` for each node before injecting it into the render tree.
  - **Automatic Group Pruning:** If all child items in a group are inaccessible to the current user's role, the entire parent group is removed from the DOM.
  - **Secured Badge Calculations:** The badge endpoint verifies the user's JWT permissions before counting documents, guaranteeing that unprivileged users cannot infer dataset sizes.

### 7.5 Collapsed Sidebar Flyouts & Smart Icon Fallbacks

- **Risk:** When `admin-shell.tsx` is collapsed into icon-only mode (56px width), user-created groups and operational views with submenus could render broken layouts or missing icons.
- **Architecture Safeguard:**
  - **Smart Icon Fallbacks:** User-created groups default to `Folder` if no custom icon is selected, or dynamically inherit the icon of their first child view.
  - **Flyout Menus:** In collapsed mode, hovering over an operational group triggers a floating dropdown panel (extending Dyrected's `CollapsedCollectionMenu`) showing all child views, labels, and badges.

### 7.6 Stateful Navigation & Filter Retention Across Sessions

- **Risk:** An operator working in `/kyc-review/pending` applies filters (e.g. `country = NG`), navigates to another page to inspect a document, and returns to find their entire filter and pagination state reset.
- **Architecture Safeguard:**
  - All active view states (search queries, filters, column sorts, page numbers) are synced to URL search parameters (`?where=...&sort=...`).
  - The sidebar link preserves the last active query parameters for the session, allowing operators to jump back into their active queue without lost progress.

### 7.7 Role-Level Layout Templates & Team Sharing

- **Risk:** In larger organizations, individual users shouldn't have to manually recreate standard workflows from scratch.
- **Architecture Safeguard:**
  - Organization Admins can create a curated layout and select: *"Publish as Default for Role [Compliance Reviewer]"*.
  - The server saves this layout in the database under `admin_role_navigation_templates`.
  - New team members inheriting that role automatically receive the curated layout as their base default, while retaining the freedom to add personal overrides.

---

## 8. Implementation Architecture

### 8.1 Package Responsibilities

| Package | Responsibility |
| :--- | :--- |
| `@dyrected/core` | • Export `defineWorkspace`<br>• Normalize and validate `admin.navigation`<br>• Enforce reserved slug validation (`/collections`, `/globals`, `/setup`, `/api`, etc.)<br>• Serve `/api/admin/navigation` and `/api/admin/navigation/badges`<br>• Implement 3-tier cascading resolution waterfall on `GET /api/preferences/:key`<br>• Support `scope=role` in addition to `personal` and `global`<br>• Enforce RBAC write access (only admins can mutate role/global preferences)<br>• Perform server-side RBAC pruning on navigation trees |
| `@dyrected/admin` | • Render dynamic, polymorphic sidebar in `admin-shell.tsx`<br>• Register `/:workspaceSlug/:viewSlug` routes directly at root in React Router without `/ops`<br>• Implement "Customize Navigation" drawer with `@dnd-kit/sortable` and step buttons<br>• Upgrade `usePreference` hook with typed registry, 400ms debounce, and client migrations<br>• Persist sparse layout deltas via `usePreference("admin:navigation")` |
| `@dyrected/sdk` | • Expose `scope: "role"` in `client.getPreference` and `client.setPreference`<br>• Export `DyrectedPreferences` registry interface for end-to-end type safety |

### 8.2 Safety & React State Invariants (AGENTS.md Compliance)

All preference state updates and route transitions must adhere to Dyrected's React safety guidelines:

1. Nav resets and preference synchronizations must use guarded setters with `arePreferenceValuesEqual`.
2. Async badge fetching must guard against stale results with cancellation flags:

   ```ts
   useEffect(() => {
     let cancelled = false;
     client.getNavBadges().then((res) => {
       if (cancelled) return;
       setBadges((prev) => arePreferenceValuesEqual(prev, res) ? prev : res);
     });
     return () => { cancelled = true; };
   }, [stableNavKey]);
   ```

3. Reordering interactions in `@dnd-kit` must avoid state updates during render.

---

## 9. Rollout Plan

### Phase 1: Core Schema, Compiler & Preferences Engine (`@dyrected/core`, Database Adapters)

- **Unified Navigation Types:** Export canonical `defineWorkspace`, `DefineWorkspaceOptions`, `NavGroup`.
- **Navigation Compiler Pipeline:**
  - Auto-discovery of collections, globals, and media resources.
  - Deterministic 5-step compiler with sparse relative splicing (`after`, `before`) and numeric sorting (`order`, `position`).
  - Strict reserved system slug validation (`collections`, `globals`, `setup`, `api`, `login`, `settings`).
- **`__preferences` Database Column Promotion:**
  - Auto-promote `__preferences` to a native physical column (`JSONB` in Postgres, `JSON` in MySQL, `TEXT` in SQLite) on all auth collections to guarantee race-free isolated writes.
- **Preference Waterfall & Security:**
  - Implement 3-tier cascading resolution on `GET /api/preferences/:key` (`Personal -> Role Default -> Global Default -> null`).
  - Enforce RBAC write gates on `PUT /api/preferences/:key` (role and global scopes restricted to administrators).
- **Badge Counters Route:** Serve `GET /api/admin/navigation/badges` with batched count queries.

### Phase 2: Router & Admin Shell (`@dyrected/admin`, `@dyrected/sdk`)

- **Polymorphic Sidebar Renderer:** Refactor `admin-shell.tsx` from hardcoded buckets into a dynamic `NavItemNode` tree renderer with delta merging and tombstone pruning.
- **Smart Single-View vs. Multi-View Accordions:** Direct click routing for 1 view; collapsible drawer for >1 views.
- **Direct Workspace Routing:** Register root `/:workspaceSlug/:viewSlug` in React Router (without `/ops`), with automatic 307 redirects from `/:workspaceSlug` to the primary view.
- **Peek Drawer Query Handling:** Support in-place record inspections via `?record=:id` query parameters.
- **SDK Preferences Client:** Add `scope: "role"` support to `client.getPreference` and `client.setPreference`.

### Phase 3: Visual Navigation Customizer (`@dyrected/admin`)

- **Upgraded `usePreference` Hook:** Typed `DyrectedPreferences` registry, 0ms optimistic local updates, 400ms debounced network sync, and client-side migrations (`version` + `migrate`).
- **"Customize Navigation" Drawer:**
  - Modal workflows for `[ + New Group ]`, `[ + New Nav Item ]`, and `[ + Add Subview ]` (reusing `DefineViewOptions`).
  - Dual reordering: `@dnd-kit/sortable` drag-and-drop handles + accessible `Move Up (↑)` / `Move Down (↓)` stepper buttons.
  - Subview relocation across items/collections with optional `Keep shortcut in collection` toggle.
  - Pinned/Favorites section, visibility toggles, and "Reset to System Defaults".

### Phase 4: CLI Schema Synchronization (`@dyrected/cli`)

- **Bi-directional Code-UI Sync:** Implement `dyrected nav pull` (or `dyrected schema sync --nav`) to serialize UI-configured navigation (`UserNavigationPreferences.items` and `groups`) straight into TypeScript code (`dyrected.config.ts`) using the shared `defineWorkspace` schemas.

### Phase 5: Documentation & Recipes (`apps/docs`, `@dyrected/knowledge`)

- **Production Recipes:** Add battle-tested operational workspace recipes (KYC Review, Order Fulfillment, Support Desk) in `@dyrected/knowledge`.
- **Documentation:** Write step-by-step developer guides in `apps/docs` adhering to `DOCS_PHILOSOPHY.md` (warm, practical, task-oriented instructor voice).
