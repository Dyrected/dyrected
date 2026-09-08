import { describe, it, expect, vi, beforeEach } from "vitest";
import { DyrectedClient } from "../index.js";

describe("DyrectedClient.ai", () => {
  let client: DyrectedClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    client = new DyrectedClient({
      baseUrl: "http://api.test",
      apiKey: "test-api-key",
      siteId: "tenant-a",
      fetch: mockFetch as any,
    });
    client.setToken("user-jwt-token");
  });

  it("createThread sends POST /api/ai/threads with title", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "thread_1", title: "Support Inquiry" }),
    });

    const thread = await client.ai.createThread({ title: "Support Inquiry" });
    expect(thread.id).toBe("thread_1");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("http://api.test/api/ai/threads");
    expect(init.method).toBe("POST");
    expect(init.headers["x-api-key"]).toBe("test-api-key");
    expect(init.headers["x-site-id"]).toBe("tenant-a");
    expect(init.headers["authorization"] ?? init.headers["Authorization"]).toBe("Bearer user-jwt-token");
    expect(JSON.parse(init.body)).toEqual({ title: "Support Inquiry" });
  });

  it("listThreads sends GET /api/ai/threads", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: "thread_1" }, { id: "thread_2" }]),
    });

    const threads = await client.ai.listThreads();
    expect(threads).toHaveLength(2);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("http://api.test/api/ai/threads");
    expect(init.method).toBeUndefined(); // GET
  });

  it("getThread sends GET /api/ai/threads/:id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "thread_123", messages: [] }),
    });

    const thread = await client.ai.getThread("thread_123");
    expect(thread.id).toBe("thread_123");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("http://api.test/api/ai/threads/thread_123");
  });

  it("deleteThread and clearThreads send DELETE requests", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const delRes = await client.ai.deleteThread("thread_123");
    expect(delRes.success).toBe(true);
    expect(mockFetch.mock.calls[0][0]).toBe("http://api.test/api/ai/threads/thread_123");
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const clearRes = await client.ai.clearThreads();
    expect(clearRes.success).toBe(true);
    expect(mockFetch.mock.calls[1][0]).toBe("http://api.test/api/ai/threads");
    expect(mockFetch.mock.calls[1][1].method).toBe("DELETE");
  });

  it("postMessage sends POST to /api/ai/threads/:id/messages", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "msg_1", content: "Hello AI", role: "user" }),
    });

    const msg = await client.ai.postMessage("thread_1", {
      content: "Hello AI",
      role: "user",
    });
    expect(msg.content).toBe("Hello AI");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("http://api.test/api/ai/threads/thread_1/messages");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ content: "Hello AI", role: "user" });
  });

  it("getAction, executeAction, and rejectAction interact with human-in-the-loop endpoints", async () => {
    // 1. getAction
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "act_1", status: "pending", type: "createDocument" }),
    });
    const action = await client.ai.getAction("act_1");
    expect(action.id).toBe("act_1");
    expect(mockFetch.mock.calls[0][0]).toBe("http://api.test/api/ai/actions/act_1");

    // 2. executeAction
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, result: { id: "doc_123" } }),
    });
    const execRes = await client.ai.executeAction("act_1");
    expect(execRes.success).toBe(true);
    expect(mockFetch.mock.calls[1][0]).toBe("http://api.test/api/ai/actions/act_1/execute");
    expect(mockFetch.mock.calls[1][1].method).toBe("POST");

    // 3. rejectAction
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    const rejRes = await client.ai.rejectAction("act_1", { reason: "Budget exceeded" });
    expect(rejRes.success).toBe(true);
    expect(mockFetch.mock.calls[2][0]).toBe("http://api.test/api/ai/actions/act_1/reject");
    expect(JSON.parse(mockFetch.mock.calls[2][1].body)).toEqual({ reason: "Budget exceeded" });
  });

  it("searchRAG and reindexRAG send requests to /api/ai/rag endpoints", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: "chunk_1", score: 0.92, text: "Sample text" }]),
    });
    const searchRes = await client.ai.searchRAG({ query: "refund policy", collection: "faqs" });
    expect(searchRes).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toBe("http://api.test/api/ai/rag/search");
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      query: "refund policy",
      collection: "faqs",
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, indexedCount: 42 }),
    });
    const reindexRes = await client.ai.reindexRAG({ collection: "faqs" });
    expect(reindexRes.indexedCount).toBe(42);
    expect(mockFetch.mock.calls[1][0]).toBe("http://api.test/api/ai/rag/reindex");
  });

  it("chat sends messages and context to /api/ai/chat and returns raw Response", async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
    };
    mockFetch.mockResolvedValueOnce(fakeResponse);

    const res = await client.ai.chat(
      [{ role: "user", content: "Summarize pending orders" }],
      { threadId: "thread_456", context: { orderLimit: 10 } }
    );

    expect(res).toBe(fakeResponse);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("http://api.test/api/ai/chat");
    expect(init.method).toBe("POST");
    expect(init.headers["authorization"] ?? init.headers["Authorization"]).toBe("Bearer user-jwt-token");
    expect(JSON.parse(init.body)).toEqual({
      messages: [{ role: "user", content: "Summarize pending orders" }],
      threadId: "thread_456",
      context: { orderLimit: 10 },
    });
  });
});
