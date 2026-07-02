'use client'

import { useEffect, useId, useRef, useState } from 'react'

/**
 * Mermaid — renders a Mermaid diagram from a chart string, client-side.
 *
 * Authors don't use this directly; the remark plugin in `source.config.ts`
 * converts ```mermaid fenced code blocks into `<Mermaid chart="..." />`.
 *
 * Theme is read from the `dark` class Fumadocs toggles on <html>, so we don't
 * depend on next-themes, and we re-render when the user flips the theme.
 */
export function Mermaid({ chart }: { chart: string }) {
  const rawId = useId()
  const id = `mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const [svg, setSvg] = useState('')
  const [isDark, setIsDark] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track the site theme via the `dark` class on <html>.
  useEffect(() => {
    const root = document.documentElement
    const read = () => root.classList.contains('dark')
    setIsDark((prev) => (prev === read() ? prev : read()))

    const observer = new MutationObserver(() => {
      const next = read()
      setIsDark((prev) => (prev === next ? prev : next))
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Render (or re-render) the diagram when the chart or theme changes.
  useEffect(() => {
    let cancelled = false

    async function render() {
      const { default: mermaid } = await import('mermaid')
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      })
      try {
        const { svg: out } = await mermaid.render(id, chart)
        if (!cancelled) setSvg((prev) => (prev === out ? prev : out))
      } catch (err) {
        if (!cancelled) {
          setSvg('')
          // Surface the parse error instead of failing silently.
          if (containerRef.current) {
            containerRef.current.textContent = `Mermaid error: ${String(err)}`
          }
        }
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [chart, id, isDark])

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto [&_svg]:max-w-full"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  )
}
