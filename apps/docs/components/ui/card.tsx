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
    <a href={href} className={cn('doc-card group relative flex flex-col gap-3 rounded-xl p-6', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="doc-card-icon flex h-10 w-10 items-center justify-center rounded-lg">
            {icon}
          </div>
        )}
        <h3
          className="font-semibold tracking-tight text-lg"
          style={{ color: '#111110', fontFamily: 'var(--font-display, serif)' }}
        >
          {title}
        </h3>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: '#625F6C' }}>
        {description}
      </p>
      <div className="doc-card-learn mt-auto flex items-center text-xs font-medium">
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
          className="ml-1"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>
    </a>
  )
}
