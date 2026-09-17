import { describe, it, expect } from "vitest";
import { createDyrectedApp } from "../app.js";
import {
  defineCollection,
  defineConfig,
  defineAction,
  ConflictError,
  DyrectedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

describe("user-facing server errors", () => {
  it("defaults DyrectedError to 500 with its name set", () => {
    const error = new DyrectedError("Something broke.");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DyrectedError);
    expect(error.name).toBe("DyrectedError");
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe("Something broke.");
  });

  it("maps each subclass to its HTTP status", () => {
    expect(new ValidationError("Bad input.")).toMatchObject({ name: "ValidationError", statusCode: 400 });
    expect(new ForbiddenError("Not allowed.")).toMatchObject({ name: "ForbiddenError", statusCode: 403 });
    expect(new NotFoundError("Missing.")).toMatchObject({ name: "NotFoundError", statusCode: 404 });
    expect(new ConflictError("Conflict.")).toMatchObject({ name: "ConflictError", statusCode: 409 });
    for (const error of [
      new ValidationError("x"),
      new ForbiddenError("x"),
      new NotFoundError("x"),
      new ConflictError("x"),
    ]) {
      expect(error).toBeInstanceOf(DyrectedError);
    }
  });

  it("propagates a thrown ValidationError through the action pipeline", async () => {
    const db = new InMemoryAdapter();
    db.seed("orders", [{ id: "order-1", status: "pending" }]);

    const Orders = defineCollection({
      slug: "orders",
      fields: [{ name: "status", type: "text" }],
      actions: [
        defineAction({
          name: "refund",
          label: "Refund",
          type: "row",
          handler: async () => {
            throw new ValidationError("Enter what the user paid.");
          },
        }),
      ],
    });

    const app = await createDyrectedApp(defineConfig({ collections: [Orders], globals: [], db }));

    const res = await app.request("/api/collections/orders/actions/refund", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "order-1" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message ?? body.error).toContain("Enter what the user paid.");
  });
});
