import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { hasInlineLink, InlineMarkdown, parseInlineMarkdown, toSafeHref } from "../inline-markdown"

describe("parseInlineMarkdown", () => {
  it("returns plain text untouched", () => {
    expect(parseInlineMarkdown("Total paid invoices")).toEqual([{ type: "text", text: "Total paid invoices" }])
  })

  it("parses bold, italic and code", () => {
    expect(parseInlineMarkdown("a **b** c *d* e `f`")).toEqual([
      { type: "text", text: "a " },
      { type: "bold", children: [{ type: "text", text: "b" }] },
      { type: "text", text: " c " },
      { type: "italic", children: [{ type: "text", text: "d" }] },
      { type: "text", text: " e " },
      { type: "code", text: "f" },
    ])
  })

  it("keeps formula symbols as plain text", () => {
    expect(parseInlineMarkdown("paid ÷ billed × 100 ≥ 0.5")).toEqual([
      { type: "text", text: "paid ÷ billed × 100 ≥ 0.5" },
    ])
  })

  it("treats code content literally", () => {
    expect(parseInlineMarkdown("`**not bold** [x](https://a.com)`")).toEqual([
      { type: "code", text: "**not bold** [x](https://a.com)" },
    ])
  })

  it("nests italic and links inside bold", () => {
    const [node] = parseInlineMarkdown("**see *this* [doc](https://a.com)**")
    expect(node.type).toBe("bold")
    const types = (node as any).children.map((c: any) => c.type)
    expect(types).toEqual(["text", "italic", "text", "link"])
  })

  it("leaves headings, lists, images and HTML as plain text", () => {
    for (const input of ["# Heading", "- item", "![alt](https://a.com/x.png)", "<b>hi</b><script>x</script>"]) {
      const text = parseInlineMarkdown(input)
        .map((n) => (n.type === "text" ? n.text : n.type === "link" ? n.text : ""))
        .join("")
      expect(text.length).toBeGreaterThan(0)
      expect(parseInlineMarkdown(input).some((n) => n.type === "bold" || n.type === "italic")).toBe(false)
    }
    expect(parseInlineMarkdown("<b>hi</b>")).toEqual([{ type: "text", text: "<b>hi</b>" }])
  })

  it("does not throw on unbalanced or malformed input", () => {
    for (const input of ["**open", "*open", "`open", "[text](", "[text](https://a.com", "[](x)", "***", "](", "\u0000"]) {
      expect(() => parseInlineMarkdown(input)).not.toThrow()
    }
  })

  it("stops nesting at a fixed depth", () => {
    expect(() => parseInlineMarkdown("**a *b **c *d* c** b* a**")).not.toThrow()
  })
})

describe("link safety", () => {
  it.each(["https://example.com/a?b=1", "http://example.com", "mailto:help@example.com"])("allows %s", (url) => {
    expect(toSafeHref(url)).not.toBeNull()
  })

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\nscript:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<script>1</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "/relative/path",
    "//example.com",
    "example.com",
    "",
  ])("rejects %j", (url) => {
    expect(toSafeHref(url)).toBeNull()
  })

  it("turns an unsafe link into its plain label", () => {
    expect(parseInlineMarkdown("[click](javascript:alert(1))")).toEqual([{ type: "text", text: "click" }])
  })

  it("keeps a link address that contains parentheses intact", () => {
    expect(parseInlineMarkdown("[Wiki](https://en.wikipedia.org/wiki/Foo_(bar))")).toEqual([
      { type: "link", href: "https://en.wikipedia.org/wiki/Foo_(bar)", text: "Wiki" },
    ])
  })

  it("detects safe links only", () => {
    expect(hasInlineLink("see [docs](https://a.com)")).toBe(true)
    expect(hasInlineLink("**see [docs](https://a.com)**")).toBe(true)
    expect(hasInlineLink("see [docs](javascript:alert(1))")).toBe(false)
    expect(hasInlineLink("no links *here*")).toBe(false)
  })
})

describe("<InlineMarkdown />", () => {
  it("renders elements, never raw HTML", () => {
    const { container } = render(<InlineMarkdown text={"**bold** <img src=x onerror=alert(1)>"} />)
    expect(container.querySelector("strong")?.textContent).toBe("bold")
    expect(container.querySelector("img")).toBeNull()
    expect(container.textContent).toContain("<img src=x onerror=alert(1)>")
  })

  it("renders safe links that open in a new tab without access to the opener", () => {
    const { container } = render(<InlineMarkdown text="[Docs](https://example.com/docs)" />)
    const link = container.querySelector("a")!
    expect(link.getAttribute("href")).toBe("https://example.com/docs")
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe("noopener noreferrer")
    expect(link.getAttribute("title")).toBe("https://example.com/docs")
  })

  it("renders no anchor for an unsafe link", () => {
    const { container } = render(<InlineMarkdown text="[Docs](javascript:alert(1))" />)
    expect(container.querySelector("a")).toBeNull()
    expect(container.textContent).toBe("Docs")
  })
})
