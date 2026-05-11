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
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border bg-card p-6 text-card-foreground transition-all hover:bg-muted/50 hover:shadow-lg dark:hover:shadow-primary/5',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            {icon}
          </div>
        )}
        <h3 className="font-semibold tracking-tight text-lg">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      <div className="mt-auto flex items-center text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
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
