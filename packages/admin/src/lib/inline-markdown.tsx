import * as React from "react"

/** One piece of parsed inline text. */
export type InlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; children: InlineNode[] }
  | { type: "italic"; children: InlineNode[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; text: string }

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"])
const MAX_DEPTH = 3

// Order matters: code first (its content is literal), then links, bold, italic.
// A link address may contain one level of parentheses, as in https://en.wikipedia.org/wiki/Foo_(bar).
// Bold may contain single asterisks, so italic can nest inside it.
const TOKEN = /(`[^`\n]+`)|(\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\))|(\*\*((?:[^*\n]|\*(?!\*))+?)\*\*)|(\*([^*\s][^*\n]*?)\*)/

/**
 * Returns a link target only when it is a full `http`, `https` or `mailto` URL.
 *
 * The address is parsed with `URL` rather than inspected as a string, so spellings such as
 * `JaVaScRiPt:` or `java\nscript:` are rejected. Relative links are rejected too: admin
 * routes change, and a relative path in a config file would break without warning.
 */
export function toSafeHref(raw: string): string | null {
  try {
    const url = new URL(raw.trim())
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

/**
 * Parses the small markdown subset allowed in metric descriptions:
 * `**bold**`, `*italic*`, `` `code` `` and `[text](https://…)`.
 *
 * Everything else, including headings, lists, images and raw HTML, stays plain text. A link
 * with an unsafe or malformed address becomes its plain label. The parser never throws.
 */
export function parseInlineMarkdown(source: string, depth = 0): InlineNode[] {
  const nodes: InlineNode[] = []
  let rest = source

  while (rest) {
    const match = TOKEN.exec(rest)
    if (!match) {
      nodes.push({ type: "text", text: rest })
      break
    }
    if (match.index > 0) nodes.push({ type: "text", text: rest.slice(0, match.index) })

    if (match[1]) {
      nodes.push({ type: "code", text: match[1].slice(1, -1) })
    } else if (match[2]) {
      const href = toSafeHref(match[4])
      nodes.push(href ? { type: "link", href, text: match[3] } : { type: "text", text: match[3] })
    } else if (match[5]) {
      nodes.push(
        depth < MAX_DEPTH
          ? { type: "bold", children: parseInlineMarkdown(match[6], depth + 1) }
          : { type: "text", text: match[6] },
      )
    } else if (match[7]) {
      nodes.push(
        depth < MAX_DEPTH
          ? { type: "italic", children: parseInlineMarkdown(match[8], depth + 1) }
          : { type: "text", text: match[8] },
      )
    }

    rest = rest.slice(match.index + match[0].length)
  }

  return nodes
}

/** Whether the text contains at least one safe link. */
export function hasInlineLink(source: string): boolean {
  const walk = (nodes: InlineNode[]): boolean =>
    nodes.some((node) =>
      node.type === "link" ? true : node.type === "bold" || node.type === "italic" ? walk(node.children) : false,
    )
  return walk(parseInlineMarkdown(source))
}

function renderNodes(nodes: InlineNode[]): React.ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return <React.Fragment key={i}>{node.text}</React.Fragment>
      case "bold":
        return <strong key={i} className="dy-font-semibold">{renderNodes(node.children)}</strong>
      case "italic":
        return <em key={i}>{renderNodes(node.children)}</em>
      case "code":
        return (
          <code key={i} className="dy-rounded dy-bg-muted dy-px-1 dy-py-0.5 dy-font-mono dy-text-[0.85em]">
            {node.text}
          </code>
        )
      case "link":
        return (
          <a
            key={i}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            title={node.href}
            className="dy-text-primary dy-underline dy-underline-offset-2"
            onClick={(event) => event.stopPropagation()}
          >
            {node.text}
          </a>
        )
    }
  })
}

/**
 * Renders the inline markdown subset as ordinary React elements (never an HTML string), so
 * nothing in the text can inject markup. See {@link parseInlineMarkdown} for what is supported.
 */
export function InlineMarkdown({ text }: { text: string }) {
  return <>{renderNodes(parseInlineMarkdown(text))}</>
}
