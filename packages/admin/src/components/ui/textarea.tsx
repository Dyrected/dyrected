import * as React from "react"

import { cn } from "../../lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "dy-flex dy-min-h-[80px] dy-w-full dy-rounded-md dy-border dy-border-input dy-bg-background dy-px-3 dy-py-2 dy-text-base dy-ring-offset-background placeholder:dy-text-muted-foreground focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring focus-visible:dy-ring-offset-2 disabled:dy-cursor-not-allowed disabled:dy-opacity-50 md:dy-text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
