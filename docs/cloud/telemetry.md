# Platform Telemetry & Usage Tracking

Dyrected Cloud includes a centralized telemetry system designed to capture high-value business and operational events across the platform.

---

## 1. Overview

Telemetry data is logged to the `platform_events` table in the `public` schema. This data is used to:
- Monitor platform health and operational performance.
- Track business KPIs (e.g., account growth, site creation).
- Audit administrative actions across workspaces.

---

## 2. Usage

### Logging an Event

Use the `logPlatformEvent` utility found in `apps/cloud/src/db/telemetry.ts`.

```ts
import { logPlatformEvent } from '../db/telemetry';

await logPlatformEvent({
  type: 'site.created',
  workspaceId: 'ws_123',
  metadata: {
    siteId: 'site_456',
    template: 'portfolio'
  }
});
```

### Event Schema

| Field | Type | Description |
|---|---|---|
| `type` | `string` | The event identifier (e.g., `account.activated`). |
| `workspaceId` | `string` | The ID of the workspace associated with the event. |
| `metadata` | `Record<string, any>` | Arbitrary JSON data relevant to the event. |
| `timestamp` | `Date` | Automatically set by the database. |

---

## 3. Standard Events

The following events are pre-instrumented in the platform:

| Event Type | Location | Description |
|---|---|---|
| `account.activated` | `routes/auth.ts` | Logged when a new cloud account is registered. |
| `site.created` | `routes/workspaces.ts` | Logged when a new site is provisioned. |
| `site.deleted` | `routes/workspaces.ts` | Logged when a site is removed. |
| `site.schema_synced` | `routes/workspaces.ts` | Logged when a site's schema is updated from the Admin UI. |
| `subscription.started` | `routes/billing.ts` | Logged when a checkout session is initiated. |

---

## 4. Best Practices

- **Non-Blocking**: Telemetry calls should generally be wrapped in `try/catch` blocks or allowed to fail silently to ensure they don't block the critical path of a request.
- **Privacy**: Avoid logging PII (Personally Identifiable Information) in the `metadata` object unless absolutely necessary.
- **Granularity**: Log events at the "intent" level (e.g., `site.created`) rather than the "database" level (e.g., `row_inserted`) to make metrics easier to interpret.

---

## 5. Visualizing Data

Telemetry data can be viewed in the **Internal Operations Dashboard** (`apps/platform`). 
1. Navigate to `/telemetry`.
2. Filter by event type or workspace ID to analyze activity.
