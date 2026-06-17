import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface CardProps {
  title: string
  description: string
  href: string
  icon?: ReactNode
  className?: string
}

export function Card({ title, description, href, icon, className }: CardProps) {
  return (
    <a
      href={href}
      className={cn('group relative flex flex-col gap-3 rounded-xl p-6 transition-all', className)}
      style={{
        background: '#FFFFFF',
        border: '1px solid #DED7F2',
        color: '#111110',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(124,61,255,0.12)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,61,255,0.4)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = ''
        ;(e.currentTarget as HTMLElement).style.borderColor = '#DED7F2'
      }}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors group-hover:scale-105"
            style={{
              background: 'rgba(124,61,255,0.08)',
              color: '#7C3DFF',
              transition: 'background 200ms, color 200ms, transform 200ms',
            }}
          >
            {icon}
          </div>
        )}
        <h3
          className="font-semibold tracking-tight text-lg transition-colors"
          style={{ color: '#111110', fontFamily: 'var(--font-display, serif)' }}
        >
          {title}
        </h3>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: '#625F6C' }}>
        {description}
      </p>
      <div
        className="mt-auto flex items-center text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: '#7C3DFF' }}
      >
        Learn more
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-1 transition-transform group-hover:translate-x-0.5"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>
    </a>
  )
}
