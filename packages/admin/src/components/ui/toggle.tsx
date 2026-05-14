import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const toggleVariants = cva(
  "dy-inline-flex dy-items-center dy-justify-center dy-rounded-md dy-text-sm dy-font-medium dy-ring-offset-background dy-transition-colors hover:dy-bg-muted hover:dy-text-muted-foreground focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring focus-visible:dy-ring-offset-2 disabled:dy-pointer-events-none disabled:dy-opacity-50 data-[state=on]:dy-bg-accent data-[state=on]:dy-text-accent-foreground [&_svg]:dy-pointer-events-none [&_svg]:dy-size-4 [&_svg]:dy-shrink-0 dy-gap-2",
  {
    variants: {
      variant: {
        default: "dy-bg-transparent",
        outline:
          "dy-border dy-border-input dy-bg-transparent hover:dy-bg-accent hover:dy-text-accent-foreground",
      },
      size: {
        default: "dy-h-10 dy-px-3 dy-min-w-10",
        sm: "dy-h-9 dy-px-2.5 dy-min-w-9",
        lg: "dy-h-11 dy-px-5 dy-min-w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
