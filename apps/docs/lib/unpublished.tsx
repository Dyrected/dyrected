
import type { ReactNode } from 'react'
import type { Node, Root } from 'fumadocs-core/page-tree'

/**
 * Draft / review-only docs convention.
 *
 * A page whose file name is prefixed with `__` (for example `__i18n.mdx`) is
 * treated as unpublished. Unpublished pages are hidden from the production
 * site — their route 404s, they are excluded from static generation, and they
 * do not appear in the sidebar — but they stay visible during local
 * development, flagged with an asterisk in the sidebar, so authors can keep
 * review-only drafts in the repo without shipping them.
 *
 * The prefix is the single source of truth: rename a file to `__name.mdx` to
 * unpublish it, and remove the prefix to publish it.
 */
export const UNPUBLISHED_PREFIX = '__'

/**
 * Whether unpublished pages should be shown. They appear everywhere except
 * production builds, so `next dev` shows them and `next build` hides them.
 */
export const showUnpublished = process.env.NODE_ENV !== 'production'

function isUnpublishedSegment(segment: string): boolean {
  return segment.startsWith(UNPUBLISHED_PREFIX)
}

/** True when a route slug (e.g. from page params) points at an unpublished page. */
export function isUnpublishedSlug(slug: string[] | undefined): boolean {
  return (slug ?? []).some(isUnpublishedSegment)
}

/** True when a page-tree URL (e.g. `/new-docs/.../__i18n`) points at an unpublished page. */
export function isUnpublishedUrl(url: string): boolean {
  return url.split('/').some(isUnpublishedSegment)
}

function UnpublishedLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      {children}
      <sup
        aria-label="Unpublished — visible in development only"
        title="Unpublished — visible in development only"
        className="text-fd-muted-foreground"
      >
        *
      </sup>
    </span>
  )
}

function transformNodes(nodes: Node[]): Node[] {
  const out: Node[] = []

  for (const node of nodes) {
    if (node.type === 'folder') {
      out.push({ ...node, children: transformNodes(node.children) })
      continue
    }

    if (node.type === 'page' && isUnpublishedUrl(node.url)) {
      if (!showUnpublished) continue
      out.push({ ...node, name: <UnpublishedLabel>{node.name}</UnpublishedLabel> })
      continue
    }

    out.push(node)
  }

  return out
}

/**
 * Returns a copy of a Fumadocs page tree with unpublished pages removed in
 * production and asterisk-flagged in development. The original tree is left
 * untouched, since it is shared across requests.
 */
export function prepareTree(tree: Root): Root {
  return { ...tree, children: transformNodes(tree.children) }
}
