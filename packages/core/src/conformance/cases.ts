import type { ConformanceApp, ConformanceCase } from "./types.js";

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const send = async (app: ConformanceApp, path: string, body: unknown) => {
  const res = await app.request(path, json(body));
  return { status: res.status, body: (await res.json().catch(() => null)) as any };
};

const titleOnly = [{ name: "title", type: "text" as const }];

/**
 * Hook semantics (parity spec §4): ordering, error mapping, and the awaited/isolated behavior of
 * `afterChange`. Every new hook type or access path added to core should add a case here.
 */
export const hookCases: ConformanceCase[] = [
  {
    id: "hooks.beforeChange.order",
    title: "beforeChange hooks run in order, each seeing the previous result",
    contract: "Hooks in an array run sequentially; a hook's return value becomes the next hook's `data`.",
    async run(harness, assert) {
      const app = await harness.start({
        collections: [
          {
            slug: "numbers",
            fields: [{ name: "value", type: "number" }],
            hooks: {
              beforeChange: [
                ({ data }: any) => ({ ...data, value: data.value + 10 }),
                ({ data }: any) => ({ ...data, value: data.value * 2 }),
              ],
            },
          },
        ],
        globals: [],
      });

      const res = await send(app, "/api/collections/numbers", { value: 5 });
      assert.equal(res.status, 201, "status");
      assert.equal(res.body.value, 30, "(5 + 10) * 2");
    },
  },
  {
    id: "hooks.beforeChange.veto",
    title: "a throwing beforeChange rejects the write and persists nothing",
    contract: "An error from beforeChange aborts the request before the database write.",
    async run(harness, assert) {
      const app = await harness.start({
        collections: [
          {
            slug: "posts",
            fields: titleOnly,
            hooks: {
              beforeChange: [
                () => {
                  throw new Error("nope");
                },
              ],
            },
          },
        ],
        globals: [],
      });

      const res = await send(app, "/api/collections/posts", { title: "x" });
      assert.equal(res.status, 500, "plain errors are 500");
      assert.equal((await app.db.find({ collection: "posts" })).docs.length, 0, "nothing persisted");
    },
  },
  {
    id: "hooks.beforeChange.error-status",
    title: "an error with a statusCode keeps that status and message",
    contract: "Errors carrying `statusCode` (such as ForbiddenError) are answered with that status and their message.",
    async run(harness, assert) {
      const app = await harness.start({
        collections: [
          {
            slug: "orders",
            fields: [{ name: "status", type: "text" }],
            hooks: {
              beforeChange: [
                () => {
                  throw Object.assign(new Error("Only managers can do this."), { statusCode: 403 });
                },
              ],
            },
          },
        ],
        globals: [],
      });

      const res = await send(app, "/api/collections/orders", { status: "refunded" });
      assert.equal(res.status, 403, "status");
      assert.ok(String(res.body?.message).includes("Only managers can do this."), "message preserved");
    },
  },
  {
    id: "hooks.afterChange.awaited",
    title: "afterChange completes before the response is sent",
    contract: "afterChange is awaited on the request path; its writes are visible as soon as the response arrives.",
    async run(harness, assert) {
      const app = await harness.start({
        collections: [
          {
            slug: "posts",
            fields: titleOnly,
            hooks: {
              afterChange: [
                async ({ doc, db }: any) => {
                  await db.create({ collection: "audit_log", data: { note: `created ${doc.title}` } });
                },
              ],
            },
          },
          { slug: "audit_log", fields: [{ name: "note", type: "text" }] },
        ],
        globals: [],
      });

      const res = await send(app, "/api/collections/posts", { title: "Hello" });
      assert.equal(res.status, 201, "status");
      const log = await app.db.find({ collection: "audit_log" });
      assert.deepEqual(
        log.docs.map((d: any) => d.note),
        ["created Hello"],
        "side effect visible immediately",
      );
    },
  },
  {
    id: "hooks.afterChange.isolated",
    title: "a failing afterChange does not fail the write",
    contract: "The write is already committed, so afterChange errors are logged and the request still succeeds.",
    async run(harness, assert) {
      const app = await harness.start({
        collections: [
          {
            slug: "posts",
            fields: titleOnly,
            hooks: {
              afterChange: [
                () => {
                  throw new Error("webhook down");
                },
              ],
            },
          },
        ],
        globals: [],
      });

      const res = await send(app, "/api/collections/posts", { title: "Kept" });
      assert.equal(res.status, 201, "status");
      assert.equal((await app.db.find({ collection: "posts" })).docs.length, 1, "document persisted");
    },
  },
  {
    id: "hooks.field.beforeChange",
    title: "field beforeChange hooks transform the value",
    contract: "A field's beforeChange hook receives `value` and returns the value to store.",
    async run(harness, assert) {
      const app = await harness.start({
        collections: [
          {
            slug: "posts",
            fields: [
              {
                name: "title",
                type: "text",
                hooks: { beforeChange: [({ value }: any) => String(value).trim().toUpperCase()] },
              },
            ],
          },
        ],
        globals: [],
      });

      const res = await send(app, "/api/collections/posts", { title: "  hi  " });
      assert.equal(res.body.title, "HI", "stored value");
    },
  },
];

export const accessCases: ConformanceCase[] = [
  {
    id: "access.function.false",
    title: "an access function returning false denies the request",
    contract: "`access.create: () => false` answers 403 and persists nothing.",
    async run(harness, assert) {
      const app = await harness.start({
        collections: [{ slug: "posts", fields: titleOnly, access: { create: () => false, read: () => true } }],
        globals: [],
      });

      const res = await send(app, "/api/collections/posts", { title: "x" });
      assert.equal(res.status, 403, "status");
      assert.equal((await app.db.find({ collection: "posts" })).docs.length, 0, "nothing persisted");
    },
  },
  {
    id: "access.function.where",
    title: "an access function may return a where constraint",
    contract: "`access.read` returning a `where` object narrows the list to matching documents.",
    async run(harness, assert) {
      const app = await harness.start({
        collections: [
          {
            slug: "posts",
            fields: [...titleOnly, { name: "visibility", type: "text" }],
            access: { read: () => ({ visibility: { equals: "public" } }), create: () => true },
          },
        ],
        globals: [],
      });

      await send(app, "/api/collections/posts", { title: "a", visibility: "public" });
      await send(app, "/api/collections/posts", { title: "b", visibility: "private" });

      const res = await app.request("/api/collections/posts");
      const body = (await res.json()) as any;
      assert.deepEqual(
        body.docs.map((d: any) => d.title),
        ["a"],
        "only public documents",
      );
    },
  },
  {
    id: "access.function.throws",
    title: "an access function that throws denies the request",
    contract: "Access fails closed: an error inside an access function is treated as `false`.",
    async run(harness, assert) {
      const app = await harness.start({
        collections: [
          {
            slug: "posts",
            fields: titleOnly,
            access: {
              create: () => {
                throw new Error("boom");
              },
              read: () => true,
            },
          },
        ],
        globals: [],
      });

      const res = await send(app, "/api/collections/posts", { title: "x" });
      assert.equal(res.status, 403, "status");
    },
  },
];

export const conformanceCases: ConformanceCase[] = [...hookCases, ...accessCases];
