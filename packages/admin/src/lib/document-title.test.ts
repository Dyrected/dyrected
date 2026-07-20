import { describe, expect, it } from "vitest"
import { resolveDocumentTitle } from "./document-title"

describe("resolveDocumentTitle", () => {
  it("resolves a populated single relationship title", () => {
    const title = resolveDocumentTitle({
      entry: {
        id: "post-1",
        author: {
          id: "author-1",
          name: "Grace Hopper",
        },
      },
      collection: {
        slug: "posts",
        admin: { useAsTitle: "author" },
        fields: [
          {
            name: "author",
            type: "relationship",
            label: "Author",
            relationTo: "authors",
          },
        ],
      },
      collections: [
        {
          slug: "authors",
          admin: { useAsTitle: "name" },
          fields: [{ name: "name", type: "text", label: "Name" }],
        },
      ],
    })

    expect(title).toBe("Grace Hopper")
  })

  it("summarizes multi-relationship titles without stringifying raw objects", () => {
    const title = resolveDocumentTitle({
      entry: {
        id: "post-1",
        topics: [
          { id: "topic-1", name: "History" },
          { id: "topic-2", name: "Theology" },
          { id: "topic-3", name: "Poetry" },
          { id: "topic-4", name: "Logic" },
        ],
      },
      collection: {
        slug: "posts",
        admin: { useAsTitle: "topics" },
        fields: [
          {
            name: "topics",
            type: "relationship",
            label: "Topics",
            relationTo: "topics",
            hasMany: true,
          },
        ],
      },
      collections: [
        {
          slug: "topics",
          admin: { useAsTitle: "name" },
          fields: [{ name: "name", type: "text", label: "Name" }],
        },
      ],
    })

    expect(title).toBe("History, Theology, Poetry +1 more")
    expect(title).not.toContain("[object Object]")
  })

  it("resolves nested relation title chains", () => {
    const title = resolveDocumentTitle({
      entry: {
        id: "post-1",
        category: {
          id: "category-2",
          parent: {
            id: "category-1",
            name: "Parent Category",
          },
        },
      },
      collection: {
        slug: "posts",
        admin: { useAsTitle: "category" },
        fields: [
          {
            name: "category",
            type: "relationship",
            label: "Category",
            relationTo: "categories",
          },
        ],
      },
      collections: [
        {
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
        },
      ],
    })

    expect(title).toBe("Parent Category")
    expect(title).not.toContain("[object Object]")
  })

  it("resolves array row titles from field admin.useAsTitle", () => {
    const title = resolveDocumentTitle({
      entry: {
        id: "page-1",
        links: [
          { label: "Docs", url: "/docs" },
          { label: "Blog", url: "/blog" },
          { label: "Pricing", url: "/pricing" },
          { label: "About", url: "/about" },
        ],
      },
      collection: {
        slug: "pages",
        admin: { useAsTitle: "links" },
        fields: [
          {
            name: "links",
            type: "array",
            label: "Links",
            admin: { useAsTitle: "label" },
            fields: [
              { name: "label", type: "text", label: "Label" },
              { name: "url", type: "text", label: "URL" },
            ],
          },
        ],
      },
    })

    expect(title).toBe("Docs, Blog, Pricing +1 more")
  })

  it("falls back to a nested text field when object admin.useAsTitle is omitted", () => {
    const title = resolveDocumentTitle({
      entry: {
        id: "product-1",
        seo: {
          title: "Meta Title",
          description: "Meta Description",
        },
      },
      collection: {
        slug: "products",
        admin: { useAsTitle: "seo" },
        fields: [
          {
            name: "seo",
            type: "object",
            label: "SEO",
            fields: [
              { name: "title", type: "text", label: "Meta title" },
              { name: "description", type: "textarea", label: "Meta description" },
            ],
          },
        ],
      },
    })

    expect(title).toBe("Meta Title")
  })
})
