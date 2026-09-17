import { render as rtlRender, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { DetailRenderer } from "../detail-renderer"

const useDyrectedMock = vi.fn((): any => ({
  client: {},
  user: { id: "user-1", email: "admin@dyrected.com" },
  schemas: { collections: [] as any[] },
  components: {},
}))

vi.mock("../../../providers/dyrected-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../providers/dyrected-context")>()
  return {
    ...actual,
    useDyrected: () => useDyrectedMock(),
  }
})
import { DetailHeader } from "../detail-header"
import { DetailFieldRenderer } from "../detail-field-renderer"
import { DetailSectionComponent } from "../detail-section"
import { DetailRepeatComponent } from "../detail-repeat"
import { DetailComputedComponent } from "../detail-computed"
import {
  displaySection,
  displayField,
  displayDivider,
  displayText,
  displayCustom,
  displayRepeat,
  displayAction,
} from "@dyrected/core"

const defaultDyrectedValue = {
  client: {},
  user: { id: "user-1", email: "admin@dyrected.com" },
  schemas: { collections: [] },
  components: {},
}

function render(ui: React.ReactElement, customClient?: QueryClient) {
  const queryClient =
    customClient ||
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  const rendered = rtlRender(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
  return { ...rendered, queryClient }
}

describe("Admin Detail View Components", () => {
  afterEach(() => {
    cleanup()
    useDyrectedMock.mockReturnValue(defaultDyrectedValue)
  })

  it("renders DetailHeader with title, ID, copy action, and edit button", () => {
    const doc = { id: "doc-123", title: "Wireless Headphones", status: "published" }
    const collection = {
      slug: "products",
      labels: { singular: "Product", plural: "Products" },
      admin: { useAsTitle: "title" },
      fields: [{ name: "title", type: "text" }],
    }

    render(
      <MemoryRouter>
        <DetailHeader collection={collection} doc={doc} />
      </MemoryRouter>,
    )

    expect(screen.getAllByText("Wireless Headphones").length).toBeGreaterThan(0)
    expect(screen.getByText("doc-123")).toBeDefined()
    expect(screen.getByText("Edit")).toBeDefined()
    expect(screen.getByText("Products")).toBeDefined()
  })

  it("renders DetailFieldRenderer with key-value table for object fields", () => {
    const value = {
      Bluetooth: "5.3",
      Battery: "30 hours",
      Weight: "250g",
    }

    render(
      <DetailFieldRenderer
        fieldDef={{ name: "specs", type: "object" }}
        value={value}
        doc={{}}
        options={{ display: "key-value", keyLabel: "Spec", valueLabel: "Detail" }}
      />,
    )

    expect(screen.getByText("Spec")).toBeDefined()
    expect(screen.getByText("Detail")).toBeDefined()
    expect(screen.getByText("Bluetooth")).toBeDefined()
    expect(screen.getByText("5.3")).toBeDefined()
  })

  it("renders DetailFieldRenderer with currency, badge, rating, and copyable variants", () => {
    const { rerender } = render(
      <DetailFieldRenderer
        fieldDef={{ name: "price", type: "number" }}
        value={299.99}
        doc={{}}
        options={{ display: "currency", currency: "USD" }}
      />,
    )
    expect(screen.getByText("$299.99")).toBeDefined()

    rerender(
      <DetailFieldRenderer
        fieldDef={{ name: "sku", type: "text" }}
        value="PROD-9988-WH"
        doc={{}}
        options={{ display: "copyable" }}
      />,
    )
    expect(screen.getByText("PROD-9988-WH")).toBeDefined()

    rerender(
      <DetailFieldRenderer
        fieldDef={{ name: "status", type: "select" }}
        value="In Stock"
        doc={{}}
        options={{
          display: "badge",
          badgeColors: { "In Stock": "emerald", draft: "zinc" },
        }}
      />,
    )
    const badgeEl = screen.getByText("In Stock")
    expect(badgeEl).toBeDefined()
    expect(badgeEl.className).toContain("dy-text-emerald-600")
  })

  it("renders DetailSectionComponent with collapsible behavior", () => {
    render(
      <DetailSectionComponent
        title="Specifications"
        options={{ collapsible: true, description: "Technical hardware specs" }}
      >
        <div data-testid="section-content">Inner Content</div>
      </DetailSectionComponent>,
    )

    expect(screen.getByText("Specifications")).toBeDefined()
    expect(screen.getByText("Technical hardware specs")).toBeDefined()
    expect(screen.getByTestId("section-content")).toBeDefined()
  })

  it("renders DetailRepeatComponent with table layout and data rows", () => {
    const data = [
      { name: "Option A", price: 10 },
      { name: "Option B", price: 20 },
    ]

    render(
      <MemoryRouter>
        <DetailRepeatComponent
          field="variants"
          items={[displayField("name", { label: "Variant Name" }), displayField("price", { label: "Price" })]}
          options={{ layout: "table" }}
          data={data}
          renderItemContent={(item: any, row) => <span>{row[item.field]}</span>}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText("Variant Name")).toBeDefined()
    expect(screen.getByText("Option A")).toBeDefined()
    expect(screen.getByText("Option B")).toBeDefined()
  })

  it("renders DetailRepeatComponent with cards layout and card title from useAsTitle", () => {
    const data = [
      { key: "cat-1", title: "Leadership", summary: "Strong leadership capability" },
      { key: "cat-2", title: "Communication", summary: "Clear communicator" },
    ]

    render(
      <MemoryRouter>
        <DetailRepeatComponent
          field="categories"
          items={[displayField("summary", { label: "Summary" })]}
          options={{ layout: "cards", useAsTitle: "title" }}
          data={data}
          renderItemContent={(item: any, row) => <span>{row[item.field]}</span>}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText("Leadership")).toBeDefined()
    expect(screen.getByText("Communication")).toBeDefined()
    expect(screen.getByText("Strong leadership capability")).toBeDefined()
    expect(screen.getByText("#1")).toBeDefined()
    expect(screen.getByText("#2")).toBeDefined()
  })

  it("renders DetailComputedComponent reading server metadata and evaluating JEXL", async () => {
    const docWithMeta = {
      price: 100,
      _meta: {
        computed: {
          total_price: 120,
        },
      },
    }

    render(
      <DetailComputedComponent
        id="total_price"
        label="Total Price"
        doc={docWithMeta}
        options={{ format: "currency", currency: "USD" }}
      />,
    )

    expect(screen.getByText("Total Price")).toBeDefined()
    expect(screen.getByText("$120.00")).toBeDefined()
  })

  it("renders a complete DetailRenderer schema layout seamlessly", () => {
    const doc = {
      id: "prod-1",
      name: "Ergonomic Desk",
      sku: "DSK-001",
      price: 450,
      inStock: true,
      specs: { Material: "Solid Oak", Height: "29 inches" },
    }

    const collection = {
      slug: "products",
      fields: [
        { name: "name", type: "text", label: "Product Name" },
        { name: "sku", type: "text", label: "SKU" },
        { name: "price", type: "number", label: "Price" },
        { name: "specs", type: "object", label: "Specifications" },
      ],
    }

    const schema = [
      displaySection("General Information", [
        displayField("name", { span: 8 }),
        displayField("sku", { span: 4, display: "copyable" }),
      ], { span: 8 }),
      displaySection("Pricing & Stock", [
        displayField("price", { display: "currency" }),
      ], { span: 4 }),
      displaySection("Specs", [
        displayField("specs", { display: "key-value", keyLabel: "Feature", valueLabel: "Specification" }),
      ], { span: 12 }),
    ]

    render(
      <MemoryRouter>
        <DetailRenderer items={schema} doc={doc} collection={collection} />
      </MemoryRouter>,
    )

    expect(screen.getByText("General Information")).toBeDefined()
    expect(screen.getByText("Pricing & Stock")).toBeDefined()
    expect(screen.getAllByText("Ergonomic Desk").length).toBeGreaterThan(0)
    expect(screen.getByText("DSK-001")).toBeDefined()
    expect(screen.getByText("$450.00")).toBeDefined()
    expect(screen.getByText("Solid Oak")).toBeDefined()
  })

  it("renders a global detail schema with singleton document data", () => {
    const globalDoc = {
      siteName: "Dyrected Portal",
      tagline: "The fastest headless CMS",
      contactEmail: "admin@dyrected.dev",
      socialLinks: {
        twitter: "@dyrected",
        github: "dyrected/dyrected",
      },
    }

    const globalSchema = {
      slug: "siteSettings",
      label: "Site Settings",
      fields: [
        { name: "siteName", type: "text", label: "Site Name" },
        { name: "tagline", type: "text", label: "Tagline" },
        { name: "contactEmail", type: "email", label: "Contact Email" },
        { name: "socialLinks", type: "object", label: "Social Networks" },
      ],
      detail: [
        displaySection("Site Identity", [
          displayField("siteName"),
          displayField("tagline"),
        ]),
        displaySection("Contact & Channels", [
          displayField("contactEmail", { display: "copyable" }),
          displayField("socialLinks", { display: "key-value" }),
        ]),
      ],
    }

    render(
      <MemoryRouter>
        <DetailRenderer
          items={globalSchema.detail}
          doc={globalDoc}
          collection={globalSchema}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText("Site Identity")).toBeDefined()
    expect(screen.getByText("Contact & Channels")).toBeDefined()
    expect(screen.getByText("Dyrected Portal")).toBeDefined()
    expect(screen.getByText("admin@dyrected.dev")).toBeDefined()
    expect(screen.getByText("@dyrected")).toBeDefined()
  })

  it("renders displayDivider, displayText, and displayCustom in DetailRenderer", () => {
    const doc = { title: "Test Item", note: "Internal Note" }
    const schema = [
      displayText("Important Instructions", { variant: "heading" }),
      displayText("Please double check these entries before approval.", { variant: "warning" }),
      displayDivider({ spacing: "md" }),
      displayCustom("AuditBadge", { props: { verified: true } }),
    ]

    const schemas = {
      customComponents: {
        AuditBadge: (props: any) => <div data-testid="audit-badge">Audit Verified: {String(props.verified)}</div>,
      },
    }

    render(
      <MemoryRouter>
        <DetailRenderer
          items={schema}
          doc={doc}
          collection={{ slug: "test", fields: [] }}
          schemas={schemas}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText("Important Instructions")).toBeDefined()
    expect(screen.getByText("Please double check these entries before approval.")).toBeDefined()
    expect(screen.getByTestId("audit-badge")).toBeDefined()
    expect(screen.getByText("Audit Verified: true")).toBeDefined()
  })

  it("renders DetailFieldRenderer with code, code-badge, star-rating, and icon variants", () => {
    const { rerender } = render(
      <DetailFieldRenderer
        fieldDef={{ name: "snippet", type: "text" }}
        value="const x = 42;"
        doc={{}}
        options={{ display: "code" }}
      />,
    )
    expect(screen.getByText("const x = 42;")).toBeDefined()

    rerender(
      <DetailFieldRenderer
        fieldDef={{ name: "envVar", type: "text" }}
        value="NODE_ENV"
        doc={{}}
        options={{ display: "code-badge" }}
      />,
    )
    expect(screen.getByText("NODE_ENV")).toBeDefined()

    rerender(
      <DetailFieldRenderer
        fieldDef={{ name: "rating", type: "number" }}
        value={4}
        doc={{}}
        options={{ display: "star-rating" }}
      />,
    )
    expect(screen.getByText("4/5")).toBeDefined()

    rerender(
      <DetailFieldRenderer
        fieldDef={{ name: "iconName", type: "text" }}
        value="Folder"
        doc={{}}
        options={{ display: "icon" }}
      />,
    )
    expect(screen.getByText("Folder")).toBeDefined()
  })

  it("renders select option labels instead of raw values", () => {
    const { rerender } = render(
      <DetailFieldRenderer
        fieldDef={{
          name: "status",
          type: "select",
          options: [
            { label: "In Production", value: "in_prod" },
            { label: "Archived Item", value: "archived" },
          ],
        }}
        value="in_prod"
        doc={{}}
      />,
    )
    expect(screen.getByText("In Production")).toBeDefined()

    rerender(
      <DetailFieldRenderer
        fieldDef={{
          name: "priority",
          type: "radio",
          options: [
            { label: "High Priority", value: "high" },
            { label: "Low Priority", value: "low" },
          ],
        }}
        value="high"
        doc={{}}
      />,
    )
    expect(screen.getByText("High Priority")).toBeDefined()
  })

  it("renders rich media and image previews for upload fields and media values", () => {
    const imageDoc = {
      id: "media-1",
      url: "https://example.com/assets/chair.png",
      filename: "ergonomic-chair.png",
      mimeType: "image/png",
    }

    render(
      <DetailFieldRenderer
        fieldDef={{ name: "heroImage", type: "upload" }}
        value={imageDoc}
        doc={{}}
      />,
    )

    expect(screen.getByText("ergonomic-chair.png")).toBeDefined()
    expect(screen.getByText("image/png")).toBeDefined()
    expect(screen.getByText("Open image")).toBeDefined()
  })

  it("supports inline editable mode with toggle and update", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)

    render(
      <DetailFieldRenderer
        fieldDef={{ name: "notes", type: "text", label: "Internal Notes" }}
        value="Initial note"
        doc={{ id: "doc-1" }}
        options={{ editable: true }}
        onUpdate={onUpdate}
      />,
    )

    expect(screen.getByText("Initial note")).toBeDefined()

    // Find and click the edit toggle button
    const editBtn = screen.getByTitle("Edit Internal Notes")
    fireEvent.click(editBtn)

    // The input should appear with the initial value
    const input = screen.getByDisplayValue("Initial note")
    expect(input).toBeDefined()

    // Change input value
    fireEvent.change(input, { target: { value: "Updated note" } })

    // Click save
    const saveBtn = screen.getByText("Save")
    fireEvent.click(saveBtn)

    expect(onUpdate).toHaveBeenCalledWith("notes", "Updated note")
  })

  it("renders DetailSectionComponent with badge and badgeColor", () => {
    render(
      <DetailSectionComponent
        title="Inventory"
        options={{ badge: "Verified", badgeColor: "emerald" }}
      >
        <div data-testid="inv-content">In Stock</div>
      </DetailSectionComponent>,
    )

    expect(screen.getByText("Inventory")).toBeDefined()
    const badgeEl = screen.getByText("Verified")
    expect(badgeEl).toBeDefined()
    expect(badgeEl.className).toContain("dy-text-emerald-600")
  })

  it("evaluates boolean and JEXL visible options for top-level and nested detail items", () => {
    const doc = {
      status: "draft",
      internalNotes: "Secret admin notes",
      publicNotes: "Public visible notes",
      publishedDate: "2026-08-18",
    }
    const user = { roles: ["editor"] }

    const schema = [
      displaySection("Public Info", [
        displayField("publicNotes"),
        displayField("internalNotes", { visible: "user.roles != null and includes(user.roles, 'admin')" }),
        displayField("publishedDate", { visible: false }),
      ]),
      displaySection("Admin Only Section", [
        displayField("internalNotes"),
      ], { visible: "user.roles != null and includes(user.roles, 'admin')" }),
      displaySection("Hidden Section", [
        displayField("publicNotes"),
      ], { visible: false }),
    ]

    render(
      <MemoryRouter>
        <DetailRenderer
          items={schema}
          doc={doc}
          user={user}
          collection={{ slug: "posts", fields: [] }}
        />
      </MemoryRouter>,
    )

    // Public Info section and field should be visible
    expect(screen.getByText("Public Info")).toBeDefined()
    expect(screen.getByText("Public visible notes")).toBeDefined()

    // Nested visible: false and visible: JEXL evaluated to false should NOT be rendered
    expect(screen.queryByText("Secret admin notes")).toBeNull()
    expect(screen.queryByText("2026-08-18")).toBeNull()

    // Top level visible: false and admin-only sections should NOT be rendered
    expect(screen.queryByText("Admin Only Section")).toBeNull()
    expect(screen.queryByText("Hidden Section")).toBeNull()
  })

  it("renders star rating with custom max scale and empty state", () => {
    const { rerender } = render(
      <DetailFieldRenderer
        fieldDef={{ name: "rating", type: "number", label: "Review Rating" }}
        value={4.5}
        doc={{}}
        options={{ display: "star-rating" }}
      />,
    )
    expect(screen.getByText("4.5/5")).toBeDefined()

    // With custom max scale
    rerender(
      <DetailFieldRenderer
        fieldDef={{ name: "score", type: "number", label: "Score" }}
        value={8}
        doc={{}}
        options={{ display: "star", max: 10 } as any}
      />,
    )
    expect(screen.getByText("8/10")).toBeDefined()

    // With 0 value
    rerender(
      <DetailFieldRenderer
        fieldDef={{ name: "score", type: "number", label: "Score" }}
        value={0}
        doc={{}}
        options={{ display: "star-rating" }}
      />,
    )
    expect(screen.getByText("0/5")).toBeDefined()
  })

  it("renders color swatch and color swatches list in DetailFieldRenderer", () => {
    const { rerender } = render(
      <DetailFieldRenderer
        fieldDef={{ name: "brandColor", type: "text", label: "Brand Color" }}
        value="#3b82f6"
        doc={{}}
        options={{ display: "color" }}
      />,
    )

    expect(screen.getByText("#3b82f6")).toBeDefined()

    // Array of color swatches
    rerender(
      <DetailFieldRenderer
        fieldDef={{ name: "palette", type: "json", label: "Palette" }}
        value={["#ef4444", "#10b981", "#3b82f6"]}
        doc={{}}
        options={{ display: "color-swatches" }}
      />,
    )

    const swatches = document.querySelectorAll("[title='#ef4444'], [title='#10b981'], [title='#3b82f6']")
    expect(swatches.length).toBe(3)
  })

  it("supports inline editing for color field", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)

    render(
      <DetailFieldRenderer
        fieldDef={{ name: "accentColor", type: "text", label: "Accent Color" }}
        value="#10b981"
        doc={{ id: "doc-color-1" }}
        options={{ display: "color", editable: true }}
        onUpdate={onUpdate}
      />,
    )

    expect(screen.getByText("#10b981")).toBeDefined()

    // Toggle edit mode
    const editBtn = screen.getByTitle("Edit Accent Color")
    fireEvent.click(editBtn)

    // Edit color hex text input
    const textInput = screen.getByPlaceholderText("#000000")
    fireEvent.change(textInput, { target: { value: "#6366f1" } })

    // Save
    const saveBtn = screen.getByText("Save")
    fireEvent.click(saveBtn)

    expect(onUpdate).toHaveBeenCalledWith("accentColor", "#6366f1")
  })

  it("navigates prev/next between joined rows inside the DetailRepeatComponent drawer", async () => {
    const rows = [
      { id: "c1", authorName: "Ann" },
      { id: "c2", authorName: "Ben" },
    ]
    const client = {
      collection: () => ({
        find: () => ({ exec: () => Promise.resolve({ docs: [] }) }),
        findOne: (id: string) => Promise.resolve(rows.find((r) => r.id === id)),
        update: vi.fn(),
      }),
    }
    const schemas = {
      collections: [
        { slug: "article-comments", fields: [{ name: "authorName", type: "text", label: "Author" }] },
      ],
    }

    render(
      <MemoryRouter>
        <DetailRepeatComponent
          field="comments"
          fieldDef={{ type: "join", collection: "article-comments", on: "article" }}
          doc={{ id: "article-1" }}
          client={client}
          schemas={schemas}
          items={[displayField("authorName")]}
          options={{ layout: "table" }}
          data={rows}
          renderItemContent={(item: any, row: any) => <span>{row[item.field]}</span>}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText("Ann"))
    await waitFor(() => {
      expect(screen.getByText("Document ID: c1")).toBeDefined()
    })
    expect((screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    await waitFor(() => {
      expect(screen.getByText("Document ID: c2")).toBeDefined()
    })
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("opens Detail-First collections into a read-only view first in the DetailRepeatComponent drawer", async () => {
    const rows = [{ id: "c1", authorName: "Ann" }]
    const client = {
      collection: () => ({
        find: () => ({ exec: () => Promise.resolve({ docs: [] }) }),
        findOne: (id: string) => Promise.resolve(rows.find((r) => r.id === id)),
        update: vi.fn(),
      }),
    }
    const schemas = {
      collections: [
        {
          slug: "article-comments",
          labels: { singular: "Comment" },
          fields: [{ name: "authorName", type: "text", label: "Author" }],
          detail: true,
        },
      ],
    }

    render(
      <MemoryRouter>
        <DetailRepeatComponent
          field="comments"
          fieldDef={{ type: "join", collection: "article-comments", on: "article" }}
          doc={{ id: "article-1" }}
          client={client}
          schemas={schemas}
          items={[displayField("authorName")]}
          options={{ layout: "table" }}
          data={rows}
          renderItemContent={(item: any, row: any) => <span>{row[item.field]}</span>}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText("Ann"))

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "View Comment" })).toBeDefined()
    })

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))

    expect(screen.getByRole("heading", { name: "Edit Comment" })).toBeDefined()
  })

  it("saves changes in DetailRepeatComponent drawer and invalidates parent queries and join queries", async () => {
    const rows = [{ id: "c1", authorName: "Ann" }]
    const updateMock = vi.fn().mockImplementation(async (id: string, data: any) => ({ id, ...data }))
    const client = {
      collection: () => ({
        find: () => ({ exec: () => Promise.resolve({ docs: [] }) }),
        findOne: (id: string) => Promise.resolve(rows.find((r) => r.id === id)),
        update: updateMock,
      }),
    }
    const schemas = {
      collections: [
        {
          slug: "article-comments",
          labels: { singular: "Comment" },
          fields: [{ name: "authorName", type: "text", label: "Author" }],
        },
      ],
    }

    useDyrectedMock.mockReturnValue({
      client,
      user: { id: "user-1", email: "admin@dyrected.com" },
      schemas,
      components: {},
    })

    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(testQueryClient, "invalidateQueries")
    const onParentUpdate = vi.fn().mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <DetailRepeatComponent
          field="comments"
          fieldDef={{ type: "join", collection: "article-comments", on: "article" }}
          doc={{ id: "article-1" }}
          client={client}
          schemas={schemas}
          items={[displayField("authorName")]}
          options={{ layout: "table" }}
          data={rows}
          renderItemContent={(item: any, row: any) => <span>{row[item.field]}</span>}
          parentCollection="articles"
          onParentUpdate={onParentUpdate}
        />
      </MemoryRouter>,
      testQueryClient,
    )

    fireEvent.click(screen.getByText("Ann"))

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Edit Comment" })).toBeDefined()
    })

    const saveBtn = await screen.findByRole("button", { name: "Save changes" }, { timeout: 10000 })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith("c1", expect.any(Object))
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["collections", "article-comments"],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["collections", "articles", "detail", "article-1"],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["join", "article-comments", "article", "article-1"],
    })
    expect(onParentUpdate).toHaveBeenCalled()
  })

  it("hides per-cell field labels by default in table-layout repeats, since the column header already shows them", () => {
    const doc = {
      id: "order-1",
      payments: [{ amount: 100 }, { amount: 200 }],
    }
    const collection = {
      slug: "orders",
      fields: [
        {
          name: "payments",
          type: "array",
          fields: [{ name: "amount", type: "number", label: "Amount" }],
        },
      ],
    }

    render(
      <MemoryRouter>
      <DetailRenderer
        items={[displayRepeat("payments", [displayField("amount")], { layout: "table" })]}
        doc={doc}
        collection={collection}
      />,
      </MemoryRouter>,
    )

    // Column header renders the label once...
    expect(screen.getAllByText(/amount/i)).toHaveLength(1)
    // ...but each cell just shows the value, no repeated per-row label.
    expect(screen.getByText("100")).toBeDefined()
    expect(screen.getByText("200")).toBeDefined()
  })

  it("still shows per-item field labels in list-layout repeats, where there is no column header", () => {
    const doc = {
      id: "order-1",
      payments: [{ amount: 100 }, { amount: 200 }],
    }
    const collection = {
      slug: "orders",
      fields: [
        {
          name: "payments",
          type: "array",
          fields: [{ name: "amount", type: "number", label: "Amount" }],
        },
      ],
    }

    render(
      <MemoryRouter>
      <DetailRenderer
        items={[displayRepeat("payments", [displayField("amount")], { layout: "list" })]}
        doc={doc}
        collection={collection}
      />,
      </MemoryRouter>,
    )

    expect(screen.getAllByText("Amount")).toHaveLength(2)
  })

  it("respects an explicit hideLabel: false override in a table-layout repeat", () => {
    const doc = { id: "order-1", payments: [{ amount: 100 }] }
    const collection = {
      slug: "orders",
      fields: [
        {
          name: "payments",
          type: "array",
          fields: [{ name: "amount", type: "number", label: "Amount" }],
        },
      ],
    }

    render(
      <MemoryRouter>
      <DetailRenderer
        items={[
          displayRepeat("payments", [displayField("amount", { hideLabel: false })], { layout: "table" }),
        ]}
        doc={doc}
        collection={collection}
      />,
      </MemoryRouter>,
    )

    // Header ("amount") + the explicitly-shown per-row label ("Amount")
    expect(screen.getAllByText(/amount/i)).toHaveLength(2)
  })

  it("renders and runs a header-type collection action defined on the collection", async () => {
    const runCollectionActionMock = vi.fn().mockResolvedValue({ id: "order-1", status: "shipped" })
    useDyrectedMock.mockReturnValue({
      ...defaultDyrectedValue,
      client: { collection: () => ({ runCollectionAction: runCollectionActionMock }) },
    })

    const doc = { id: "order-1", status: "pending" }
    const collection = {
      slug: "orders",
      fields: [{ name: "status", type: "text", label: "Status" }],
      actions: [{ name: "markShipped", label: "Mark as shipped", type: "header", mutation: { status: "shipped" } }],
    }

    render(
      <MemoryRouter>
        <DetailRenderer items={[displayField("status")]} doc={doc} collection={collection} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Mark as shipped" }))

    await waitFor(() => {
      expect(runCollectionActionMock).toHaveBeenCalledWith("markShipped", { id: "order-1", input: undefined })
    })
  })

  it("renders a displayAction item inline and stages a confirm dialog before executing", async () => {
    const runCollectionActionMock = vi.fn().mockResolvedValue({ id: "order-1", status: "shipped" })
    useDyrectedMock.mockReturnValue({
      ...defaultDyrectedValue,
      client: { collection: () => ({ runCollectionAction: runCollectionActionMock }) },
    })

    const doc = { id: "order-1", status: "pending" }
    const collection = {
      slug: "orders",
      fields: [{ name: "status", type: "text", label: "Status" }],
      actions: [
        {
          name: "markShipped",
          label: "Mark as shipped",
          confirm: "Mark this order shipped?",
          mutation: { status: "shipped" },
        },
      ],
    }

    render(
      <MemoryRouter>
        <DetailRenderer
          items={[displaySection("Order", [displayField("status"), displayAction("markShipped")])]}
          doc={doc}
          collection={collection}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Mark as shipped" }))

    expect(runCollectionActionMock).not.toHaveBeenCalled()
    expect(await screen.findByText("Mark this order shipped?")).toBeDefined()

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }))

    await waitFor(() => {
      expect(runCollectionActionMock).toHaveBeenCalledWith("markShipped", { id: "order-1", input: undefined })
    })
  })

  it("shows a placeholder when displayAction references an action name that doesn't exist", () => {
    const doc = { id: "order-1" }
    const collection = { slug: "orders", fields: [], actions: [] }

    render(
      <MemoryRouter>
        <DetailRenderer items={[displayAction("doesNotExist")]} doc={doc} collection={collection} />
      </MemoryRouter>,
    )

    expect(screen.getByText(/action not found/i)).toBeDefined()
    expect(screen.getByText("doesNotExist")).toBeDefined()
  })
})
