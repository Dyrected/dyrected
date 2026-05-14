import * as React from "react"

import { cn } from "../../lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "dy-flex dy-h-12 dy-w-full dy-rounded-xl dy-border dy-border-border/40 dy-bg-white/50 dy-px-4 dy-py-2 dy-text-base dy-transition-all",
          "placeholder:dy-text-muted-foreground/60 focus-visible:dy-outline-none focus-visible:dy-border-primary/30 focus-visible:dy-bg-white focus-visible:dy-shadow-md",
          "disabled:dy-cursor-not-allowed disabled:dy-opacity-50 md:dy-text-sm dy-shadow-sm",
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
