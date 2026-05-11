import { ReactNode } from 'react'

interface HeroProps {
  title: string
  description: string
  children?: ReactNode
}

export function Hero({ title, description, children }: HeroProps) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-20 px-4">
      <div className="inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground animate-in fade-in slide-in-from-top-4 duration-1000">
        <span className="mr-1.5 flex h-2 w-2 rounded-full bg-primary" />
        Now in Public Beta
      </div>
      <h1 className="text-4xl md:text-6xl font-bold tracking-tighter max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {title}
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-[700px] leading-relaxed animate-in fade-in slide-in-from-bottom-4 delay-150 duration-1000">
        {description}
      </p>
      <div className="animate-in fade-in slide-in-from-bottom-4 delay-300 duration-1000">
        {children}
      </div>
    </div>
  )
}
