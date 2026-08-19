# Dyrected Operational Experiences

## Overview

Dyrected defines not only **what data an application stores**, but also **how people operate on that data**.

Today, a collection schema automatically provides standard CRUD pages:

```text
Collection
  → List View
  → Detail View
  → Create Form
  → Edit Form
```

Operational Experiences go beyond basic CRUD:

```text
Schema
  → Operational Views (Table, Kanban, Calendar, Cards)
  → Workflows & Actions (Row, Bulk, Header)
  → Tailored Business Interfaces
```

Developers define data models and operations in TypeScript, while Dyrected automatically generates the tailored interfaces business owners and teams use daily.

---

# 1. The Core Problem

A database collection describes how data is stored, but not how a business works with that data.

For example, a single event RSVP form might collect:

```text
Name
Email
Attendance (Yes/No)
Guest Count (Plus-ones)
Asoebi Requested (Yes/No)
Asoebi Size (S, M, L, XL)
Asoebi Quantity
Payment Status
Pickup Status
Well Wishes Message
Appointment Date
```

In a traditional CMS, all of these fields are dumped into one monolithic table called `RSVPs`.

In real life, three different people are doing three completely different jobs:

1. **Guest List Receptionist**: Only cares about confirmed attendees, plus-one headcounts, and a one-click **"Check-in"** button at the door.
2. **Merch / Outfit Coordinator**: Only cares about people who ordered outfits, their sizes, payment verification (**"Mark as Paid"**), and distribution (**"Mark as Collected"**).
3. **Event Planner**: Only cares about scheduling tasting sessions on a calendar.

---

# 2. Design Principle: One Collection ≠ One Admin Page

A collection is a **data source**, not a single admin screen.

Multiple operational views can be derived from the same underlying collection without changing the database schema or building separate custom frontend applications.

```text
                  Guest Responses Collection
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
  Attending Guests     Asoebi Fulfillment   Tasting Schedule
         │                    │                    │
    Table Layout        Kanban Pipeline     Calendar Layout
  (Check-in Action)   (Mark Paid Action)   (Date Scheduling)
```

---

# 3. Operational Views (`defineView`)

An **Operational View** is a focused workspace tailored to a specific job or workflow.

Each collection can define a `views` array using `defineView()`:

```ts
defineView({
  slug: 'asoebi-pipeline',
  label: 'Asoebi Fulfillment',
  icon: 'shirt',
  layout: 'kanban',
  filter: { asoebi: true },
  groupBy: 'asoebiStatus',
  columns: ['name', 'asoebiSize', 'asoebiQuantity'],
  actions: [markPaidAction, markCollectedAction],
})
```

## View Properties

* `slug`: Unique identifier for routing and URL state.
* `label`: Human-readable title displayed in navigation and headers.
* `icon`: Lucide icon name displayed in navigation.
* `layout`: Display mode — `'table'` (default), `'kanban'`, `'calendar'`, or `'cards'`.
* `filter`: Default query filter (e.g. `{ asoebi: true }` or JEXL string).
* `groupBy`: Field used to group table rows or generate Kanban board columns.
* `dateField`: Field used to map items onto calendar dates (required for `'calendar'`).
* `columns`: Array of field names to display in table/card layouts.
* `sort`: Default sort order (e.g. `{ field: 'createdAt', direction: 'desc' }`).
* `actions`: Array of actions available in this view.
* `metrics`: Optional summary stat cards displayed above the view.
* `access`: Role-based visibility and access rules.

---

# 4. View Layout Modes & UI Component References

Operational Views leverage best-in-class open-source component architectures built on Radix UI, TanStack Table, `@dnd-kit`, and Tailwind CSS:

## 1. `table` Layout (Default) — Reference: [tablecn](https://github.com/sadmann7/tablecn)

Powered by TanStack Table v8 and Radix UI with:

* **Faceted Filter Bar**: Multi-select pills with search and live badge counts.
* **Floating Bulk Action Bar**: Appears at the bottom when rows are selected (`12 selected` $\rightarrow$ `[Mark Paid]`, `[Export]`, `[Delete]`).
* **Column Controls**: Drag-to-resize columns and visibility toggles.
* **View Density**: Compact vs comfortable row padding.

```ts
defineView({
  slug: 'attending-guests',
  label: 'Attending Guests',
  icon: 'users',
  layout: 'table',
  filter: { attending: true },
  columns: ['name', 'guestCount', 'checkedIn'],
  actions: [checkInAction],
})
```

```text
Attending Guests

┌── Search & Filters ──────────────────────────────────────┐
│ [ Search guests... ]  [ Filter: All Table Numbers ▾ ]    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Name              Plus-Ones   Checked In       Action    │
├──────────────────────────────────────────────────────────┤
│ Tunde Bakare      2           No               [Check In]│
│ Amaka Obi         1           Yes              [Details] │
└──────────────────────────────────────────────────────────┘
```

## 2. `kanban` Layout (Pipeline / Board) — Reference: [ReUI Kanban](https://reui.io/components/kanban)

Built on `@dnd-kit/core` with drag-and-drop status transitions:

* Columns generated automatically from `groupBy: 'field'`.
* Column headers with dynamic item counts.
* Interactive cards with badges, metadata, and one-click row action buttons.

```ts
defineView({
  slug: 'asoebi-fulfillment',
  label: 'Asoebi Pipeline',
  icon: 'shirt',
  layout: 'kanban',
  filter: { asoebi: true },
  groupBy: 'asoebiStatus',
  columns: ['name', 'asoebiSize', 'asoebiQuantity'],
  actions: [markPaidAction, markCollectedAction],
})
```

```text
Asoebi Fulfillment

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Requested (12)   │  │ Paid (45)        │  │ Collected (28)   │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ Tunde Bakare     │  │ Sade Adu         │  │ Femi Kuti        │
│ Size: L  Qty: 1  │  │ Size: M  Qty: 2  │  │ Size: XL  Qty: 1 │
│ [Mark as Paid]   │  │ [Mark Collected] │  │ ✓ Complete       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## 3. `calendar` Layout (Date & Scheduling) — Reference: [ReUI Event Calendar](https://reui.io/components/event-calendar)

Renders date-mapped records across Month, Week, and Day views:

* Automatically maps documents to calendar slots using `dateField`.
* Click-to-inspect detail drawer and quick appointment scheduling.

```ts
defineView({
  slug: 'tasting-schedule',
  label: 'Tasting Sessions',
  icon: 'calendar',
  layout: 'calendar',
  dateField: 'appointmentDate',
  columns: ['name', 'guestCount', 'appointmentTime'],
})
```

## 4. `gantt` / `timeline` Layout — Reference: [ReUI Gantt](https://reui.io/components/gantt)

For project schedules, venue bookings, multi-day production, and delivery tracking:

* Maps records across horizontal duration bars (`startDate` $\rightarrow$ `endDate`).
* Progress percentage, milestone markers, and grouped task rows.

```ts
defineView({
  slug: 'production-timeline',
  label: 'Production Schedule',
  icon: 'clock',
  layout: 'gantt',
  startDateField: 'fabricOrderedAt',
  endDateField: 'deliveryDueDate',
  groupBy: 'assignedTailor',
})
```

## 5. `spreadsheet` Layout (Editable Grid) — Reference: [tablecn Spreadsheet](https://github.com/sadmann7/tablecn)

For fast, high-volume data entry and inline editing without opening individual forms:

* **Inline Cell Editing**: Double-click or press Enter to edit cells directly in the table.
* **Keyboard Navigation**: Use arrow keys, `Tab`, `Enter`, and `Escape` for Excel/Google Sheets-like data entry.
* **Type-Aware Editors**: Inline select dropdowns, boolean toggles, date pickers, and number inputs.
* **Optimistic Auto-Saving**: Automatically saves updates on blur or with a batch *"Save Changes"* bar.

```ts
defineView({
  slug: 'table-seating-grid',
  label: 'Seating & Outfit Matrix',
  icon: 'table-properties',
  layout: 'spreadsheet',
  filter: { attending: true },
  columns: ['name', 'tableNumber', 'asoebiSize', 'asoebiQuantity', 'notes'],
})
```

## 6. `cards` Layout (Visual Gallery)

Renders items as visual cards with cover images, badges, and quick actions. Ideal for media-heavy or profile-heavy catalogs.

```ts
defineView({
  slug: 'guest-cards',
  label: 'Guest Directory',
  icon: 'grid',
  layout: 'cards',
  columns: ['avatar', 'name', 'tableNumber'],
})
```

---

# 5. Actions System (`defineAction`)

Actions define **what operations users can perform on the data**.

```ts
const checkInAction = defineAction({
  name: 'checkIn',
  label: 'Check In',
  icon: 'check-circle',
  type: 'row',
  confirm: 'Check in this guest?',

  // Cloud & Self-Hosted (100% Cloud-safe declarative mutation)
  mutation: {
    checkedIn: true,
    checkedInAt: 'now()',
  },

  // Self-Hosted only (native TypeScript async handler for custom side-effects)
  handler: async ({ doc, user }) => {
    return { checkedIn: true, checkedInAt: new Date().toISOString() };
  },
})
```

## Actions vs Hooks: Key Differences

| Dimension | **Lifecycle Hooks** | **Actions (`defineAction`)** |
| :--- | :--- | :--- |
| **What they are** | Automatic lifecycle event listeners | Intent-driven UI operations |
| **How they trigger** | **Passive & Invisible**: Triggered automatically on every database CRUD call (`beforeChange`, `afterChange`, etc.) | **Active & Explicit**: Triggered when an admin user clicks a button (`[Check In]`, `[Mark as Paid]`, `[Assign Table]`) |
| **UI Surface** | None (runs transparently on the backend) | Buttons on Table Rows, Kanban Cards, Bulk Action Bar, or View Header |
| **User Interaction** | Cannot prompt the user | Can show a **confirmation modal** (`confirm: "..."`) or a **quick input dialog** (`fields: [...]`) |
| **Relationship** | Hooks **react** to changes | Actions **initiate** changes (which then run through the standard hooks pipeline!) |

> **Note**: When an Action executes and updates a record, all of your collection's existing `beforeChange` and `afterChange` lifecycle hooks still run normally.

## Cloud-First Architecture & Declarative Mutations

Dyrected Cloud safely executes actions without running arbitrary server code:

- **Declarative Mutations**: The `mutation` property is pure JSON (e.g. `{ checkedIn: true, checkedInAt: 'now()' }` or `{ tableNumber: 'input.tableNumber' }`).
- **Safety**: Pure JSON mutations sync cleanly through `sync:schema` and run in Dyrected Cloud using the built-in expression resolver.
- **Self-Hosted Flexibility**: For server-side integrations requiring third-party SDKs (e.g. Stripe charges, Slack notifications), self-hosted deployments can supply an async TypeScript `handler`.

## Action Scopes / Types

| Type | Location in UI | Usage |
| :--- | :--- | :--- |
| **`row`** | Placed directly on a table row or Kanban card | Operates on a single record (e.g. `[Check In]`, `[Mark Paid]`). |
| **`bulk`** | Appears when one or more rows are selected via checkboxes | Batch operations (e.g. `[Mark 10 Selected as Paid]`, `[Export Selected]`). |
| **`header`** | Positioned in the top view header | View-wide tools (e.g. `[Export Full Guest List CSV]`, `[Send Bulk SMS]`). |

## Confirmation Modals & Action Input Forms

Actions can require confirmation prompts or input fields before executing:

```ts
const assignTableAction = defineAction({
  name: 'assignTable',
  label: 'Assign Table',
  type: 'row',
  fields: [
    defineNumberField({ name: 'tableNumber', label: 'Table Number', required: true }),
    defineTextField({ name: 'notes', label: 'Seating Notes' }),
  ],
  mutation: {
    tableNumber: 'input.tableNumber',
    seatingNotes: 'input.notes',
  },
})
```

---

# 6. View Summary Metrics & Database Aggregations

Operational Views display high-level KPI stat cards directly above the dataset.

Rather than loading entire collections into memory, metrics leverage Dyrected's high-performance **Collection Aggregation Engine** to run native DB aggregation queries (`count`, `sum`, `avg`, `min`, `max`) coupled with **JEXL expressions** for mathematical operations and formatting.

```text
Database Collection (Thousands of Records)
              │
              ▼  (Runs Native DB Aggregate Query)
   { totalItems: 85, avgPrice: 25000 }
              │
              ▼  (JEXL Expression: totalItems * avgPrice)
          ₦2,125,000
```

## Metric Definition Scenarios

### Scenario 1: Simple & Conditional Counts

```ts
{
  label: 'Total Orders',
  aggregate: { count: '*' },
},
{
  label: 'Total Paid',
  aggregate: {
    count: '*',
    where: { asoebiStatus: { in: ['paid', 'collected'] } },
  },
}
```

### Scenario 2: Sum with Fixed Price Multiplier

Multiply a database aggregated sum by a fixed unit price and format as currency:

```ts
{
  label: 'Estimated Revenue',
  aggregate: {
    sum: 'asoebiQuantity',
    cast: 'number',
    where: { asoebiStatus: { in: ['paid', 'collected'] } },
  },
  transform: 'value * 25000',
  format: 'currency',
  currency: 'NGN', // Outputs: ₦2,125,000
}
```

### Scenario 3: Combining Two Different Aggregations & Multiplying

Compute multiple native aggregates in one query and calculate derived metrics using JEXL math:

```ts
{
  label: 'Projected Hall Revenue',
  aggregates: {
    totalBooked: { count: '*', where: { booked: { equals: true } } },
    avgRate: { avg: 'nightlyRate', cast: 'number' },
  },
  // Multiplies the two aggregate results together
  expression: 'aggregates.totalBooked * aggregates.avgRate',
  format: 'currency',
  currency: 'USD', // Outputs: $12,450.00
}
```

### Scenario 4: Ratio / Percentage Metrics

Calculate conversion rates by dividing two aggregate counts:

```ts
{
  label: 'Attendance Rate',
  aggregates: {
    totalInvited: { count: '*' },
    totalAttending: { count: '*', where: { attending: { equals: true } } },
  },
  expression: 'math.round((aggregates.totalAttending / aggregates.totalInvited) * 100, 1)',
  format: 'percent', // Outputs: 85.9%
}
```

```text
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ Total Orders       │  │ Total Paid         │  │ Estimated Revenue  │
│ 85                 │  │ 73                 │  │ ₦2,125,000         │
└────────────────────┘  └────────────────────┘  └────────────────────┘
```

---

# 7. Navigation & Admin Sidebar Hierarchy

Operational Views appear as structured sub-navigation items beneath the parent collection in the Admin sidebar:

```text
Admin Navigation
├── Collections
│   ├── Posts
│   └── Guest Responses
│       ├── All RSVPs (Default List)
│       ├── 👥 Attending Guests
│       ├── 👗 Asoebi Fulfillment
│       └── 📅 Tasting Schedule
└── Settings
```

Clicking an operational view loads that specific view directly, preserving filters, search state, and active columns.

---

# 8. Complete Example

```ts
import {
  defineCollection,
  defineTextField,
  defineBooleanField,
  defineNumberField,
  defineSelectField,
  defineDateTimeField,
  defineTextareaField,
  defineView,
  defineAction,
} from '@dyrected/core';

// ── Action Definitions ────────────────────────────────────────────────────────

export const checkInAction = defineAction({
  name: 'checkIn',
  label: 'Check In',
  icon: 'user-check',
  type: 'row',
  confirm: 'Confirm guest check-in at the door?',
  mutation: {
    checkedIn: true,
    checkedInAt: 'now()',
  },
});

export const markPaidAction = defineAction({
  name: 'markPaid',
  label: 'Mark Paid',
  icon: 'credit-card',
  type: 'row',
  mutation: {
    asoebiStatus: 'paid',
    asoebiPaidAt: 'now()',
  },
});

export const markCollectedAction = defineAction({
  name: 'markCollected',
  label: 'Mark Collected',
  icon: 'package-check',
  type: 'row',
  mutation: {
    asoebiStatus: 'collected',
    asoebiCollectedAt: 'now()',
  },
});

// ── Collection Definition ───────────────────────────────────────────────────

export const GuestResponses = defineCollection({
  slug: 'guest-responses',
  label: 'Guest Responses',

  admin: {
    useAsTitle: 'name',
    icon: 'users',
  },

  fields: [
    defineTextField({ name: 'name', label: 'Full Name', required: true }),
    defineTextField({ name: 'email', label: 'Email' }),
    defineBooleanField({ name: 'attending', label: 'Attending' }),
    defineNumberField({ name: 'guestCount', label: 'Plus-Ones', defaultValue: 0 }),
    defineNumberField({ name: 'tableNumber', label: 'Table Number' }),
    defineBooleanField({ name: 'checkedIn', label: 'Checked In', defaultValue: false }),
    defineDateTimeField({ name: 'checkedInAt', label: 'Checked In At' }),

    // Asoebi Details
    defineBooleanField({ name: 'asoebi', label: 'Wants Asoebi' }),
    defineSelectField({
      name: 'asoebiStatus',
      label: 'Asoebi Status',
      options: ['requested', 'paid', 'collected'],
      defaultValue: 'requested',
    }),
    defineSelectField({
      name: 'asoebiSize',
      label: 'Asoebi Size',
      options: ['S', 'M', 'L', 'XL', 'XXL'],
    }),
    defineNumberField({ name: 'asoebiQuantity', label: 'Quantity', defaultValue: 1 }),

    // Appointments & Notes
    defineDateTimeField({ name: 'appointmentDate', label: 'Tasting Date' }),
    defineTextareaField({ name: 'wellWishes', label: 'Well Wishes' }),
  ],

  views: [
    // 1. Table View for Door Check-in
    defineView({
      slug: 'attending-guests',
      label: 'Attending Guests',
      icon: 'user-check',
      layout: 'table',
      filter: { attending: true },
      columns: ['name', 'guestCount', 'tableNumber', 'checkedIn'],
      actions: [checkInAction],
      metrics: [
        {
          label: 'Total Attending',
          aggregate: { count: '*', where: { attending: { equals: true } } },
        },
        {
          label: 'Checked In',
          aggregate: { count: '*', where: { checkedIn: { equals: true } } },
        },
      ],
    }),

    // 2. Kanban Board for Outfit Fulfillment
    defineView({
      slug: 'asoebi-pipeline',
      label: 'Asoebi Fulfillment',
      icon: 'shirt',
      layout: 'kanban',
      filter: { asoebi: true },
      groupBy: 'asoebiStatus',
      columns: ['name', 'asoebiSize', 'asoebiQuantity'],
      actions: [markPaidAction, markCollectedAction],
      metrics: [
        {
          label: 'Total Orders',
          aggregate: { count: '*', where: { asoebi: { equals: true } } },
        },
        {
          label: 'Paid Orders',
          aggregate: {
            count: '*',
            where: { asoebiStatus: { in: ['paid', 'collected'] } },
          },
        },
        {
          label: 'Estimated Revenue',
          aggregate: {
            sum: 'asoebiQuantity',
            cast: 'number',
            where: { asoebiStatus: { in: ['paid', 'collected'] } },
          },
          transform: 'value * 25000',
          format: 'currency',
          currency: 'NGN',
        },
      ],
    }),

    // 3. Calendar View for Appointments
    defineView({
      slug: 'tasting-schedule',
      label: 'Tasting Schedule',
      icon: 'calendar',
      layout: 'calendar',
      dateField: 'appointmentDate',
      columns: ['name', 'guestCount'],
    }),
  ],
});
```

---

# 9. Initial API

The initial version introduces:

```ts
export interface ViewMetric {
  label: string;
  aggregate?: AggregateOperation;
  aggregates?: Record<string, AggregateOperation>;
  transform?: string;
  expression?: string;
  format?: 'currency' | 'number' | 'percent' | string;
  currency?: string;
}

export interface ViewConfig {
  slug: string;
  label: string;
  icon?: string;
  layout?: 'table' | 'spreadsheet' | 'kanban' | 'calendar' | 'gantt' | 'cards';
  filter?: Record<string, any> | string;
  groupBy?: string;
  dateField?: string;
  startDateField?: string;
  endDateField?: string;
  columns?: string[];
  sort?: { field: string; direction: 'asc' | 'desc' };
  actions?: ActionConfig[];
  metrics?: ViewMetric[];
  access?: AccessConfig;
}

export interface ActionConfig {
  name: string;
  label: string;
  icon?: string;
  type?: 'row' | 'bulk' | 'header';
  confirm?: string;
  fields?: Field[];
  mutation?: Record<string, any>;
  handler?: (context: ActionContext) => Promise<any>;
  access?: AccessConfig;
}
```

---

# 10. Initial Release Scope

## Operational Views Core

* [ ] `defineView` configuration helper
* [ ] `defineAction` configuration helper
* [ ] Admin sidebar nested view routing (`/collections/:slug/views/:viewSlug`)
* [ ] Table layout with view-defined column presets & base filters
* [ ] Kanban board layout with `groupBy` column generation
* [ ] Calendar layout with `dateField` record placement
* [ ] Summary metric stat cards above views

## Actions Runner

* [ ] Row-level action buttons on table rows and Kanban cards
* [ ] Bulk action bar for selected items
* [ ] Header view actions
* [ ] Confirmation modal dialogs
* [ ] Action input form dialogs
* [ ] Cloud-safe declarative mutation handler
* [ ] Self-hosted async TypeScript action handler
* [ ] Optimistic UI update and toast notifications
* [ ] Action permission enforcement

---

# 11. Product Philosophy

Dyrected is not trying to become Airtable.

* **Airtable**: Gives end-users drag-and-drop tools to manually stitch together interfaces for their data.
* **Dyrected**: Lets **developers define data and business operations as code in TypeScript**, while Dyrected automatically generates the polished, role-aware operational interface that clients use to run their businesses.
