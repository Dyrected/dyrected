# Derived Report Views — Technical Spec

2026-09-17

## Overview

A **derived (report) view** renders one row per *aggregated bucket* — e.g. one row per calendar day — instead of one row per document, with a KPI summary computed across the whole filtered range at the top. The motivating example: a day-by-day Close-of-Business report over a `transactions` collection, showing per-day totals/counts alongside an overall total for the period.

None of the five existing view layouts (table, kanban, cards, calendar, gantt) can express this, because all five render one row per document:

- Table/cards/calendar/gantt fetch and display raw documents directly.
- Kanban's `groupBy` clusters *existing* documents into visual columns by an exact field value — it still fetches full documents (one `find()` per distinct group value, capped at 15 groups, `packages/admin/src/pages/collections/views/kanban/use-grouped-view-data.ts`), it does not collapse many documents into one computed row.

**Design goal:** don't build a new query engine. The server-side `DatabaseAdapter.aggregate()` method already does true `GROUP BY` aggregation identically across all four adapters (Postgres, MySQL, SQLite, MongoDB), built on the same shared `where`-parsing grammar used by `find()`. This spec's core move is extending that existing, already-cross-engine-consistent capability with **date-bucket grouping** (group by day/week/month, not just exact field value), then exposing it through a new config API and a new read-only admin table renderer. The aggregation engine is not new; the bucketing dimension and the UI to browse it are.

## Derived View vs. a Real Collection

The deciding question is not "does this involve aggregation" — both patterns aggregate. It's **does any bucket need to hold state that outlives a single read?**

|  | Derived view (this spec) | Real collection |
| --- | --- | --- |
| A "row" is | Computed live on every query, thrown away after | A persisted document with an id |
| Can you edit a row (status, notes, an upload)? | No — there's nothing to write back to | Yes — it's a normal document |
| Can a row exist with zero underlying activity? | No — GROUP BY only returns buckets with ≥ 1 matching row (see Gaps) | Yes — the document exists regardless |
| Row-level detail view / drawer / actions | Not naturally — no id to hang them on | Yes — the full Detail View + actions system applies unchanged |
| Right for | "What did revenue look like per week last quarter" — pure read-only lookback, nothing to persist | "Daily reconciliation report finance reviews, marks remitted, and attaches proof to" — anything with a lifecycle |

**Worked example — a daily reconciliation report:** each day needs a `status` (pending/remitted/partial) that finance sets and that must still be there tomorrow, plus a remittance record (date, reference, amount, proof image) attached to that specific day. That's state with a lifecycle, not a number recomputed from raw transactions on every page load — so each day must be a real document (e.g. a `DailyReports` collection, one row per business day), not a derived-view bucket. The read-only numbers on that document (subscriptions count, total collected) can still be *computed the same way* — via a grouped aggregate — but the result gets written into that day's document rather than recomputed and discarded on every read.

The two patterns compose: a derived view is a good fit for an *analytics sub-section inside* a real collection's Detail View (e.g. "collections broken down by bank, for this specific day" — exact-value `groupBy`, already supported today with no new work), even when the top-level report itself is a real collection.

## Current State

**Types** (`packages/core/src/types/aggregate.ts`):

| Type | Shape | Line |
| --- | --- | --- |
| `AggregateCastType` | `"number" \| "integer" \| "float" \| "string" \| "boolean" \| "date"` | 8 |
| `CountOperation` | `{ count: "*"; where? }` | 23 |
| `DistinctCountOperation` | `{ countDistinct: string; where? }` | 32 |
| `NumericOperation` | `{ sum?/avg?/min?/max?: string; cast?; where? }` | 53 |
| `AggregateOperation` | union of the above | 65 |
| `AggregateInput` | `Record<string, AggregateOperation>` | 84 |
| `AggregateArgs` | `{ collection: string; aggregates: AggregateInput; groupBy?: string }` | 89 |
| `AggregateResult` | `Record<string, any>`; with `groupBy` set: `{ groups: Record<groupKey, Record<aggName, value>> }` | — |

`DatabaseAdapter.aggregate(args): Promise<AggregateResult>` is declared at `packages/core/src/types/adapters.ts:56`, also exposed on `ReadonlyDatabaseAdapter` (`adapters.ts:98`).

**Per-adapter `aggregate()` implementations** (all four exist under `packages/db-postgres`, `packages/db-mysql`, `packages/db-sqlite`, `packages/db-mongodb`, each hand-writing raw queries — no Kysely/Drizzle/query-builder anywhere):

| Adapter | File | Scalar path | GroupBy path | Per-op `where` reused from `find()`? |
| --- | --- | --- | --- | --- |
| Postgres | `packages/db-postgres/src/index.ts:547-675` | 547-636, `FILTER (WHERE ...)` per op | 637-658, `GROUP BY <col>` | Yes — `parseSqlWhere(op.where, toFieldExpr, "pg")` |
| MySQL | `packages/db-mysql/src/index.ts:592-715` | 592-676, `SUM(IF(whereSql, val, NULL))` (no native `FILTER`) | 677-698 | Yes |
| SQLite | `packages/db-sqlite/src/index.ts:316-427` | 316-391, `FILTER (WHERE ...)` (SQLite supports it) | 392-413 | Yes |
| MongoDB | `packages/db-mongodb/src/index.ts:199-371` | 199-343, `$facet` + per-branch `$match` from `parseMongoWhere` | 260-323, single `$group` | **No** — gap, see below |

All three SQL adapters build their per-op filters through the same shared `parseSqlWhere` (`packages/core/src/utils/parse-where.ts:88`), taking `(where, toFieldExpr, placeholderStyle)` — `toFieldExpr` is the only adapter-local piece (resolves promoted columns vs. `data->>'x'` JSON paths), so the same where-grammar compiles to each engine's native SQL. Mongo's `find()` and scalar-aggregate path both use `parseMongoWhere` (`parse-where.ts:289`); its groupBy path does not.

`cast` handling is adapter-local with no shared helper — each of the four independently maps `AggregateCastType` to a native cast expression, all with "invalid value → null, not error" semantics (Postgres regex-guarded `::bigint`/`::double precision`; MySQL `CAST(...AS SIGNED/DECIMAL)` guarded by `REGEXP`; SQLite `CASE...GLOB...CAST AS REAL` — SQLite's own `CAST` silently returns `0.0` on bad input; Mongo `$convert` with `onError:null,onNull:null`).

**Existing `groupBy` is exact-field-value only**, both at the type level (`AggregateArgs.groupBy?: string`) and in every adapter's implementation — there is no date-truncation concept anywhere in this path today.

## Gaps To Close

1. **No date-bucket grouping.** `groupBy` only matches an exact field value. Grouping transactions "by day" today would produce one bucket per distinct exact timestamp — useless. Needs a truncation expression per engine (`date_trunc`, `DATE()`, `strftime`, `$dateTrunc`).
2. **MongoDB bug: groupBy ignores per-metric `where`.** The scalar/`$facet` path applies each op's own `where` via `parseMongoWhere`; the `$group` path does not. Left unfixed, a report metric like "confirmed transactions per day" vs. "all transactions per day" would silently return the same numbers on Mongo only — a correctness bug that must be fixed as part of this work, not after.
3. **No config API or admin UI consumes grouped aggregation as a report.** Nothing today lets a collection declare "give me a table of these aggregates, one row per day." `ViewMetric` (the KPI cards) only ever renders single scalars, never a row-per-bucket table.

## Proposed Data Model & Types

**1. Extend `AggregateArgs.groupBy`** (`packages/core/src/types/aggregate.ts`) to accept a date-bucket spec alongside the existing exact-match string:

```ts
export type DateBucketInterval = "day" | "week" | "month" | "quarter" | "year";

export interface DateBucketGroupBy {
  field: string;
  interval: DateBucketInterval;
  /** IANA timezone for bucket boundaries. Defaults to UTC. */
  timezone?: string;
}

export type GroupBySpec = string | DateBucketGroupBy;

export interface AggregateArgs {
  collection: string;
  aggregates: AggregateInput;
  groupBy?: GroupBySpec; // was: string
}
```

Group keys in `AggregateResult.groups` are normalized to sortable ISO strings per interval: `"2026-09-17"` (day), `"2026-W38"` (week), `"2026-09"` (month), `"2026-Q3"` (quarter), `"2026"` (year) — chosen so plain string sort equals chronological order on every engine, with no adapter-specific key format leaking upward.

**2. New `defineReportView` config**, following the existing layout-specific-overload pattern (`defineKanbanView` requires `groupBy`, `defineCalendarView` requires `dateField`, etc. in `packages/core/src/types/views.ts`):

```ts
export interface DefineReportViewOptions extends DefineViewBaseOptions {
  layout: "report";
  /** Required — a report view always groups by a date bucket. */
  groupBy: DateBucketGroupBy;
  /** Per-bucket columns. Reuses ViewMetric as-is — same aggregate/expression/format shape, computed once per bucket instead of once globally. */
  metrics: ViewMetric[];
  /** Optional overall KPI cards across the whole filtered range, rendered above the table. Reuses ViewMetric + the existing MetricCards/useViewMetrics unchanged (no groupBy passed). */
  summary?: ViewMetric[];
}

export function defineReportView(config: DefineReportViewOptions): DefineReportViewOptions {
  return config;
}
```

`groupBy` (bucket dimension) and `filter`/`sort` (from `DefineViewBaseOptions`) are inherited as-is. Sort is implicitly by bucket key; no separate `sort.field` needed since a report's only sortable axis is time.

**Key design decision: `ViewMetric` is reused unchanged for both roles.** A `ViewMetric`'s `aggregate`/`aggregates` (`{ sum: "amount" }`, `{ count: "*" }`, etc.) already describes "one DB aggregate operation, optionally `where`-filtered." Whether that operation runs once over the whole collection (today's KPI card) or once per date bucket (a report column) is purely a difference in *how the surrounding `aggregate()` call is invoked* (`groupBy` present or not) — not in the metric definition itself. This means zero new "metric" concept is needed; `report.metrics` and `report.summary` are both plain `ViewMetric[]`, and the summary cards reuse `useViewMetrics`/`MetricCards` completely unchanged.

**Empty-bucket handling (open design call, see Open Questions):** native `GROUP BY` only returns buckets that have at least one matching row — a day with zero transactions is silently absent, not zero. Recommendation: do NOT solve this per-adapter (four different date-series generation strategies is exactly the kind of divergence this design avoids — Postgres has `generate_series`, MySQL/SQLite/Mongo don't have a clean equivalent). Instead, gap-fill once in the shared collection controller, after `aggregate()` returns: compute the full list of expected bucket keys for the requested range/interval, and zero-fill any missing from the adapter's result. One shared implementation, zero adapter divergence.

## Per-Adapter Implementation Plan

Each adapter's `aggregate()` already branches on `args.groupBy` truthiness (see Current State table). The change in every adapter is the same shape: when `groupBy` is an object (not a string), build a truncation expression for the group column instead of the raw column name, and still run through the same per-op `where`/`cast` code that already exists on that branch. No new abstraction, no shared "date math" utility — four small, isolated, mechanical edits.

| Adapter | File | Exact-match today | Date-bucket change |
| --- | --- | --- | --- |
| Postgres | `db-postgres/src/index.ts:637-658` | `GROUP BY ${groupCol}` | `date_trunc('day', (${fieldExpr})::timestamptz)` as the group expression; `quarter`/`week`/`month`/`year` are native `date_trunc` units too — one function covers every interval |
| MySQL | `db-mysql/src/index.ts:677-698` | `GROUP BY ${groupCol}` | `DATE(${fieldExpr})` for day; `DATE_FORMAT(${fieldExpr}, '%x-W%v')` for week, `DATE_FORMAT(..., '%Y-%m')` for month, etc. — needs a small per-interval format-string table, this is the one adapter without a single native function covering all intervals |
| SQLite | `db-sqlite/src/index.ts:392-413` | `GROUP BY ${groupCol}` | `strftime('%Y-%m-%d', ${fieldExpr})` for day, `strftime('%Y-%m', ...)` for month, etc. (dates already stored as text here, per the adapter's existing comment) — same per-interval format-string table as MySQL |
| MongoDB | `db-mongodb/src/index.ts:260-323` | `$group: { _id: "$field", ... }` | `$group: { _id: { $dateTrunc: { date: "$field", unit: <interval>, timezone } }, ... }` (Mongo 5.0+; `$dateTrunc`'s `unit` accepts day/week/month/quarter/year natively) — also **fix the missing per-op `$match`/`where`** in this same branch while touching it |

**Timezone:** Postgres/Mongo accept an explicit timezone/offset argument to their truncation function directly. MySQL/SQLite have no native timezone-aware truncation — the pragmatic path is to require the stored date value to already be in the desired timezone (or convert app-side before storage), and document that `timezone` on `DateBucketGroupBy` is honored on Postgres/Mongo only, with MySQL/SQLite always truncating in the value's stored timezone. Flagged again in Open Questions — this is a real cross-engine capability gap, not an oversight to code around.

**Testing:** since `packages/core/src/__tests__/collection-actions.test.ts` (added this session) established the pattern of adapter-agnostic integration tests via `createDyrectedApp` + `InMemoryAdapter`, the new date-bucket path needs the *opposite* — adapter-specific tests, one suite per real adapter package (`packages/db-postgres/src/__tests__`, etc.), each seeding known dates and asserting exact bucket keys and values, since `InMemoryAdapter` (an in-memory JS test double, not a real engine) proves nothing about `date_trunc` vs. `strftime` vs. `$dateTrunc` actually agreeing with each other.

## Admin UI Plan

A new `ReportViewPage` component, registered wherever `OperationalViewPage` is currently routed to for `layout: "table" | "kanban" | ...` (`packages/admin/src/pages/collections/views/`), added as a sibling branch for `layout: "report"`.

**Summary cards (top):** reuse `useViewMetrics` and `MetricCards` completely unchanged, called with `report.summary` and the view's `filter` — identical to how every other view layout already renders its optional KPI row today.

**Report table (body):** new, but deliberately thin —

- Query: a new hook (`useReportRows` or similar) calling the aggregate endpoint with `{ aggregates: metricsToAggregateInput(report.metrics), groupBy: report.groupBy, filter: resolveViewFilter(report.filter) }`, returning `{ bucketKey, ...metricValues }[]` sorted by bucket key.
- Render: plain table, one column per `report.metrics[]` entry (label from the metric, value formatted per its existing `format`/`currency`), one row per bucket, bucket key formatted per `interval` for display (e.g. `Sep 17, 2026` for day).
- **No row-click, no selection checkboxes, no bulk-action bar, no per-row `view`/`edit`/`duplicate`/`delete`** — a bucket is not a document and has no `id`; all of the existing `ViewActionFeatures`/row-actions machinery simply does not apply and should not be wired up at all, not disabled-but-present.
- Column sort: fixed to bucket order (asc/desc toggle only) — no per-column client sort, since column values are pre-aggregated server-side per bucket, not raw field values to re-sort locally.

**Pagination:** date ranges are naturally bounded (a report over the trailing 90 days has at most 90 rows for `interval: "day"`), so a report view likely wants a *date-range picker* (feeding into `filter`) rather than page/limit-style pagination like the table layout. Worth deciding explicitly — see Open Questions.

**Sidebar/routing:** report views slot into the existing `views` array and `defaultView`/`admin.defaultView` machinery exactly like any other view — no new routing concept needed, `layout: "report"` is just another value alongside `table`/`kanban`/etc.

## Charts & Graphs

**No charting library exists in the admin package today** (checked: no recharts/visx/d3/chart.js, no existing chart component). `MetricCards` renders numbers only. This is a real net-new capability, not a reuse-what's-there situation — flagged as its own decision below.

**Design principle: a chart is a second renderer for the same data, not a second data model.** Exactly like `summary`/`metrics` reuse one `ViewMetric` shape, a chart should consume the identical bucketed rows the report table already computes — no parallel query path, no separate config for "what to compute" vs. "what to show in the table." This also mirrors an existing precedent in the codebase: `DefineTableViewOptions.layout?: 'table' | 'spreadsheet'` already treats layout as a render-mode switch on one view definition, not a second view type. Charts should slot in the same way:

**Hard rule: the chart config is Recharts' own prop shape, verbatim — not a Dyrected-invented DSL.** If you already know how to configure a Recharts `<LineChart>`, you already know how to configure a Dyrected report chart. Concretely, `defineReportView`'s `chart` option takes: (1) which Recharts *container* component to use (`LineChart`, `BarChart`, `AreaChart`, `PieChart`, `ComposedChart`), and (2) for every piece inside it (`XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, and each series' `Line`/`Bar`/`Area`/`Pie`), the *exact same props object* you'd hand that component if you imported it from `recharts` and wrote the JSX by hand. Dyrected supplies exactly one thing you wouldn't otherwise have: `data` (the fetched, aggregated rows) — everything else passes straight through, untranslated.

```ts
import type { ComponentProps } from "react";
// Importing Recharts' own component types is the point — config IS their prop
// shape, so this type can never drift from what Recharts actually accepts.
import type {
  LineChart, BarChart, AreaChart, PieChart, ComposedChart,
  Line, Bar, Area, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export interface ReportChartConfig {
  /** Which Recharts container to render — the same choice as writing Recharts directly. */
  type: "LineChart" | "BarChart" | "AreaChart" | "PieChart" | "ComposedChart";
  /** Passed to the container verbatim (margin, layout, ...). Dyrected injects only `data`. */
  containerProps?: Omit<ComponentProps<typeof LineChart>, "data" | "children">;
  xAxis?: ComponentProps<typeof XAxis>;
  yAxis?: ComponentProps<typeof YAxis>;
  grid?: ComponentProps<typeof CartesianGrid>;
  tooltip?: ComponentProps<typeof Tooltip>;
  legend?: ComponentProps<typeof Legend>;
  /** One entry per series — each carries that exact component's real props (dataKey, stroke, fill, stackId, type, ...). */
  series: Array<
    | { component: "Line"; props: ComponentProps<typeof Line> }
    | { component: "Bar"; props: ComponentProps<typeof Bar> }
    | { component: "Area"; props: ComponentProps<typeof Area> }
    | { component: "Pie"; props: ComponentProps<typeof Pie> }
  >;
}

export interface DefineReportViewOptions extends DefineViewBaseOptions {
  layout: "report";
  groupBy: DateBucketGroupBy;
  seriesBy?: string;
  metrics: ViewMetric[];
  summary?: ViewMetric[];
  display?: "table" | "chart" | "both"; // defaults to "table"
  chart?: ReportChartConfig;
}
```

The renderer is correspondingly thin — dynamic component lookup by name, then spread props, nothing else:

```tsx
const CONTAINERS = { LineChart, BarChart, AreaChart, PieChart, ComposedChart };
const SERIES = { Line, Bar, Area, Pie };

function ReportChart({ config, data }: { config: ReportChartConfig; data: Record<string, unknown>[] }) {
  const Container = CONTAINERS[config.type];
  return (
    <ResponsiveContainer>
      <Container data={data} {...config.containerProps}>
        {config.grid && <CartesianGrid {...config.grid} />}
        {config.xAxis && <XAxis {...config.xAxis} />}
        {config.yAxis && <YAxis {...config.yAxis} />}
        {config.tooltip && <Tooltip {...config.tooltip} />}
        {config.legend && <Legend {...config.legend} />}
        {config.series.map((s, i) => {
          const Series = SERIES[s.component];
          return <Series key={i} {...s.props} />;
        })}
      </Container>
    </ResponsiveContainer>
  );
}
```

**The one necessary accommodation — function-valued props.** Some real Recharts props are functions (`XAxis.tickFormatter`, `Tooltip.formatter`, `Pie.label`, etc.), and `defineReportView` configs must stay JSON-serializable to travel over the schemas endpoint to Dyrected Cloud. This is the exact same tension `admin.previewUrl` already solves elsewhere in this codebase — same resolution, no new mechanism: accept either the real function (self-hosted, full fidelity, literally Recharts' own prop type) or a JEXL string evaluated at render time (portable, Cloud-safe). Every non-function prop — the overwhelming majority — needs no accommodation at all; it's just data, passed through as-is.

**The one genuinely new capability: multi-series charts need two-dimensional grouping.** "Collected by bank, per day" (a stacked bar: x = day, one series per bank) needs grouping by *both* the date bucket and a category field at once — today's `groupBy` (even after the date-bucket extension) only groups by one dimension. This is a small, mechanical extension of the same adapter change from the Per-Adapter Implementation Plan section, not a new capability class: SQL engines already support `GROUP BY expr1, expr2` natively (Postgres/MySQL/SQLite — zero new concepts); Mongo's `$group._id` just becomes `{ bucket: {$dateTrunc...}, series: "$field" }` instead of a single value.

**Data shape for `data` must match what Recharts itself expects — this follows directly from the no-reinvention rule, it isn't a separate choice.** For a single-series chart, one row per bucket (`{ bucket: "2026-09-01", totalCollected: 55325 }`) is both what the aggregate naturally returns and what `dataKey="totalCollected"` expects. For a *multi-series* chart (stacked/grouped bars, multiple lines), Recharts' own convention is one row per bucket with **one column per series value** — `{ bucket: "2026-09-01", Providus: 500, FSDH: 300, Stanbic: 200 }` — which each `<Bar dataKey="Providus" stackId="a">` / `<Bar dataKey="FSDH" stackId="a">` then reads directly. So when `seriesBy` is set, the two-dimensional grouped result gets pivoted from `{bucket, series} → value` into that wide shape before being handed to the chart as `data`. This pivot is unavoidable regardless of charting library — it's just correctly shaping query results for consumption, not a config abstraction — and it happens once, centrally, not per chart type.

**Chart-type selection guidance** (applies whether the chart sits above a report table or stands alone):

| Data shape | Chart type |
| --- | --- |
| One metric's level across buckets (e.g. total collected per day) | Line or area |
| A handful of discrete buckets to compare (e.g. last 7 days) | Bar |
| A signed change per bucket (e.g. day-over-day % change) | Bars centered on zero, not a line |
| Multiple series per bucket that sum to a meaningful whole (e.g. collections split by bank, summing to the day's total) | Stacked bar |
| Multiple series per bucket that don't sum to one whole (e.g. comparing two unrelated metrics) | Grouped bars or multiple lines, never stacked |
| Whole-range composition by category, no time axis (e.g. this month's total by bank) | Reuses today's exact-value `groupBy` (already works, no new adapter work) rendered as a horizontal bar list, or a pie/donut only when ≤ 4–5 categories — more than that, a pie is hard to compare and a bar list reads better |

**Placement — two levels, both optional:**

1. **Inline**, above a `report` table (`display: "both"`) — a trend chart contextualizing the table beneath it, using the exact same fetched rows.
2. **Standalone** (`display: "chart"`) — when the chart itself is the primary view and the table is unnecessary or available as a separate view.

**Decided: Recharts.** React-native (no imperative DOM/canvas bridge to manage), SVG-based, composable, and its component-per-piece structure (`XAxis`, `Line`, `Tooltip`, ...) is exactly what makes the no-reinvention prop-passthrough design above possible — a charting library with one monolithic config object (rather than composable components) wouldn't map onto "pass the same props you'd use directly" nearly as cleanly.

## API Surface

**No new route.** The server already exposes `POST /api/collections/:slug/aggregate` (used today for `ViewMetric` KPI cards); it just needs to accept the richer `GroupBySpec` in its request body and pass it straight through to `DatabaseAdapter.aggregate()`.

**SDK:** `client.collection(slug).aggregate({ aggregates, groupBy, where })` — confirm today's SDK method (used by `useViewMetrics`) already forwards an arbitrary `groupBy` value untyped/unvalidated, or needs its param type widened from `string` to `GroupBySpec`. Either way this is a type-only SDK change, not a new endpoint or method.

**Access control:** the report's `filter` and `access` (inherited from `DefineViewBaseOptions`) apply exactly as they do for every other view type today — no new access model needed.

## Open Questions / Decisions Needed

- [x] **Interval set:** ship `day` | `week` | `month` | `quarter` | `year` — decided: ship the full set. Postgres' date\_trunc and Mongo's $dateTrunc cover every interval natively, and MySQL/SQLite need the same per-interval format-string table regardless of how many intervals ship, so trimming to day/week/month for v1 saves no real implementation cost.
- [x] **Timezone semantics:** accept the Postgres/Mongo-only honoring of `DateBucketGroupBy.timezone` (MySQL/SQLite always bucket in stored-value timezone), or require all app-level date fields to be pre-normalized to a single timezone before storage, sidestepping the discrepancy entirely? — revised decision: shift-then-truncate for MySQL/SQLite. Resolve the requested IANA timezone to a UTC offset at query time and add it to the field expression before truncation (DATE\_ADD/DATE\_SUB in MySQL, datetime(..., '±N hours') in SQLite), so all four adapters honor an explicit timezone consistently — more flexible and more production-grade than limiting timezone support to Postgres/Mongo, and it avoids requiring all stored dates to be pre-normalized. Known limitation: the offset is resolved once per query, so a bucket range spanning a DST transition can be off by an hour — document this rather than block on it.
- [x] **Empty-bucket gap-filling:** confirm the shared-controller zero-fill approach (recommended above) vs. leaving gaps absent and letting the admin UI render "no data" rows client-side instead. — decided: shared-controller zero-fill, as recommended above.
- [x] **Pagination vs. date-range picker:** does a report view need `limit`/`page` at all, or is a bounded date-range filter (no pagination) the only interaction model needed for v1? — decided: no pagination. A bounded date-range filter is the only interaction model for v1; limit/page are not exposed on report views.
- [x] **Naming:** `defineReportView` (this spec's working name) vs. some other term — "derived list," as you called it in the original ask, is also on the table. Whatever ships needs to read naturally next to `defineTableView`/`defineKanbanView` etc. — decided: keep defineReportView. It reads naturally next to defineTableView/defineKanbanView, so no rename.
- [x] **Does a report view need its own URL/route pattern**, or does it slot into the existing `/collections/:slug/views/:viewSlug` pattern unchanged (current assumption in this spec: unchanged)? — decided: pattern unchanged. Report views slot into the existing /collections/:slug/views/:viewSlug route; no new URL pattern.
- [x] **Cross-bucket derived metrics:** does v1 need period-over-period columns (e.g. "% change vs. previous day"), or is that explicitly out of scope for the first version? — decided: in scope for v1. Applies uniformly to every ViewMetric-based value — summary KPI cards and per-bucket report columns alike, including any sub-metric breakdown — as an optional period-over-period comparison: query the same aggregate over the immediately preceding equivalent range (current range shifted back by one bucket width) and return delta/percent-change alongside the raw value. No adapter change needed: it's two ordinary aggregate() calls (current period, previous period) diffed at the API layer, not new query logic. Added scope for Milestone 3 — see updated Rollout Plan.
- [x] **Charting library: decided — Recharts** (see Charts & Graphs).

## Rollout Plan

| Milestone | Scope | Risk |
| --- | --- | --- |
| 1. Core types + adapters | `GroupBySpec`/`DateBucketGroupBy` types; date-trunc grouping in all 4 adapters; Mongo `where`-in-groupBy fix; one adapter-specific test suite per engine seeding known dates | Highest — the only genuinely new cross-engine query logic. Timezone/interval-format edge cases most likely to surface here. |
| 2. `defineReportView` config API | Type + `defineReportView()` factory; SDK type widening for `groupBy` | Low — pure typing/plumbing, mirrors existing `defineKanbanView` pattern closely |
| 3. Admin UI | `ReportViewPage`, report table renderer, `useReportRows` hook, wiring `summary` through existing `useViewMetrics`/`MetricCards`; period-over-period comparison (previous-period fetch + delta/percent-change rendering) for both summary cards and per-bucket columns, including sub-metrics | Medium — mostly new-but-thin UI; main risk is scope creep (sort/pagination/date-picker polish) Now also carries period-over-period comparison for all metrics and sub-metrics per the Open Questions decision — raises this milestone to Medium-High. |
| 4. Example + docs | Add a `defineReportView` example to `apps/example-creator-next/dyrected.config.ts` (a day-by-day payments/transactions report is the natural fit given the existing example data), update public docs | Low |

**Test plan per milestone:**

- Milestone 1: one test file per adapter package, each seeding rows across several days/weeks/months in that engine's own storage format, asserting exact returned bucket keys + aggregate values, plus a dedicated regression test for the Mongo `where`-in-groupBy fix (a metric with a `where` filter must return different sums than one without, when grouped).
- Milestone 2: type-level tests only (`defineReportView` accepts/rejects the right shapes) — no adapter involved.
- Milestone 3: admin component tests following this session's established pattern (`renderHook`/`render` + mocked `client.collection().aggregate()`), asserting: one row per bucket, correct column values, no row-click/selection/action affordances present, summary cards render via the unchanged `MetricCards` path.

## Packaging: Core Feature or Plugin?

This feature reads as premium capability — cross-engine date-bucket aggregation, KPI reporting, and no-reinvention Recharts integration are the kind of thing teams pay for, not table-stakes CRUD. Worth deciding deliberately whether `defineReportView` ships free in `@dyrected/core`, or as a paid add-on following the existing plugin pattern (`specs/future/plugin-ecosystem-and-payment-gateways-spec.md`) — e.g. a `@dyrected/plugin-reports` package, installed the same way as `@dyrected/plugin-form-builder` or `@dyrected/plugin-seo`, versus bundled into a template. This doesn't change anything about the technical design above (the plugin boundary is a packaging/licensing decision, not an architectural one) — it only affects which package `defineReportView`, the adapter changes, and the admin UI ship from, and whether the collection-root `groupBy`/date-bucket capability in the core adapters stays gated behind that plugin being installed. Flagged here for a business decision before Milestone 2 (config API) locks in a package boundary.
