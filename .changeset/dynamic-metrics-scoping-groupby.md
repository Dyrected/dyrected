---
"@dyrected/core": minor
"@dyrected/admin": minor
---

- **Metric Scoping Architecture (`metricsScope` & `scope`)**: Added comprehensive filter scoping to operational view metrics and sub-metrics with three evaluation modes:
  - `"view"` (default): Evaluates against the view's persistent filter (`view.filter`), serving as a stable reference KPI unaffected by ephemeral table row filters.
  - `"filtered"`: Dynamically live-syncs with active table toolbar filters, column filters, and search queries.
  - `"collection"`: Evaluates across the entire collection, computing global lifetime totals regardless of view or table filters.
  - Hierarchical inheritance allows views to set `metricsScope`, individual metric cards to specify `scope`, and sub-metric rows to optionally override.
- **Contextual Scope Icons on Metric Cards**: Added clean, subtle 12px status icons with tooltips (`Filter` for filtered, `Database` for collection, `Layers` for view) next to card headers and sub-metric rows, giving instant visual clarity on data boundaries.
- **Dynamic Grouped Metrics (`groupBy`)**: Introduced declarative `groupBy` support on `ViewMetric` and `ViewSubMetric`:
  - **Dynamic Metric Cards**: Setting `groupBy: "field"` on a metric card dynamically expands into one metric card per distinct group (e.g. 10 communities $\rightarrow$ 10 cards) with templated labels (`{{group.label}}`, `{{group.value}}`) and group-scoped aggregations.
  - **Dynamic Sub-Metrics**: Setting `groupBy: "field"` on a sub-metric dynamically expands into $N$ breakdown rows in the footer of a single metric card.
  - **Automatic Group Discovery**: Automatically resolves group options for relationship fields (fetching related document titles and IDs), select/radio options, boolean fields, and scalar distinct values.
  - **Single Batched Aggregation**: Fans all dynamically expanded operations across cards, sub-metrics, and groups into a single batched database aggregation query (`client.collection(slug).aggregate(input)`), completely eliminating N+1 queries.
- **Navigation Editor & Interactive KPI Builder**:
  - Full support in the Navigation Customizer (`ViewMetricsBuilder`) for configuring default view `metricsScope` (`"view" | "filtered" | "collection"`), card `scope`, and `groupBy` (supporting relationship, select, radio, boolean, and scalar fields).
  - Interactive click-to-edit on active KPI chips allowing live reconfiguration of metric labels, operations, target fields, format, colors, scope, and groupBy.
  - Added "Revert View" action in the Navigation Customizer to seamlessly discard personal overrides and restore codebase view definitions.
  - Enhanced `reconcileNavigation` in `@dyrected/core` to intelligently inherit new `metricsScope`, `scope`, `groupBy`, and `subMetrics` from codebase view definitions when sparse user preferences are present.
- **Native Search Parameter in Operational Views**: Operational views (Table, Cards, Spreadsheet, Kanban) now forward toolbar search directly to the backend pagination endpoint via the `search` query parameter, ensuring performant full-text searches.
