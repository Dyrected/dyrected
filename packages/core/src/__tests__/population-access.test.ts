import { describe, it, expect } from "vitest";
import { createDyrectedApp } from "../app.js";
import { defineConfig, defineCollection } from "../index.js";
import { InMemoryAdapter } from "./mocks.js";

describe("Cross-Collection & Field-Level Access in Relationship & Join Population", () => {
  it("filters out related document when user lacks collection read access", async () => {
    const db = new InMemoryAdapter();

    db.seed("authors", [
      { id: "author-public", name: "Alice", isPrivate: false },
      { id: "author-secret", name: "Bob (Secret Agent)", isPrivate: true },
    ]);

    db.seed("posts", [
      { id: "post-1", title: "Post by Alice", author: "author-public" },
      { id: "post-2", title: "Post by Bob", author: "author-secret" },
    ]);

    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "posts",
          fields: [
            { name: "title", type: "text" },
            { name: "author", type: "relationship", relationTo: "authors" },
          ],
        }),
        defineCollection({
          slug: "authors",
          access: {
            // Only allow reading non-private authors
            read: ({ doc }) => !doc?.isPrivate,
          },
          fields: [
            { name: "name", type: "text" },
            { name: "isPrivate", type: "boolean" },
          ],
        }),
      ],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);

    // Fetch post-1 (public author)
    const res1 = await app.request("/api/collections/posts/post-1?depth=1");
    const doc1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(doc1.author).toBeDefined();
    expect(doc1.author.name).toBe("Alice");

    // Fetch post-2 (secret author) -> PopulationService should sanitize/strip inaccessible author
    const res2 = await app.request("/api/collections/posts/post-2?depth=1");
    const doc2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(doc2.author).toBeNull();
  });

  it("strips protected fields on related documents via applyFieldReadAccess", async () => {
    const db = new InMemoryAdapter();

    db.seed("authors", [
      { id: "author-1", name: "Alice", email: "alice@example.com", secretPhone: "555-0199" },
    ]);

    db.seed("posts", [
      { id: "post-1", title: "My Post", author: "author-1" },
    ]);

    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "posts",
          fields: [
            { name: "title", type: "text" },
            { name: "author", type: "relationship", relationTo: "authors" },
          ],
        }),
        defineCollection({
          slug: "authors",
          fields: [
            { name: "name", type: "text" },
            { name: "email", type: "email" },
            {
              name: "secretPhone",
              type: "text",
              access: {
                // Deny reading secretPhone
                read: () => false,
              },
            },
          ],
        }),
      ],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);

    const res = await app.request("/api/collections/posts/post-1?depth=1");
    const doc = await res.json();

    expect(res.status).toBe(200);
    expect(doc.author).toBeDefined();
    expect(doc.author.name).toBe("Alice");
    expect(doc.author.email).toBe("alice@example.com");
    // secretPhone must be omitted from populated author document
    expect(doc.author.secretPhone).toBeUndefined();
  });

  it("filters joined documents with collection read access rules", async () => {
    const db = new InMemoryAdapter();

    db.seed("companies", [
      { id: "comp-1", name: "Acme Corp" },
    ]);

    db.seed("invoices", [
      { id: "inv-1", company: "comp-1", title: "Public Invoice", isConfidential: false },
      { id: "inv-2", company: "comp-1", title: "Confidential Invoice", isConfidential: true },
    ]);

    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "companies",
          fields: [
            { name: "name", type: "text" },
            {
              name: "invoices",
              type: "join",
              collection: "invoices",
              on: "company",
            },
          ],
        }),
        defineCollection({
          slug: "invoices",
          access: {
            read: ({ doc }) => !doc?.isConfidential,
          },
          fields: [
            { name: "title", type: "text" },
            { name: "company", type: "relationship", relationTo: "companies" },
            { name: "isConfidential", type: "boolean" },
          ],
        }),
      ],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);

    const res = await app.request("/api/collections/companies/comp-1?depth=1");
    const doc = await res.json();

    expect(res.status).toBe(200);
    expect(doc.invoices).toBeDefined();
    expect(doc.invoices.docs).toHaveLength(1);
    expect(doc.invoices.docs[0].title).toBe("Public Invoice");
  });
});
