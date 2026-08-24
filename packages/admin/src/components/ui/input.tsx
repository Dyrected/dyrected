import * as React from "react"

import { cn } from "../../lib/utils"

export interface InputProps extends Omit<React.ComponentProps<"input">, "size"> {
  size?: "default" | "sm"
}

const sizeVariants = {
  default: "dy-h-12",
  sm: "dy-h-9 dy-rounded-lg dy-px-3 dy-text-sm",
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size = "default", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "dy-flex dy-w-full dy-rounded-xl dy-border dy-border-border/50 dark:dy-border-border/80 dy-bg-background dy-px-4 dy-py-2 dy-text-base dy-transition-all",
          "placeholder:dy-text-muted-foreground/60 focus-visible:dy-outline-none focus-visible:dy-border-primary/30 dark:focus-visible:dy-border-primary/45 focus-visible:dy-bg-background focus-visible:dy-shadow-md",
          "disabled:dy-cursor-not-allowed disabled:dy-opacity-50 md:dy-text-sm dy-shadow-sm",
          sizeVariants[size],
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
