import { Writable } from "node:stream";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { createDyrectedApp } from "../app.js";
import {
  captureRequestBody,
  createObservabilityRuntime,
  redactBody,
  redactHeaders,
  resolveObservabilityConfig,
  shouldSampleRequest,
} from "../observability.js";
import { defineConfig } from "../index.js";
import { MockDatabaseAdapter } from "./mocks.js";

process.env.DYRECTED_JWT_SECRET ??= "test-secret";

class LogCollector extends Writable {
  readonly lines: string[] = [];

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    this.lines.push(chunk.toString());
    callback();
  }

  entries() {
    return this.lines
      .join("")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }
}

function baseConfig() {
  return defineConfig({
    collections: [],
    globals: [],
    db: new MockDatabaseAdapter(),
  });
}

describe("Observability", () => {
  it("applies the documented defaults", () => {
    const resolved = resolveObservabilityConfig();

    expect(resolved.requestLogging.enabled).toBe(true);
    expect(resolved.requestLogging.logBodies).toBe(false);
    expect(resolved.requestLogging.maxBodyBytes).toBe(8192);
    expect(resolved.sampling.successRate).toBe(0.1);
    expect(resolved.sampling.traceSuccessRate).toBe(0.1);
    expect(resolved.sampling.bodySuccessRate).toBe(0.02);
    expect(resolved.sampling.alwaysKeep4xx).toBe(true);
    expect(resolved.sampling.alwaysKeep5xx).toBe(true);
    expect(resolved.tracing.enabled).toBe(false);
    expect(resolved.metrics.enabled).toBe(false);
    expect(resolved.requestLogging.redactHeaders).toEqual(
      expect.arrayContaining(["authorization", "cookie", "set-cookie", "x-api-key"]),
    );
    expect(resolved.requestLogging.redactPaths).toEqual(
      expect.arrayContaining(["password", "token", "secret", "apiKey"]),
    );
  });

  it("passes through an instantiated logger", () => {
    const collector = new LogCollector();
    const logger = pino({}, collector);

    const runtime = createObservabilityRuntime({
      ...baseConfig(),
      logger,
    });

    expect(runtime.logger).toBe(logger);
  });

  it("redacts headers and nested body fields", () => {
    const observability = resolveObservabilityConfig({
      requestLogging: {
        includeHeaders: ["authorization", "x-request-id"],
        redactPaths: ["profile.secret", "tokens.*.value"],
      },
    });

    expect(
      redactHeaders(
        {
          Authorization: "Bearer secret",
          "X-Request-Id": "req_123",
          "Content-Type": "application/json",
        },
        observability,
      ),
    ).toEqual({
      authorization: "[REDACTED]",
      "x-request-id": "req_123",
    });

    expect(
      redactBody(
        {
          password: "super-secret",
          profile: { secret: "nested-secret" },
          tokens: [{ value: "first" }, { value: "second" }],
        },
        observability.requestLogging.redactPaths,
      ),
    ).toEqual({
      password: "[REDACTED]",
      profile: { secret: "[REDACTED]" },
      tokens: [{ value: "[REDACTED]" }, { value: "[REDACTED]" }],
    });
  });

  it("samples deterministically and always keeps failures", () => {
    const sampling = resolveObservabilityConfig().sampling;

    expect(shouldSampleRequest("req-1", 200, sampling, "log")).toBe(
      shouldSampleRequest("req-1", 200, sampling, "log"),
    );
    expect(shouldSampleRequest("req-1", 404, sampling, "log")).toBe(true);
    expect(shouldSampleRequest("req-1", 500, sampling, "trace")).toBe(true);
  });

  it("captures only supported request bodies and reports truncated parse failures", async () => {
    const observability = resolveObservabilityConfig({
      requestLogging: {
        logBodies: true,
        maxBodyBytes: 16,
      },
    });

    const multipartCapture = await captureRequestBody(
      new Request("http://localhost/upload", {
        method: "POST",
        headers: {
          "content-type": "multipart/form-data; boundary=abc",
        },
        body: "--abc",
      }),
      observability,
    );

    expect(multipartCapture).toEqual({
      attempted: false,
      contentType: "multipart/form-data; boundary=abc",
      contentLength: undefined,
    });

    const jsonCapture = await captureRequestBody(
      new Request("http://localhost/echo", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ password: "very-secret", payload: "x".repeat(64) }),
      }),
      observability,
    );

    expect(jsonCapture.attempted).toBe(true);
    expect(jsonCapture.truncated).toBe(true);
    expect(jsonCapture.parseFailed).toBe(true);
    expect(jsonCapture.body).toBeUndefined();
  });

  it("logs structured request events with redaction and preserves request bodies for handlers", async () => {
    const collector = new LogCollector();
    const config = defineConfig({
      collections: [],
      globals: [],
      db: new MockDatabaseAdapter(),
      logger: {
        options: { level: "info" },
        destination: collector,
      },
      observability: {
        requestLogging: {
          logBodies: true,
          redactPaths: ["profile.secret"],
          includeHeaders: ["authorization", "content-type"],
        },
        sampling: {
          successRate: 1,
          bodySuccessRate: 1,
        },
      },
    });
    const app = await createDyrectedApp(config);

    app.post("/echo", async (c) => c.json(await c.req.json()));

    const response = await app.request("/echo", {
      method: "POST",
      headers: {
        authorization: "Bearer super-secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        password: "top-secret",
        profile: { secret: "nested-secret" },
        safe: "value",
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      password: "top-secret",
      profile: { secret: "nested-secret" },
      safe: "value",
    });

    const requestLog = collector
      .entries()
      .find((entry) => entry.msg === "HTTP request completed");

    expect(requestLog).toMatchObject({
      msg: "HTTP request completed",
      method: "POST",
      path: "/echo",
      statusCode: 200,
      sampled: true,
      headers: {
        authorization: "[REDACTED]",
        "content-type": "application/json",
      },
      body: {
        password: "[REDACTED]",
        profile: { secret: "[REDACTED]" },
        safe: "value",
      },
    });
  });

  it("uses warn and error levels for 4xx and 5xx request logs", async () => {
    const collector = new LogCollector();
    const app = await createDyrectedApp(
      defineConfig({
        collections: [],
        globals: [],
        db: new MockDatabaseAdapter(),
        logger: {
          options: { level: "info" },
          destination: collector,
        },
        observability: {
          sampling: {
            successRate: 1,
          },
        },
      }),
    );

    app.get("/bad-request", (c) => c.json({ error: true }, 400));
    app.get("/boom", () => {
      throw new Error("boom");
    });

    expect((await app.request("/bad-request")).status).toBe(400);
    expect((await app.request("/boom")).status).toBe(500);

    const requestLogs = collector
      .entries()
      .filter((entry) => entry.msg === "HTTP request completed");

    expect(requestLogs.find((entry) => entry.path === "/bad-request")?.level).toBe(40);
    expect(requestLogs.find((entry) => entry.path === "/boom")?.level).toBe(50);
  });

  it("only exposes the Prometheus metrics route when configured", async () => {
    const enabledApp = await createDyrectedApp(
      defineConfig({
        collections: [],
        globals: [],
        db: new MockDatabaseAdapter(),
        observability: {
          metrics: {
            enabled: true,
            exporter: "prometheus",
            path: "/metricsz",
          },
          sampling: {
            successRate: 1,
          },
        },
      }),
    );

    await enabledApp.request("/health");
    const metricsResponse = await enabledApp.request("/metricsz");

    expect(metricsResponse.status).toBe(200);
    expect(await metricsResponse.text()).toContain("dyrected_http_requests_total");

    const disabledApp = await createDyrectedApp(baseConfig());
    const missingMetricsResponse = await disabledApp.request("/metrics");

    expect(missingMetricsResponse.status).toBe(404);
  });
});
