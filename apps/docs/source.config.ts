import { defineDocs, defineConfig } from 'fumadocs-mdx/config'

/**
 * Converts ```mermaid fenced code blocks into `<Mermaid chart="..." />` MDX
 * elements so authors keep using standard markdown fences. Runs in the remark
 * (mdast) phase, before Shiki highlighting, so the code node is replaced before
 * it would be turned into a `<pre>`.
 */
function remarkMermaid() {
  return (tree: unknown) => {
    const walk = (node: any) => {
      if (!node || !Array.isArray(node.children)) return
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        if (child?.type === 'code' && child.lang === 'mermaid') {
          node.children[i] = {
            type: 'mdxJsxFlowElement',
            name: 'Mermaid',
            attributes: [
              { type: 'mdxJsxAttribute', name: 'chart', value: child.value },
            ],
            children: [],
          }
        } else {
          walk(child)
        }
      }
    }
    walk(tree)
  }
}

export const docs = defineDocs({
  dir: 'content/docs',
})

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMermaid],
  },
})
