import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "dy-grid dy-place-content-center dy-peer dy-h-4 dy-w-4 dy-shrink-0 dy-rounded-sm dy-border dy-border-primary dy-ring-offset-background focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring focus-visible:dy-ring-offset-2 disabled:dy-cursor-not-allowed disabled:dy-opacity-50 data-[state=checked]:dy-bg-primary data-[state=checked]:dy-text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("dy-grid dy-place-content-center dy-text-current")}
    >
      <Check className="dy-h-4 dy-w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
