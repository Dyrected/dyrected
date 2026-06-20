import { describe, it, expect, vi, beforeEach } from "vitest";
import { InMemoryAdapter } from "./mocks.js";
import { defineCollection, defineConfig } from "../index.js";
import {
  publishingWorkflow,
  initializeWorkflowDocument,
  transitionWorkflow,
  saveWorkflowDraft,
  createWorkflowDocument,
  dispatchPendingLifecycleEvents,
  WORKFLOW_HISTORY_COLLECTION,
  LIFECYCLE_EVENTS_COLLECTION,
} from "../workflows.js";
import type { AuthenticatedUser, WorkflowMetadata } from "../types/index.js";

// ─── Shared config builders ───────────────────────────────────────────────────

function makeConfig(db: InMemoryAdapter) {
  const posts = defineCollection({
    slug: "posts",
    workflow: publishingWorkflow(),
    fields: [
      { name: "title", type: "text", required: true },
      { name: "body", type: "text" },
    ],
  });

  return defineConfig({ collections: [posts], globals: [], db });
}

function makeUser(role: "editor" | "publisher" | "admin"): AuthenticatedUser {
  return { sub: `user-${role}`, email: `${role}@test.com`, roles: [role], collection: "users" };
}

async function seedPost(db: InMemoryAdapter, id: string) {
  const raw = { id, title: "Hello", body: "World" };
  const initialized = initializeWorkflowDocument(raw, publishingWorkflow());
  const doc = { id, ...initialized };
  await db.create({ collection: "posts", data: doc });
  return doc;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("publishingWorkflow template", () => {
  it("initializes a document with __workflow in draft state", () => {
    const doc = initializeWorkflowDocument({ title: "Test" }, publishingWorkflow());
    const workflow = doc.__workflow as WorkflowMetadata;
    expect(workflow.state).toBe("draft");
    expect(workflow.revision).toBe(1);
    expect(workflow.publishedRevision).toBeUndefined();
    expect(workflow.publishedAt).toBeUndefined();
    expect(workflow.publishedBy).toBeUndefined();
  });

  it("includes correct states and transitions in the template", () => {
    const wf = publishingWorkflow();
    const stateNames = wf.states.map((s) => s.name);
    expect(stateNames).toContain("draft");
    expect(stateNames).toContain("in_review");
    expect(stateNames).toContain("published");

    const transitionNames = wf.transitions.map((t) => t.name);
    expect(transitionNames).toContain("submit");
    expect(transitionNames).toContain("publish");
    expect(transitionNames).toContain("reject");
    expect(transitionNames).toContain("unpublish");
  });
});

describe("saveWorkflowDraft", () => {
  let db: InMemoryAdapter;
  let config: ReturnType<typeof makeConfig>;

  beforeEach(() => {
    db = new InMemoryAdapter();
    config = makeConfig(db);
  });

  it("increments the revision and writes an outbox event", async () => {
    const post = await seedPost(db, "post-1");
    const collection = config.collections[0];

    await saveWorkflowDraft({
      config,
      collection,
      id: "post-1",
      originalDoc: post,
      data: { title: "Updated Title" },
    });

    const updated = await db.findOne({ collection: "posts", id: "post-1" });
    const workflow = updated.__workflow as WorkflowMetadata;
    expect(workflow.revision).toBe(2);
    expect(updated.title).toBe("Updated Title");

    // Outbox event written
    const events = await db.find({ collection: LIFECYCLE_EVENTS_COLLECTION });
    expect(events.total).toBeGreaterThan(0);
    const event = events.docs[0];
    expect(event.name).toBe("revision.created");
    expect(event.status).toBe("pending");
  });
});

describe("createWorkflowDocument", () => {
  let db: InMemoryAdapter;
  let config: ReturnType<typeof makeConfig>;

  beforeEach(() => {
    db = new InMemoryAdapter();
    config = makeConfig(db);
  });

  it("creates a doc in draft state with revision 1 and an outbox event", async () => {
    const collection = config.collections[0];
    const rawData = { title: "Brand New" };
    const initializedData = initializeWorkflowDocument(rawData, publishingWorkflow());
    const { doc } = await createWorkflowDocument({
      config,
      collection,
      data: initializedData,
    });

    const workflow = doc.__workflow as WorkflowMetadata;
    expect(workflow.state).toBe("draft");
    expect(workflow.revision).toBe(1);

    const events = await db.find({ collection: LIFECYCLE_EVENTS_COLLECTION });
    expect(events.total).toBe(1);
    expect(events.docs[0].name).toBe("revision.created");
  });
});

describe("transitionWorkflow", () => {
  let db: InMemoryAdapter;
  let config: ReturnType<typeof makeConfig>;

  beforeEach(() => {
    db = new InMemoryAdapter();
    config = makeConfig(db);
  });

  it("editor can submit a draft for review", async () => {
    await seedPost(db, "post-1");
    const collection = config.collections[0];
    const editor = makeUser("editor");

    const result = await transitionWorkflow({
      config,
      collection,
      id: "post-1",
      transitionName: "submit",
      user: editor,
      req: { query: {}, headers: {} },
    });

    const workflow = result.__workflow as WorkflowMetadata;
    expect(workflow.state).toBe("in_review");

    // History entry created
    const history = await db.find({ collection: WORKFLOW_HISTORY_COLLECTION });
    expect(history.total).toBe(1);
    expect(history.docs[0].from).toBe("draft");
    expect(history.docs[0].to).toBe("in_review");
  });

  it("editor cannot publish directly (lacks capability)", async () => {
    await seedPost(db, "post-2");
    // Move to in_review first using a publisher
    const collection = config.collections[0];
    await transitionWorkflow({
      config,
      collection,
      id: "post-2",
      transitionName: "submit",
      user: makeUser("editor"),
      req: { query: {}, headers: {} },
    });

    // Now editor tries to publish — should be denied
    const editor = makeUser("editor");
    await expect(
      transitionWorkflow({
        config,
        collection,
        id: "post-2",
        transitionName: "publish",
        user: editor,
        req: { query: {}, headers: {} },
      }),
    ).rejects.toThrow(/not permitted|403|permission/i);
  });

  it("publisher can publish a submitted doc — promotes __published snapshot", async () => {
    await seedPost(db, "post-3");
    const collection = config.collections[0];
    const editor = makeUser("editor");
    const publisher = makeUser("publisher");

    await transitionWorkflow({
      config,
      collection,
      id: "post-3",
      transitionName: "submit",
      user: editor,
      req: { query: {}, headers: {} },
    });
    const result = await transitionWorkflow({
      config,
      collection,
      id: "post-3",
      transitionName: "publish",
      user: publisher,
      req: { query: {}, headers: {} },
    });

    const workflow = result.__workflow as WorkflowMetadata;
    expect(workflow.state).toBe("published");
    expect(workflow.publishedRevision).toBe(1);
    expect(workflow.publishedAt).toBeTruthy();
    expect(workflow.publishedBy).toBe(publisher.sub);

    // __published snapshot present
    const stored = await db.findOne({ collection: "posts", id: "post-3" });
    expect(stored.__published).toBeTruthy();
    expect((stored.__published as any).title).toBe("Hello");
  });

  it("publisher can reject and the state returns to draft", async () => {
    await seedPost(db, "post-4");
    const collection = config.collections[0];
    await transitionWorkflow({
      config,
      collection,
      id: "post-4",
      transitionName: "submit",
      user: makeUser("editor"),
      req: { query: {}, headers: {} },
    });

    const result = await transitionWorkflow({
      config,
      collection,
      id: "post-4",
      transitionName: "reject",
      user: makeUser("publisher"),
      comment: "Needs more detail.",
      req: { query: {}, headers: {} },
    });

    const workflow = result.__workflow as WorkflowMetadata;
    expect(workflow.state).toBe("draft");

    const history = await db.find({ collection: WORKFLOW_HISTORY_COLLECTION });
    const rejectEntry = history.docs.find((h: any) => h.transition === "reject");
    expect(rejectEntry).toBeTruthy();
    expect(rejectEntry!.comment).toBe("Needs more detail.");
  });

  it("unpublish clears the __published snapshot and moves back to draft", async () => {
    await seedPost(db, "post-5");
    const collection = config.collections[0];
    const editor = makeUser("editor");
    const publisher = makeUser("publisher");

    await transitionWorkflow({
      config,
      collection,
      id: "post-5",
      transitionName: "submit",
      user: editor,
      req: { query: {}, headers: {} },
    });
    await transitionWorkflow({
      config,
      collection,
      id: "post-5",
      transitionName: "publish",
      user: publisher,
      req: { query: {}, headers: {} },
    });
    const result = await transitionWorkflow({
      config,
      collection,
      id: "post-5",
      transitionName: "unpublish",
      user: publisher,
      req: { query: {}, headers: {} },
    });

    const workflow = result.__workflow as WorkflowMetadata;
    expect(workflow.state).toBe("draft");
    const stored = await db.findOne({ collection: "posts", id: "post-5" });
    expect(stored.__published).toBeNull();
  });

  it("rejects a stale transition when expectedRevision does not match", async () => {
    await seedPost(db, "post-6");
    const collection = config.collections[0];

    await expect(
      transitionWorkflow({
        config,
        collection,
        id: "post-6",
        transitionName: "submit",
        user: makeUser("editor"),
        expectedRevision: 99, // wrong
        req: { query: {}, headers: {} },
      }),
    ).rejects.toThrow(/changed since it was loaded|stale|revision/i);
  });

  it("leaves the document unchanged when a transition is rejected (atomic guarantee)", async () => {
    await seedPost(db, "post-7");
    const collection = config.collections[0];

    // Attempt a forbidden transition
    try {
      await transitionWorkflow({
        config,
        collection,
        id: "post-7",
        transitionName: "publish",
        user: makeUser("editor"), // no publish capability
        req: { query: {}, headers: {} },
      });
    } catch {
      // expected
    }

    const stored = await db.findOne({ collection: "posts", id: "post-7" });
    const workflow = stored.__workflow as WorkflowMetadata;
    expect(workflow.state).toBe("draft"); // unchanged
    const history = await db.find({ collection: WORKFLOW_HISTORY_COLLECTION });
    expect(history.total).toBe(0); // no history written
  });

  it("emits a workflow.transitioned outbox event on every successful transition", async () => {
    await seedPost(db, "post-8");
    const collection = config.collections[0];

    await transitionWorkflow({
      config,
      collection,
      id: "post-8",
      transitionName: "submit",
      user: makeUser("editor"),
      req: { query: {}, headers: {} },
    });

    const events = await db.find({ collection: LIFECYCLE_EVENTS_COLLECTION });
    const transitioned = events.docs.find((e: any) => e.name === "workflow.transitioned");
    expect(transitioned).toBeTruthy();
    expect(transitioned!.payload.transition).toBe("submit");
  });

  it("emits an entry.published event when the doc enters the published state", async () => {
    await seedPost(db, "post-9");
    const collection = config.collections[0];

    await transitionWorkflow({
      config,
      collection,
      id: "post-9",
      transitionName: "submit",
      user: makeUser("editor"),
      req: { query: {}, headers: {} },
    });
    await transitionWorkflow({
      config,
      collection,
      id: "post-9",
      transitionName: "publish",
      user: makeUser("publisher"),
      req: { query: {}, headers: {} },
    });

    const events = await db.find({ collection: LIFECYCLE_EVENTS_COLLECTION });
    const published = events.docs.find((e: any) => e.name === "entry.published");
    expect(published).toBeTruthy();
    expect(published!.collection).toBe("posts");
  });

  it("collections without workflow are unaffected (backward compat)", async () => {
    // Plain collection, no workflow
    const plain = defineCollection({
      slug: "plain",
      fields: [{ name: "title", type: "text" }],
    });
    const plainConfig = defineConfig({ collections: [plain], globals: [], db });
    await db.create({ collection: "plain", data: { id: "p-1", title: "Hello" } });

    // Reading back a plain doc should have no __workflow
    const doc = await db.findOne({ collection: "plain", id: "p-1" });
    expect(doc.__workflow).toBeUndefined();

    // No lifecycle events from plain collection operations
    const events = await db.find({ collection: LIFECYCLE_EVENTS_COLLECTION });
    expect(events.total).toBe(0);
  });
});

describe("dispatchPendingLifecycleEvents", () => {
  let db: InMemoryAdapter;
  let config: ReturnType<typeof makeConfig>;

  beforeEach(() => {
    db = new InMemoryAdapter();
    config = makeConfig(db);
  });

  it("calls registered handlers and marks events delivered", async () => {
    // Seed a pending event directly
    const handler = vi.fn().mockResolvedValue(undefined);
    const configWithHandler = {
      ...config,
      events: {
        handlers: [handler],
        maxAttempts: 3,
        retryDelayMs: 100,
      },
    };

    await db.create({
      collection: LIFECYCLE_EVENTS_COLLECTION,
      data: {
        id: "evt-1",
        name: "revision.created",
        collection: "posts",
        documentId: "p1",
        status: "pending",
        attempts: 0,
        payload: { collection: "posts", documentId: "p1", revision: 1 },
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        nextAttemptAt: new Date().toISOString(),
      },
    });

    const dispatched = await dispatchPendingLifecycleEvents(configWithHandler as any, 50);

    expect(dispatched).toBe(1);
    expect(handler).toHaveBeenCalledOnce();

    const events = await db.find({ collection: LIFECYCLE_EVENTS_COLLECTION });
    expect(events.docs[0].status).toBe("delivered");
  });

  it("increments attempt count and retries on handler failure", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("webhook down"));
    const configWithHandler = {
      ...config,
      events: {
        handlers: [handler],
        maxAttempts: 3,
        retryDelayMs: 100,
      },
    };

    await db.create({
      collection: LIFECYCLE_EVENTS_COLLECTION,
      data: {
        id: "evt-2",
        name: "revision.created",
        collection: "posts",
        documentId: "p1",
        status: "pending",
        attempts: 0,
        payload: { collection: "posts", documentId: "p1", revision: 1 },
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        nextAttemptAt: new Date().toISOString(),
      },
    });

    await dispatchPendingLifecycleEvents(configWithHandler as any, 50);

    const events = await db.find({ collection: LIFECYCLE_EVENTS_COLLECTION });
    const event = events.docs[0];
    expect(event.status).toBe("failed"); // transitioned to failed status first
    expect(event.attempts).toBe(1);
  });

  it("preserves stable event IDs across retries (no duplicate IDs)", async () => {
    const eventId = "stable-evt-id";
    await db.create({
      collection: LIFECYCLE_EVENTS_COLLECTION,
      data: {
        id: eventId,
        name: "revision.created",
        collection: "posts",
        documentId: "p1",
        status: "pending",
        attempts: 0,
        payload: { collection: "posts", documentId: "p1", revision: 1 },
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        nextAttemptAt: new Date().toISOString(),
      },
    });

    // No handlers configured — event should stay with same ID
    await dispatchPendingLifecycleEvents(config, 50);

    const stored = await db.findOne({ collection: LIFECYCLE_EVENTS_COLLECTION, id: eventId });
    expect(stored).not.toBeNull();
    expect(stored.id).toBe(eventId);
  });

  it("does not process events whose nextAttemptAt is in the future", async () => {
    const futureDate = new Date(Date.now() + 60_000).toISOString();
    await db.create({
      collection: LIFECYCLE_EVENTS_COLLECTION,
      data: {
        id: "evt-future",
        name: "revision.created",
        collection: "posts",
        documentId: "p1",
        status: "pending",
        attempts: 1,
        payload: {},
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        nextAttemptAt: futureDate,
      },
    });

    const dispatched = await dispatchPendingLifecycleEvents(config, 50);
    expect(dispatched).toBe(0);
  });
});
