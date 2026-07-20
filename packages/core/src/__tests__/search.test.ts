import { beforeEach, describe, expect, it } from "vitest";
import { createDyrectedApp } from "../app.js";
import { defineCollection, defineConfig } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

describe("collection search", () => {
  let db: InMemoryAdapter;
  let app: Awaited<ReturnType<typeof createDyrectedApp>>;

  beforeEach(async () => {
    db = new InMemoryAdapter();

    db.seed("authors", [
      { id: "author-1", name: "Grace Hopper" },
      { id: "author-2", name: "Ada Lovelace" },
    ]);

    db.seed("topics", [
      { id: "topic-1", name: "History" },
      { id: "topic-2", name: "Theology" },
    ]);

    db.seed("categories", [
      { id: "category-1", name: "Parent Category" },
      { id: "category-2", name: "Child Category", parent: "category-1" },
    ]);

    db.seed("articles", [
      {
        id: "article-1",
        title: "Grace in Practice",
        summary: "Intro to backend search",
        body: "<p>Rich text body with <strong>grace</strong> inside HTML.</p>",
        author: "author-1",
        topics: ["topic-1"],
        category: "category-1",
      },
      {
        id: "article-2",
        title: "Letters and Logic",
        summary: "Ada overview",
        body: "<p>Notes on analytical engines.</p>",
        author: "author-2",
        topics: ["topic-2"],
        category: "category-2",
      },
    ]);

    db.seed("notes", [
      {
        id: "note-1",
        title: "Default Search Title",
        description: "This note uses inferred searchable fields.",
        body: "<p>Ignored body</p>",
      },
      {
        id: "note-2",
        title: "Another note",
        description: "Something else entirely",
        body: "<p>Ignored body</p>",
      },
    ]);

    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "authors",
          admin: { useAsTitle: "name" },
          fields: [{ name: "name", type: "text", label: "Name" }],
        }),
        defineCollection({
          slug: "topics",
          admin: { useAsTitle: "name" },
          fields: [{ name: "name", type: "text", label: "Name" }],
        }),
        defineCollection({
          slug: "categories",
          admin: { useAsTitle: "parent" },
          fields: [
            { name: "name", type: "text", label: "Name" },
            {
              name: "parent",
              type: "relationship",
              label: "Parent",
              relationTo: "categories",
            },
          ],
        }),
        defineCollection({
          slug: "articles",
          admin: {
            useAsTitle: "title",
            searchableFields: ["title", "summary", "body", "author", "topics", "category"],
          },
          fields: [
            { name: "title", type: "text", label: "Title" },
            { name: "summary", type: "textarea", label: "Summary" },
            { name: "body", type: "richText", label: "Body" },
            {
              name: "author",
              type: "relationship",
              label: "Author",
              relationTo: "authors",
            },
            {
              name: "topics",
              type: "relationship",
              label: "Topics",
              relationTo: "topics",
              hasMany: true,
            },
            {
              name: "category",
              type: "relationship",
              label: "Category",
              relationTo: "categories",
            },
          ],
        }),
        defineCollection({
          slug: "notes",
          fields: [
            { name: "title", type: "text", label: "Title" },
            { name: "description", type: "textarea", label: "Description" },
            { name: "body", type: "richText", label: "Body" },
          ],
        }),
      ],
      globals: [],
      db,
    });

    app = await createDyrectedApp(config);
  });

  it("searches text, textarea, and rich text fields", async () => {
    const titleRes = await app.request("/api/collections/articles?search=Practice");
    const titleData = await titleRes.json();
    expect(titleData.docs.map((doc: { id: string }) => doc.id)).toEqual(["article-1"]);

    const summaryRes = await app.request("/api/collections/articles?search=overview");
    const summaryData = await summaryRes.json();
    expect(summaryData.docs.map((doc: { id: string }) => doc.id)).toEqual(["article-2"]);

    const richTextRes = await app.request("/api/collections/articles?search=%3Cstrong%3Egrace%3C%2Fstrong%3E");
    const richTextData = await richTextRes.json();
    expect(richTextData.docs.map((doc: { id: string }) => doc.id)).toEqual(["article-1"]);
  });

  it("combines search with explicit where using AND", async () => {
    const where = encodeURIComponent(JSON.stringify({ title: { contains: "Grace" } }));
    const res = await app.request(`/api/collections/articles?search=backend&where=${where}`);
    const data = await res.json();

    expect(data.docs.map((doc: { id: string }) => doc.id)).toEqual(["article-1"]);

    const noMatchRes = await app.request(
      `/api/collections/articles?search=backend&where=${encodeURIComponent(
        JSON.stringify({ title: { contains: "Ada" } }),
      )}`,
    );
    const noMatchData = await noMatchRes.json();
    expect(noMatchData.docs).toEqual([]);
  });

  it("ignores an empty search value", async () => {
    const res = await app.request("/api/collections/articles?search=%20%20");
    const data = await res.json();

    expect(data.total).toBe(2);
  });

  it("uses inferred default searchable fields when config omits searchableFields", async () => {
    const res = await app.request("/api/collections/notes?search=inferred");
    const data = await res.json();

    expect(data.docs.map((doc: { id: string }) => doc.id)).toEqual(["note-1"]);
  });

  it("searches relationship titles for single and multi relationship fields", async () => {
    const singleRes = await app.request("/api/collections/articles?search=Hopper");
    const singleData = await singleRes.json();
    expect(singleData.docs.map((doc: { id: string }) => doc.id)).toEqual(["article-1"]);

    const multiRes = await app.request("/api/collections/articles?search=Theology");
    const multiData = await multiRes.json();
    expect(multiData.docs.map((doc: { id: string }) => doc.id)).toEqual(["article-2"]);
  });

  it("searches nested relation title chains", async () => {
    const res = await app.request("/api/collections/articles?search=Parent");
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.docs.map((doc: { id: string }) => doc.id)).toEqual([
      "article-1",
      "article-2",
    ]);
  });
});
