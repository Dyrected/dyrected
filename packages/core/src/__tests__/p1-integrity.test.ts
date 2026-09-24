import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAdapter } from "./mocks.js";
import {
  defineCollection,
  defineConfig,
  defineMoneyField,
  defineTextField,
} from "../index.js";
import { createDyrectedApp } from "../app.js";
import { initializeWorkflowDocument, transitionWorkflow } from "../workflows.js";
import type { DatabaseAdapter, WorkflowConfig, WorkflowMetadata } from "../types/index.js";

/** In-memory adapter whose transactions really roll back, so atomicity can be asserted. */
class RollbackAdapter extends InMemoryAdapter {
  override async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    const snapshot = structuredClone((this as unknown as { store: unknown }).store);
    try {
      return await fn(this);
    } catch (error) {
      (this as unknown as { store: unknown }).store = snapshot;
      throw error;
    }
  }
}

const json = (body: unknown) => ({
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("beforeCommit hooks", () => {
  let db: RollbackAdapter;
  beforeEach(() => {
    db = new RollbackAdapter();
  });

  function makeApp(fail = false) {
    const Payments = defineCollection({
      slug: "payments",
      fields: [defineTextField({ name: "reference" }), defineMoneyField({ name: "amount_minor" })],
      hooks: {
        beforeCommit: [
          async ({ doc, operation, tx }) => {
            await tx.create({
              collection: "ledger",
              data: { paymentId: doc.id, operation, amount: doc.amount_minor },
            });
            if (fail) throw new Error("ledger unavailable");
          },
        ],
      },
    });
    return createDyrectedApp(defineConfig({ collections: [Payments], globals: [], db }));
  }

  it("writes the secondary record in the same transaction on create and update", async () => {
    const app = await makeApp();
    const created = await app.request("/api/collections/payments", {
      method: "POST",
      ...json({ reference: "R1", amount_minor: 1000 }),
    });
    expect(created.status).toBe(201);
    const { id } = await created.json();

    const updated = await app.request(`/api/collections/payments/${id}`, {
      method: "PATCH",
      ...json({ amount_minor: 2000 }),
    });
    expect(updated.status).toBe(200);

    const ledger = await db.find({ collection: "ledger" });
    expect(ledger.docs.map((d) => d.operation).sort()).toEqual(["create", "update"]);
  });

  it("rolls the primary write back when a hook throws", async () => {
    const app = await makeApp(true);
    const res = await app.request("/api/collections/payments", {
      method: "POST",
      ...json({ reference: "R2", amount_minor: 1000 }),
    });
    expect(res.status).toBe(500);
    expect((await db.find({ collection: "payments" })).total).toBe(0);
    expect((await db.find({ collection: "ledger" })).total).toBe(0);
  });
});

describe("immutable fields", () => {
  it("rejects a changed value, but allows the same value and the initial write", async () => {
    const db = new InMemoryAdapter();
    const Wallets = defineCollection({
      slug: "wallets",
      fields: [
        defineTextField({ name: "currency", immutable: true }),
        defineTextField({ name: "label" }),
      ],
    });
    const app = await createDyrectedApp(defineConfig({ collections: [Wallets], globals: [], db }));

    const created = await app.request("/api/collections/wallets", {
      method: "POST",
      ...json({ currency: "NGN", label: "Main" }),
    });
    expect(created.status).toBe(201);
    const { id } = await created.json();

    const same = await app.request(`/api/collections/wallets/${id}`, {
      method: "PATCH",
      ...json({ currency: "NGN", label: "Renamed" }),
    });
    expect(same.status).toBe(200);

    const changed = await app.request(`/api/collections/wallets/${id}`, {
      method: "PATCH",
      ...json({ currency: "USD" }),
    });
    expect(changed.status).toBe(400);
    expect((await changed.json()).message).toContain("immutable");
    expect((await db.findOne({ collection: "wallets", id }))?.currency).toBe("NGN");
  });
});

describe("money fields", () => {
  it("stores integer minor units, converts integer strings, and rejects fractions", async () => {
    const db = new InMemoryAdapter();
    const Accounts = defineCollection({
      slug: "accounts",
      fields: [defineMoneyField({ name: "balance", currency: "NGN" })],
    });
    const app = await createDyrectedApp(defineConfig({ collections: [Accounts], globals: [], db }));

    const ok = await app.request("/api/collections/accounts", {
      method: "POST",
      ...json({ balance: "5250000" }),
    });
    expect(ok.status).toBe(201);
    expect((await ok.json()).balance).toBe(5250000);

    for (const bad of [52.5, "12.5", "abc", 2 ** 60]) {
      const res = await app.request("/api/collections/accounts", {
        method: "POST",
        ...json({ balance: bad }),
      });
      expect(res.status).toBe(400);
    }
    expect((await db.find({ collection: "accounts" })).total).toBe(1);
  });
});

describe("workflow onTransition", () => {
  const workflow = (fail: boolean): WorkflowConfig => ({
    initialState: "under_review",
    states: [
      { name: "under_review", label: "Under review" },
      { name: "approved", label: "Approved" },
    ],
    transitions: [
      {
        name: "approve",
        label: "Approve",
        from: "under_review",
        to: "approved",
        async onTransition({ doc, input, tx }) {
          await tx.create({
            collection: "reservations",
            data: { refund: doc.id, amountMinor: input?.amountMinor },
          });
          if (fail) throw new Error("insufficient funds");
        },
      },
    ],
  });

  async function setup(fail: boolean) {
    const db = new RollbackAdapter();
    const Refunds = defineCollection({
      slug: "refunds",
      workflow: workflow(fail),
      fields: [defineTextField({ name: "reason" })],
    });
    const config = defineConfig({ collections: [Refunds], globals: [], db });
    await db.create({
      collection: "refunds",
      data: { id: "r1", ...initializeWorkflowDocument({ reason: "dup" }, Refunds.workflow!) },
    });
    return { db, config, collection: Refunds };
  }

  it("runs inside the transition with input, and commits with the state change", async () => {
    const { db, config, collection } = await setup(false);
    await transitionWorkflow({
      config,
      collection,
      id: "r1",
      transitionName: "approve",
      input: { amountMinor: 5000 },
      req: { query: {}, headers: {} },
    });
    expect(((await db.findOne({ collection: "refunds", id: "r1" }))!.__workflow as WorkflowMetadata).state).toBe(
      "approved",
    );
    const reservations = await db.find({ collection: "reservations" });
    expect(reservations.docs[0]).toMatchObject({ refund: "r1", amountMinor: 5000 });
  });

  it("rolls back the state and the handler's writes when it throws", async () => {
    const { db, config, collection } = await setup(true);
    await expect(
      transitionWorkflow({
        config,
        collection,
        id: "r1",
        transitionName: "approve",
        input: { amountMinor: 5000 },
        req: { query: {}, headers: {} },
      }),
    ).rejects.toThrow("insufficient funds");
    expect(((await db.findOne({ collection: "refunds", id: "r1" }))!.__workflow as WorkflowMetadata).state).toBe(
      "under_review",
    );
    expect((await db.find({ collection: "reservations" })).total).toBe(0);
  });
});
