import { ReactNode } from 'react'

interface HeroProps {
  title: string
  description: string
  children?: ReactNode
}

export function Hero({ title, description, children }: HeroProps) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-24 px-4">
      {/* Badge */}
      <div
        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium animate-in fade-in slide-in-from-top-4 duration-700"
        style={{
          background: 'rgba(124,61,255,0.08)',
          border: '1px solid rgba(124,61,255,0.2)',
          color: '#7C3DFF',
        }}
      >
        <span
          className="mr-1.5 flex h-2 w-2 rounded-full"
          style={{ background: '#B6FF2E' }}
        />
        Now in Public Beta
      </div>

      {/* Heading — Fraunces */}
      <h1
        className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{
          fontFamily: 'var(--font-display, serif)',
          color: '#111110',
          lineHeight: 1.1,
        }}
      >
        {title}
      </h1>

      {/* Description */}
      <p
        className="text-lg md:text-xl max-w-[640px] leading-relaxed animate-in fade-in slide-in-from-bottom-4 delay-150 duration-700"
        style={{ color: '#625F6C' }}
      >
        {description}
      </p>

      {/* CTA slot */}
      <div className="animate-in fade-in slide-in-from-bottom-4 delay-300 duration-700">
        {children}
      </div>
    </div>
  )
}
