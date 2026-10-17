import { describe, expect, it, vi } from "vitest";
import { createDyrectedApp } from "../app.js";
import { InMemoryAdapter } from "./mocks.js";
import {
  createInProcessRuntime,
  extractFunctionRefs,
  FunctionLimitError,
  FunctionTimeoutError,
  getFunctionRuntime,
  hydrateFunctionRefs,
  isFunctionRef,
  UnresolvedFunctionRefError,
  type FunctionRuntime,
  type InvocationContext,
} from "../runtime/index.js";
import { createTaskRunner } from "../tasks.js";

describe("in-process runtime", () => {
  it("calls functions with the given arguments and awaits the result", async () => {
    const runtime = createInProcessRuntime();
    expect(await runtime.invoke(async (a: number, b: number) => a + b, [2, 3], { surface: "access" })).toBe(5);
  });

  it("lets the function's own error through unchanged", async () => {
    const error = Object.assign(new Error("nope"), { statusCode: 403 });
    await expect(
      createInProcessRuntime().invoke(() => {
        throw error;
      }, [], { surface: "access" }),
    ).rejects.toBe(error);
  });

  it("resolves FunctionRefs through a registry, and rejects unknown ones", async () => {
    const runtime = createInProcessRuntime({ registry: { "a.b": (x: number) => x * 2 } });
    expect(await runtime.invoke({ $fn: "a.b" }, [4], { surface: "access" })).toBe(8);
    await expect(runtime.invoke({ $fn: "missing" }, [], { surface: "access" })).rejects.toBeInstanceOf(UnresolvedFunctionRefError);
    await expect(createInProcessRuntime().invoke({ $fn: "a.b" }, [], { surface: "access" })).rejects.toBeInstanceOf(
      UnresolvedFunctionRefError,
    );
  });

  it("defaults when a config has no runtime", () => {
    expect(getFunctionRuntime(undefined)).toBe(getFunctionRuntime({}));
    const custom = createInProcessRuntime();
    expect(getFunctionRuntime({ functionRuntime: custom })).toBe(custom);
  });
});

describe("runtime errors", () => {
  it("carry stable codes and statuses clients can match on", () => {
    const timeout = new FunctionTimeoutError("collections.orders.hooks.beforeChange.0", "cpu", 50);
    expect(timeout).toMatchObject({ code: "FUNCTION_TIMEOUT", statusCode: 504 });
    expect(timeout.message).toContain("collections.orders.hooks.beforeChange.0");
    expect(new FunctionLimitError("f", "memory")).toMatchObject({ code: "FUNCTION_LIMIT_EXCEEDED", statusCode: 500 });
  });
});

/** A runtime that records every call and delegates to the real function. */
function recordingRuntime() {
  const calls: Array<{ ctx: InvocationContext; args: unknown[] }> = [];
  const runtime: FunctionRuntime = {
    async invoke(fn, args, ctx) {
      calls.push({ ctx, args });
      return (typeof fn === "function" ? await fn(...args) : undefined) as any;
    },
  };
  return { runtime, calls };
}

const post = (app: { request: Function }, path: string, body: unknown) =>
  app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("every user function goes through config.functionRuntime", () => {
  it("routes collection hooks, field hooks and access rules, labelled by surface", async () => {
    const { runtime, calls } = recordingRuntime();
    const db = new InMemoryAdapter();
    const app = await createDyrectedApp({
      db,
      functionRuntime: runtime,
      globals: [],
      collections: [
        {
          slug: "posts",
          fields: [
            { name: "title", type: "text", hooks: { beforeChange: [({ value }: any) => value, ], afterRead: [({ value }: any) => value] } },
          ],
          access: { create: () => true, read: () => true },
          hooks: {
            beforeChange: [({ data }: any) => data],
            afterChange: [() => undefined],
            afterRead: [({ doc }: any) => doc],
          },
        },
      ],
    } as any);

    const created = await post(app, "/api/collections/posts", { title: "hi" });
    expect(created.status).toBe(201);
    await app.request("/api/collections/posts");

    const surfaces = new Set(calls.map((c) => c.ctx.surface));
    for (const expected of [
      "access",
      "collection.beforeChange",
      "collection.afterChange",
      "collection.afterRead",
      "field.beforeChange",
      "field.afterRead",
    ]) {
      expect(surfaces, expected).toContain(expected);
    }

    const hook = calls.find((c) => c.ctx.surface === "collection.beforeChange")!;
    expect(hook.ctx).toMatchObject({ collection: "posts", path: "collection:posts.hooks.beforeChange", operation: "create" });
    expect(calls.find((c) => c.ctx.surface === "field.beforeChange")!.ctx.path).toBe("title");
  });

  it("routes action handlers and global hooks", async () => {
    const { runtime, calls } = recordingRuntime();
    const app = await createDyrectedApp({
      db: new InMemoryAdapter(),
      functionRuntime: runtime,
      collections: [
        {
          slug: "orders",
          fields: [{ name: "status", type: "text" }],
          access: { create: () => true, read: () => true, update: () => true },
          actions: [{ name: "ship", label: "Ship", handler: async () => ({ shipped: true }) }],
        },
      ],
      globals: [
        {
          slug: "settings",
          fields: [{ name: "name", type: "text" }],
          access: { read: () => true, update: () => true },
          hooks: { beforeChange: [({ data }: any) => data] },
        },
      ],
    } as any);

    const order = await (await post(app, "/api/collections/orders", { status: "new" })).json();
    const res = await post(app, `/api/collections/orders/actions/ship`, { ids: [order.id] }).catch(() => null);
    await app.request("/api/globals/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "x" }),
    });

    const surfaces = calls.map((c) => c.ctx.surface);
    expect(surfaces).toContain("global.beforeChange");
    if (res) expect(surfaces).toContain("action");
  });

  it("routes tasks", async () => {
    const { runtime, calls } = recordingRuntime();
    const run = vi.fn();
    const runner = createTaskRunner({
      db: new InMemoryAdapter(),
      functionRuntime: runtime,
      collections: [],
      globals: [],
      tasks: [{ name: "nightly", cron: "0 3 * * *", run }],
    } as any);

    await runner.runTask("nightly");
    expect(run).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.ctx)).toContainEqual({ surface: "task", path: "tasks.nightly" });
  });

  it("runs a hook supplied as a FunctionRef through the runtime's registry", async () => {
    const registry = { "collections.posts.hooks.beforeChange.0": ({ data }: any) => ({ ...data, title: data.title.toUpperCase() }) };
    const app = await createDyrectedApp({
      db: new InMemoryAdapter(),
      functionRuntime: createInProcessRuntime({ registry }),
      globals: [],
      collections: [
        {
          slug: "posts",
          fields: [{ name: "title", type: "text" }],
          access: { create: () => true, read: () => true },
          hooks: { beforeChange: [{ $fn: "collections.posts.hooks.beforeChange.0" }] },
        },
      ],
    } as any);

    const res = await post(app, "/api/collections/posts", { title: "shout" });
    expect((await res.json()).title).toBe("SHOUT");
  });

  it("surfaces a runtime's timeout as the request error", async () => {
    const runtime: FunctionRuntime = {
      async invoke(fn, args, ctx) {
        // Access stays fast; the hook is the function that blows its budget.
        if (ctx.surface !== "collection.beforeChange") return (typeof fn === "function" ? await fn(...args) : undefined) as any;
        throw new FunctionTimeoutError(ctx.path ?? "unknown", "wall", 1000);
      },
    };
    const app = await createDyrectedApp({
      db: new InMemoryAdapter(),
      functionRuntime: runtime,
      globals: [],
      collections: [
        {
          slug: "posts",
          fields: [{ name: "title", type: "text" }],
          access: { create: () => true },
          hooks: { beforeChange: [() => undefined] },
        },
      ],
    } as any);

    const res = await post(app, "/api/collections/posts", { title: "x" });
    expect(res.status).toBe(504);
    expect((await res.json()).message).toContain("collection:posts.hooks.beforeChange");
  });
});

describe("extractFunctionRefs / hydrateFunctionRefs", () => {
  const hook = () => 1;
  const access = () => true;
  const config = {
    collections: [{ slug: "posts", access: { read: access }, hooks: { beforeChange: [hook, "{ a: 1 }"] }, fields: [{ name: "t", type: "text" }] }],
    globals: [],
    db: new (class Adapter {})(),
  };

  it("replaces functions with refs keyed by config path and keeps the rest as plain data", () => {
    const { schema, functions } = extractFunctionRefs(config);

    expect(Object.fromEntries(functions)).toEqual({
      "collections.0.access.read": access,
      "collections.0.hooks.beforeChange.0": hook,
    });
    expect((schema as any).collections[0].access.read).toEqual({ $fn: "collections.0.access.read" });
    expect((schema as any).collections[0].hooks.beforeChange).toEqual([{ $fn: "collections.0.hooks.beforeChange.0" }, "{ a: 1 }"]);
    expect("db" in (schema as any)).toBe(false);
  });

  it("produces JSON-serialisable output that round-trips back to the same functions", () => {
    const { schema, functions } = extractFunctionRefs(config);
    const roundTripped = JSON.parse(JSON.stringify(schema));
    const hydrated = hydrateFunctionRefs(roundTripped, (id) => functions.get(id));

    expect(hydrated.collections[0].access.read).toBe(access);
    expect(hydrated.collections[0].hooks.beforeChange[0]).toBe(hook);
    expect(hydrated.collections[0].hooks.beforeChange[1]).toBe("{ a: 1 }");
  });

  it("leaves unresolved refs in place", () => {
    expect(hydrateFunctionRefs({ a: { $fn: "x" } }, () => undefined)).toEqual({ a: { $fn: "x" } });
  });

  it("recognises only exact FunctionRefs", () => {
    expect(isFunctionRef({ $fn: "a" })).toBe(true);
    expect(isFunctionRef({ $fn: "a", extra: 1 })).toBe(false);
    expect(isFunctionRef({ $fn: 1 })).toBe(false);
    expect(isFunctionRef(null)).toBe(false);
  });
});
