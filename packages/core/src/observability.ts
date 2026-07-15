import {
  TraceFlags,
  context as otelContext,
  trace,
  type Attributes,
  type Counter,
  type Histogram,
  type Span,
  type Tracer,
} from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base";
import type { Context } from "hono";
import pino, {
  destination as pinoDestination,
  multistream,
  stdTimeFunctions,
  type DestinationStream,
  type Level,
  type Logger,
} from "pino";
import pinoPretty from "pino-pretty";
import { Writable } from "node:stream";
import type { ServerResponse } from "node:http";
import type { DyrectedContext } from "./app.js";
import type {
  DyrectedConfig,
  DyrectedLoggerConfig,
  DyrectedObservabilityConfig,
} from "./types/index.js";

const DEFAULT_REDACT_HEADERS = ["authorization", "cookie", "set-cookie", "x-api-key"];
const DEFAULT_REDACT_PATHS = [
  "password",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "token",
  "refreshToken",
  "accessToken",
  "secret",
  "apiKey",
  "inviteToken",
  "resetToken",
];
const DEFAULT_MAX_BODY_BYTES = 8_192;
const DEFAULT_SUCCESS_SAMPLE_RATE = 0.1;
const DEFAULT_BODY_SAMPLE_RATE = 0.02;
const REDACTED_VALUE = "[REDACTED]";
const runtimeByConfig = new WeakMap<object, DyrectedObservabilityRuntime>();

type RequestVars = DyrectedContext["Variables"];

export interface ResolvedObservabilityConfig {
  requestLogging: {
    enabled: boolean;
    logBodies: boolean;
    maxBodyBytes: number;
    redactPaths: string[];
    includeHeaders: string[];
    redactHeaders: string[];
  };
  sampling: {
    successRate: number;
    traceSuccessRate: number;
    bodySuccessRate: number;
    alwaysKeep4xx: boolean;
    alwaysKeep5xx: boolean;
  };
  tracing: {
    enabled: boolean;
    serviceName: string;
    exporter: "otlp" | "console" | "none";
    headers: Record<string, string>;
    endpoint?: string;
  };
  metrics: {
    enabled: boolean;
    exporter: "otlp" | "prometheus" | "none";
    endpoint?: string;
    path: string;
  };
  transports: {
    targets: Array<
      | { type: "stdout" }
      | { type: "stderr" }
      | { type: "file"; path: string }
      | { type: "otlp"; endpoint: string; headers?: Record<string, string> }
    >;
  };
}

export interface RequestTraceContext {
  span: Span;
  traceId: string;
  spanId: string;
  sampled: boolean;
}

export interface RequestBodyCapture {
  attempted: boolean;
  contentType?: string;
  contentLength?: number;
  truncated?: boolean;
  parseFailed?: boolean;
  body?: unknown;
}

interface MetricsRuntime {
  requestCount: Counter<Attributes>;
  authFailureCount: Counter<Attributes>;
  uncaughtErrorCount: Counter<Attributes>;
  auditWriteFailureCount: Counter<Attributes>;
  emailSendFailureCount: Counter<Attributes>;
  workflowHookFailureCount: Counter<Attributes>;
  requestDuration: Histogram<Attributes>;
}

interface MeterProviderRuntime {
  provider: MeterProvider;
  prometheusExporter?: PrometheusExporter;
}

export interface DyrectedObservabilityRuntime {
  logger: Logger;
  config: ResolvedObservabilityConfig;
  tracer?: Tracer;
  metrics?: MetricsRuntime;
  prometheusExporter?: PrometheusExporter;
  shutdown: () => Promise<void>;
  recordAuthFailure: (attributes?: Attributes) => void;
  recordUncaughtError: (attributes?: Attributes) => void;
  recordAuditWriteFailure: (attributes?: Attributes) => void;
  recordEmailSendFailure: (attributes?: Attributes) => void;
  recordWorkflowHookFailure: (attributes?: Attributes) => void;
}

const fallbackLogger = pino({
  name: "dyrected",
  enabled: process.env.DISABLE_LOGGING !== "true",
  timestamp: stdTimeFunctions.isoTime,
});

export function resolveObservabilityConfig(
  config?: DyrectedObservabilityConfig,
): ResolvedObservabilityConfig {
  const requestLogging = config?.requestLogging;
  const sampling = config?.sampling;
  const tracing = config?.tracing;
  const metrics = config?.metrics;

  return {
    requestLogging: {
      enabled: requestLogging?.enabled ?? true,
      logBodies: requestLogging?.logBodies ?? false,
      maxBodyBytes: requestLogging?.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
      redactPaths: uniqueValues([
        ...DEFAULT_REDACT_PATHS,
        ...(requestLogging?.redactPaths ?? []),
      ]),
      includeHeaders: normalizeHeaderNames(requestLogging?.includeHeaders ?? []),
      redactHeaders: uniqueValues(
        normalizeHeaderNames([
          ...DEFAULT_REDACT_HEADERS,
          ...(requestLogging?.redactHeaders ?? []),
        ]),
      ),
    },
    sampling: {
      successRate: clampRate(sampling?.successRate ?? DEFAULT_SUCCESS_SAMPLE_RATE),
      traceSuccessRate: clampRate(
        sampling?.traceSuccessRate ?? sampling?.successRate ?? DEFAULT_SUCCESS_SAMPLE_RATE,
      ),
      bodySuccessRate: clampRate(
        sampling?.bodySuccessRate ?? Math.min(DEFAULT_BODY_SAMPLE_RATE, sampling?.successRate ?? DEFAULT_SUCCESS_SAMPLE_RATE),
      ),
      alwaysKeep4xx: sampling?.alwaysKeep4xx ?? true,
      alwaysKeep5xx: sampling?.alwaysKeep5xx ?? true,
    },
    tracing: {
      enabled: tracing?.enabled ?? false,
      serviceName: tracing?.serviceName ?? "dyrected",
      exporter: tracing?.exporter ?? "none",
      headers: tracing?.headers ?? {},
      endpoint: tracing?.endpoint,
    },
    metrics: {
      enabled: metrics?.enabled ?? false,
      exporter: metrics?.exporter ?? "none",
      endpoint: metrics?.endpoint,
      path: metrics?.path ?? "/metrics",
    },
    transports: {
      targets:
        config?.transports?.targets && config.transports.targets.length > 0
          ? config.transports.targets
          : [{ type: "stdout" }],
    },
  };
}

export function createObservabilityRuntime(
  config: DyrectedConfig,
): DyrectedObservabilityRuntime {
  const resolved = resolveObservabilityConfig(config.observability);
  const logger = createRootLogger(config.logger, resolved);
  const shutdownTasks: Array<() => Promise<void>> = [];

  const meterRuntime =
    resolved.metrics.enabled || resolved.metrics.exporter === "prometheus"
      ? createMeterProvider(resolved)
      : undefined;
  const tracerProvider =
    resolved.tracing.enabled ? createTracerProvider(resolved) : undefined;

  const tracer = tracerProvider?.getTracer("dyrected");
  const meter = meterRuntime?.provider.getMeter("dyrected");
  const metrics = meter
    ? {
        requestCount: meter.createCounter("dyrected_http_requests_total", {
          description: "Total HTTP requests served by Dyrected",
        }),
        authFailureCount: meter.createCounter("dyrected_auth_failures_total", {
          description: "Authentication failures",
        }),
        uncaughtErrorCount: meter.createCounter("dyrected_uncaught_errors_total", {
          description: "Uncaught application errors",
        }),
        auditWriteFailureCount: meter.createCounter("dyrected_audit_write_failures_total", {
          description: "Audit log persistence failures",
        }),
        emailSendFailureCount: meter.createCounter("dyrected_email_send_failures_total", {
          description: "Transactional email delivery failures",
        }),
        workflowHookFailureCount: meter.createCounter("dyrected_workflow_hook_failures_total", {
          description: "Workflow hook failures isolated after successful writes",
        }),
        requestDuration: meter.createHistogram("dyrected_http_request_duration_ms", {
          description: "HTTP request duration in milliseconds",
          unit: "ms",
        }),
      }
    : undefined;

  if (meterRuntime) {
    shutdownTasks.push(() => meterRuntime.provider.shutdown());
  }
  if (tracerProvider) {
    shutdownTasks.push(() => tracerProvider.shutdown());
  }

  return {
    logger,
    config: resolved,
    tracer,
    metrics,
    prometheusExporter: meterRuntime?.prometheusExporter,
    shutdown: async () => {
      for (const task of shutdownTasks) {
        await task();
      }
    },
    recordAuthFailure: (attributes) => metrics?.authFailureCount.add(1, attributes),
    recordUncaughtError: (attributes) => metrics?.uncaughtErrorCount.add(1, attributes),
    recordAuditWriteFailure: (attributes) =>
      metrics?.auditWriteFailureCount.add(1, attributes),
    recordEmailSendFailure: (attributes) =>
      metrics?.emailSendFailureCount.add(1, attributes),
    recordWorkflowHookFailure: (attributes) =>
      metrics?.workflowHookFailureCount.add(1, attributes),
  };
}

export function bindObservabilityRuntime(
  config: DyrectedConfig,
  runtime: DyrectedObservabilityRuntime,
) {
  runtimeByConfig.set(config, runtime);
}

export function getObservabilityRuntime(
  config: Pick<DyrectedConfig, "logger"> | undefined,
): DyrectedObservabilityRuntime | undefined {
  if (!config || typeof config !== "object") return undefined;
  return runtimeByConfig.get(config);
}

function createRootLogger(
  loggerConfig: DyrectedLoggerConfig | undefined,
  observability: ResolvedObservabilityConfig,
): Logger {
  if (loggerConfig && !("options" in loggerConfig)) {
    return loggerConfig;
  }

  const options = loggerConfig?.options ?? {};
  const enabled = options.enabled ?? process.env.DISABLE_LOGGING !== "true";
  const name = options.name ?? "dyrected";

  if (loggerConfig?.destination) {
    return pino(
      {
        ...options,
        enabled,
        name,
        timestamp: options.timestamp ?? stdTimeFunctions.isoTime,
      },
      loggerConfig.destination,
    );
  }

  const streams = buildTransportStreams(observability);
  const destination =
    streams.length === 1
      ? streams[0]
      : multistream(streams.map((stream) => ({ stream })));

  return pino(
    {
      ...options,
      enabled,
      name,
      timestamp: options.timestamp ?? stdTimeFunctions.isoTime,
    },
    destination,
  );
}

function buildTransportStreams(
  observability: ResolvedObservabilityConfig,
): DestinationStream[] {
  const targets = observability.transports.targets;
  if (targets.length === 0) {
    return [defaultLoggerDestination()];
  }

  return targets.map((target) => {
    switch (target.type) {
      case "stdout":
        return defaultLoggerDestination();
      case "stderr":
        return pinoDestination(2);
      case "file":
        return pinoDestination(target.path);
      case "otlp":
        return new OtlpLogWritable(target.endpoint, target.headers);
    }
  });
}

function defaultLoggerDestination(): DestinationStream {
  if (process.env.NODE_ENV !== "production") {
    return pinoPretty({
      colorize: true,
      ignore: "pid,hostname",
      translateTime: "SYS:HH:MM:ss",
      destination: 1,
      sync: true,
    }) as DestinationStream;
  }

  return pinoDestination(1);
}

class OtlpLogWritable extends Writable {
  constructor(
    private readonly endpoint: string,
    private readonly headers: Record<string, string> = {},
  ) {
    super();
  }

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    const payload = chunk.toString();
    void fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.headers,
      },
      body: JSON.stringify({ logs: payload.trim().split("\n").filter(Boolean) }),
    })
      .then(() => callback())
      .catch((error) =>
        callback(error instanceof Error ? error : new Error(String(error))),
      );
  }
}

function createTracerProvider(observability: ResolvedObservabilityConfig) {
  const exporter = createTraceExporter(observability);
  const provider = new BasicTracerProvider({
    resource: resourceFromAttributes({
      "service.name": observability.tracing.serviceName,
    }),
    spanProcessors: exporter ? [new BatchSpanProcessor(exporter)] : [],
  });
  trace.setGlobalTracerProvider(provider);
  return provider;
}

function createTraceExporter(
  observability: ResolvedObservabilityConfig,
): SpanExporter | undefined {
  switch (observability.tracing.exporter) {
    case "console":
      return new ConsoleSpanExporter();
    case "otlp":
      return new OTLPTraceExporter({
        url: observability.tracing.endpoint,
        headers: observability.tracing.headers,
      });
    default:
      return undefined;
  }
}

function createMeterProvider(observability: ResolvedObservabilityConfig) {
  const readers: Array<PeriodicExportingMetricReader | PrometheusExporter> = [];
  let prometheusExporter: PrometheusExporter | undefined;

  switch (observability.metrics.exporter) {
    case "otlp":
      readers.push(
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: observability.metrics.endpoint,
          }),
        }),
      );
      break;
    case "prometheus":
      prometheusExporter = new PrometheusExporter({
        endpoint: observability.metrics.path,
        preventServerStart: true,
      });
      readers.push(prometheusExporter);
      break;
  }

  const provider = new MeterProvider({
    resource: resourceFromAttributes({
      "service.name": observability.tracing.serviceName,
    }),
    readers,
  });

  return { provider, prometheusExporter };
}

export function getConfigLogger(
  config: Pick<DyrectedConfig, "logger"> | undefined,
  component: string,
): Logger {
  const base = config?.logger && !("options" in config.logger) ? config.logger : fallbackLogger;
  return base.child({ component });
}

export function getRequestLogger(
  c: Context<DyrectedContext>,
  component?: string,
): Logger {
  const base = c.get("logger") ?? fallbackLogger;
  return component ? base.child({ component }) : base;
}

export function buildRequestLogger(
  runtime: DyrectedObservabilityRuntime,
  vars: RequestVars,
  requestId?: string,
): Logger {
  const trace = vars.requestTrace;
  return runtime.logger.child({
    requestId,
    siteId: vars.siteId,
    workspaceId: vars.workspaceId,
    traceId: trace?.traceId,
    spanId: trace?.spanId,
  });
}

export function shouldSampleRequest(
  requestId: string | undefined,
  statusCode: number,
  sampling: ResolvedObservabilityConfig["sampling"],
  kind: "log" | "trace" | "body",
): boolean {
  if (statusCode >= 500 && sampling.alwaysKeep5xx) return true;
  if (statusCode >= 400 && sampling.alwaysKeep4xx) return true;

  const rate =
    kind === "trace"
      ? sampling.traceSuccessRate
      : kind === "body"
        ? sampling.bodySuccessRate
        : sampling.successRate;

  return deterministicSample(requestId ?? "no-request-id", rate);
}

export function redactHeaders(
  headers: Record<string, string>,
  observability: ResolvedObservabilityConfig,
): Record<string, string> {
  const includeHeaders = new Set(observability.requestLogging.includeHeaders);
  const redactHeaders = new Set(observability.requestLogging.redactHeaders);
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const normalizedKey = key.toLowerCase();
    if (includeHeaders.size > 0 && !includeHeaders.has(normalizedKey)) continue;
    output[normalizedKey] = redactHeaders.has(normalizedKey) ? REDACTED_VALUE : value;
  }

  return output;
}

export async function captureRequestBody(
  request: Request,
  observability: ResolvedObservabilityConfig,
): Promise<RequestBodyCapture> {
  const contentType = request.headers.get("content-type") ?? undefined;
  const contentLength = toNumber(request.headers.get("content-length"));
  const jsonBody = contentType?.includes("application/json");

  if (!jsonBody) {
    return {
      attempted: false,
      contentType,
      contentLength,
    };
  }

  try {
    const text = await request.clone().text();
    if (!text) {
      return { attempted: true, contentType, contentLength };
    }

    const truncated = text.length > observability.requestLogging.maxBodyBytes;
    const raw = truncated
      ? text.slice(0, observability.requestLogging.maxBodyBytes)
      : text;

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        attempted: true,
        contentType,
        contentLength: contentLength ?? text.length,
        truncated,
        body: redactBody(parsed, observability.requestLogging.redactPaths),
      };
    } catch {
      return {
        attempted: true,
        contentType,
        contentLength: contentLength ?? text.length,
        truncated,
        parseFailed: true,
      };
    }
  } catch {
    return {
      attempted: true,
      contentType,
      contentLength,
      parseFailed: true,
    };
  }
}

export function redactBody(value: unknown, redactPaths: string[]): unknown {
  const cloned = deepClone(value);
  for (const path of redactPaths) {
    applyRedaction(cloned, path.split("."));
  }
  return cloned;
}

function applyRedaction(target: unknown, segments: string[]): void {
  if (!target || segments.length === 0) return;

  const [segment, ...rest] = segments;

  if (Array.isArray(target)) {
    for (const item of target) {
      if (segment === "*") {
        applyRedaction(item, rest);
      } else {
        applyRedaction(item, segments);
      }
    }
    return;
  }

  if (typeof target !== "object") return;

  const record = target as Record<string, unknown>;

  if (segment === "*") {
    for (const value of Object.values(record)) {
      applyRedaction(value, rest);
    }
    return;
  }

  if (!(segment in record)) return;
  if (rest.length === 0) {
    record[segment] = REDACTED_VALUE;
    return;
  }

  applyRedaction(record[segment], rest);
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createRequestSpan(
  runtime: DyrectedObservabilityRuntime,
  name: string,
  attributes: Attributes,
): RequestTraceContext | undefined {
  if (!runtime.tracer) return undefined;
  const span = runtime.tracer.startSpan(name, { attributes }, otelContext.active());
  const spanContext = span.spanContext();
  return {
    span,
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    sampled: spanContext.traceFlags === TraceFlags.SAMPLED,
  };
}

export function endRequestSpan(
  requestTrace: RequestTraceContext | undefined,
  statusCode: number,
  error?: unknown,
) {
  if (!requestTrace) return;
  requestTrace.span.setAttribute("http.status_code", statusCode);
  if (error) {
    requestTrace.span.recordException(error instanceof Error ? error : new Error(String(error)));
  }
  requestTrace.span.end();
}

export function attachRequestMetrics(
  runtime: DyrectedObservabilityRuntime,
  args: {
    method: string;
    route: string;
    statusCode: number;
    durationMs: number;
  },
) {
  runtime.metrics?.requestCount.add(1, {
    method: args.method,
    route: args.route,
    status_class: `${Math.floor(args.statusCode / 100)}xx`,
  });
  runtime.metrics?.requestDuration.record(args.durationMs, {
    method: args.method,
    route: args.route,
    status_class: `${Math.floor(args.statusCode / 100)}xx`,
  });
}

export async function renderPrometheusMetrics(
  exporter: PrometheusExporter,
): Promise<{ body: string; headers: Record<string, string>; statusCode: number }> {
  let statusCode = 200;
  const headers: Record<string, string> = {};
  let body = "";

  await new Promise<void>((resolve) => {
    const response = {
      statusCode,
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      end(chunk?: string) {
        if (chunk) body += chunk;
        statusCode = (this as ServerResponse).statusCode;
        resolve();
      },
    } as unknown as ServerResponse;

    exporter.getMetricsRequestHandler({} as never, response);
  });

  return { body, headers, statusCode };
}

function normalizeHeaderNames(headers: string[]): string[] {
  return headers.map((value) => value.toLowerCase());
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}

function clampRate(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function deterministicSample(seed: string, rate: number): boolean {
  if (rate >= 1) return true;
  if (rate <= 0) return false;

  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash / 0xffffffff <= rate;
}

function toNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
