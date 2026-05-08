import * as React from "react"

import { cn } from "../../lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-border/40 bg-white/50 px-4 py-2 text-base transition-all",
          "placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-primary/30 focus-visible:bg-white focus-visible:shadow-md",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
