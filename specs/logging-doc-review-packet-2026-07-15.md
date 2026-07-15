# Logging Docs Review Packet

Status: `reviewed-and-source-verified`

## Document purpose

This packet supports the new logging and observability docs for Dyrected:

- canonical page: `apps/docs/content/docs/basics/configuration/logging.mdx`
- supporting updates:
  - `apps/docs/content/docs/basics/configuration/overview.mdx`
  - `apps/docs/content/docs/features/audit/overview.mdx`
  - `apps/docs/content/docs/deployment/production/deployment.mdx`

The primary doc type is a how-to/workflow guide. The supporting material is config overview and operational reference.

## Source inventory

| Source | Why it matters | Trust | Notes |
| --- | --- | --- | --- |
| `https://payloadcms.com/docs/configuration/overview` | Confirms Payload's public logger surface is a root logger config built on Pino | High | Upstream reference shape |
| `https://github.com/payloadcms/payload/blob/main/packages/payload/src/config/types.ts` | Confirms Payload's config type language around logger support | High | Upstream implementation/type reference |
| `packages/core/src/types/app-config.ts` | Source of truth for Dyrected public config names and shapes | High | Implemented in this change |
| `packages/core/src/observability.ts` | Source of truth for defaults, redaction, sampling, transports, tracing, metrics, and Prometheus behavior | High | Implemented in this change |
| `packages/core/src/app.ts` | Source of truth for request logging, request spans, and Prometheus route registration | High | Implemented in this change |
| `packages/core/src/services/audit.service.ts` | Confirms runtime logging and audit logging remain separate concerns | High | Boundary check |
| `apps/docs/DOCS_PHILOSOPHY.md` | Voice, structure, and example constraints for Dyrected docs | High | Writing standard |
| `apps/docs/content/docs/features/audit/overview.mdx` | Existing canonical audit guidance that needed boundary clarification | High | Supporting page |

## What changed in the docs

- added a new canonical page for `logger` and `observability`
- added top-level config guidance links from configuration overview
- clarified audit logging vs runtime logging
- added deployment guidance for OTLP secrets and Prometheus exposure

## Uncertainty register

- None for the documented config names, defaults, transport list, or routing behavior in the current codebase
- Operational caveat retained intentionally in docs: truncated JSON body capture can fall back to metadata-only logging when the truncated payload cannot be parsed safely

## High-risk claims verified

The claims below were verified directly against the current implementation:

1. Public config names and exact shapes
   - Verified in `packages/core/src/types/app-config.ts`
   - `logger` and `observability` are the public top-level config keys
2. Default redacted headers and body paths
   - Verified in `packages/core/src/observability.ts`
   - defaults are:
     - headers: `authorization`, `cookie`, `set-cookie`, `x-api-key`
     - body paths: `password`, `currentPassword`, `newPassword`, `confirmPassword`, `token`, `refreshToken`, `accessToken`, `secret`, `apiKey`, `inviteToken`, `resetToken`
3. Supported transport target list
   - Verified in `packages/core/src/observability.ts`
   - supported targets are exactly:
     - `stdout`
     - `stderr`
     - `file`
     - `otlp`
4. OTLP support split
   - Verified in `packages/core/src/observability.ts`
   - OTLP logs use `observability.transports.targets`
   - OTLP traces use `observability.tracing`
   - OTLP metrics use `observability.metrics`
5. Prometheus endpoint behavior
   - Verified in `packages/core/src/app.ts` and `packages/core/src/observability.ts`
   - route registration only happens when:
     - `metrics.enabled === true`
     - `metrics.exporter === 'prometheus'`
     - a Prometheus exporter exists
   - route path comes from `observability.metrics.path`
6. Request-body capture behavior
   - Verified in `packages/core/src/observability.ts`
   - capture is JSON-only
   - multipart and binary payloads are skipped
   - oversized or truncated payloads can fall back to metadata-only logging when parsing is unsafe
7. `DISABLE_LOGGING` behavior
   - Verified in `packages/core/src/observability.ts`
   - `DISABLE_LOGGING=true` suppresses loggers Dyrected creates itself
   - instantiated user-supplied loggers keep their own behavior

## Review decisions

Human review decisions applied:

1. `DISABLE_LOGGING` should stay on the main page
   - Applied in `apps/docs/content/docs/basics/configuration/logging.mdx`
2. The `logger` / `observability` split does not need more front-loaded explanation right now
   - No additional restructuring required
3. A separate troubleshooting path for missing request bodies should exist
   - Applied in `apps/docs/content/docs/features/troubleshooting/troubleshooting.mdx`

## Validation status

- Source-backed: yes
- Human-reviewed: yes, for the open documentation decisions above
- Final-ready: yes, for the current implementation
- Recommended next state after review: `approved-for-publish`
