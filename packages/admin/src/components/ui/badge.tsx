import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "dy-inline-flex dy-items-center dy-rounded-full dy-border dy-px-2.5 dy-py-0.5 dy-text-xs dy-font-semibold dy-transition-colors focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-ring focus:dy-ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "dy-border-transparent dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary/80",
        secondary:
          "dy-border-transparent dy-bg-secondary dy-text-secondary-foreground hover:dy-bg-secondary/80",
        destructive:
          "dy-border-transparent dy-bg-destructive dy-text-destructive-foreground hover:dy-bg-destructive/80",
        outline: "dy-text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
