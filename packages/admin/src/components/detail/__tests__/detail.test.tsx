import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { DetailRenderer } from "../detail-renderer"
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
} from "@dyrected/core"

describe("Admin Detail View Components", () => {
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
        options={{ display: "badge" }}
      />,
    )
    expect(screen.getByText("In Stock")).toBeDefined()
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
      <DetailRepeatComponent
        field="variants"
        items={[displayField("name", { label: "Variant Name" }), displayField("price", { label: "Price" })]}
        options={{ layout: "table" }}
        data={data}
        renderItemContent={(item: any, row) => <span>{row[item.field]}</span>}
      />,
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
      <DetailRepeatComponent
        field="categories"
        items={[displayField("summary", { label: "Summary" })]}
        options={{ layout: "cards", useAsTitle: "title" }}
        data={data}
        renderItemContent={(item: any, row) => <span>{row[item.field]}</span>}
      />,
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
})
