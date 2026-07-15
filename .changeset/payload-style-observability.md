---
"@dyrected/core": patch
---

Add Payload-style logger config and first-class observability to Dyrected core

Dyrected now supports a root `logger` config shaped like Payload's Pino-based logger surface, plus a new top-level `observability` config for request logging, redaction, sampling, tracing, metrics, and Dyrected-managed transports.

Request logging is now structured instead of ad hoc string output. Successful requests are sampled, `4xx` requests log at `warn`, `5xx` requests log at `error`, and request ids, site/workspace ids, and trace correlation fields are included when available.

Body logging is opt-in and bounded. Dyrected only attempts to capture JSON request bodies, redacts common secret fields and headers before logging, truncates oversized payloads, and falls back to metadata-only logging when a body cannot be parsed safely after capture.

Core services and request paths now use structured logger helpers instead of direct `console.*` calls. This includes auth, audit-failure reporting, email delivery failures, router warnings, workflow hook isolation, and request error handling.

OpenTelemetry tracing and metrics are now available behind explicit config. Dyrected can create request spans, emit request and failure metrics, export telemetry through OTLP, and expose a Prometheus scrape route only when configured. Audit logging remains a separate feature and is not merged with runtime observability.
