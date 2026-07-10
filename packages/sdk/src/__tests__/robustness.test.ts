import { describe, it, expect, vi } from "vitest";
import { createClient } from "../index.js";

describe("SDK Robustness", () => {
  const client = createClient({
    baseUrl: "https://api.example.com",
    apiKey: "test-key",
  });

  it("handles deeply nested relationships correctly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "post-1",
          title: "Post 1",
          author: {
            id: "author-1",
            name: "Author 1",
            profile: {
              id: "profile-1",
              bio: "Bio 1",
            },
          },
        }),
    });

    const customClient = createClient({
      baseUrl: "https://api.example.com",
      fetch: mockFetch,
    });

    const post = (await customClient.collection("posts").findOne("post-1", { depth: 3 })) as {
      author: { profile: { bio: string } };
    };
    expect(post.author.profile.bio).toBe("Bio 1");
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("depth=3"), expect.any(Object));
  });

  it("handles complex boolean logic in where clause", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ docs: [], total: 0 }),
    });

    const customClient = createClient({
      baseUrl: "https://api.example.com",
      fetch: mockFetch,
    });

    await customClient.collection("posts").find({
      where: {
        OR: [{ status: { equals: "published" } }, { featured: { equals: true } }],
        AND: [{ price: { gt: 0 } }, { price: { lt: 100 } }],
      },
    });

    const lastCall = mockFetch.mock.calls[0][0] as string;
    const url = new URL(lastCall);
    const where = JSON.parse(url.searchParams.get("where") || "{}");

    expect(where.OR).toBeDefined();
    expect(where.AND).toBeDefined();
    expect(where.OR[0].status.equals).toBe("published");
  });

  it("survives malformed JSON responses gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error("Unexpected token")),
    });

    const customClient = createClient({
      baseUrl: "https://api.example.com",
      fetch: mockFetch,
    });

    await expect(customClient.collection("posts").find()).rejects.toThrow();
  });
});
