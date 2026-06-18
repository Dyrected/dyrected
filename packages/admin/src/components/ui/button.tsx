import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "dy-inline-flex dy-items-center dy-justify-center dy-gap-2 dy-whitespace-nowrap dy-rounded-md dy-text-sm dy-font-medium dy-ring-offset-background dy-transition-colors focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring focus-visible:dy-ring-offset-2 disabled:dy-pointer-events-none disabled:dy-opacity-50 [&_svg]:dy-pointer-events-none [&_svg]:dy-size-4 [&_svg]:dy-shrink-0",
  {
    variants: {
      variant: {
        default: "dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary/90",
        destructive:
          "dy-bg-destructive dy-text-destructive-foreground hover:dy-bg-destructive/90",
        outline:
          "dy-border dy-border-input dy-bg-background hover:dy-bg-accent hover:dy-text-accent-foreground",
        secondary:
          "dy-bg-secondary dy-text-secondary-foreground hover:dy-bg-secondary/80",
        ghost: "hover:dy-bg-accent hover:dy-text-accent-foreground",
        link: "dy-text-primary dy-underline-offset-4 hover:dy-underline",
      },
      size: {
        default: "dy-h-10 dy-px-4 dy-py-2",
        sm: "dy-h-9 dy-rounded-md dy-px-3",
        lg: "dy-h-11 dy-rounded-md dy-px-8",
        icon: "dy-h-10 dy-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
