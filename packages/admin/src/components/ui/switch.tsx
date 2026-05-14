import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "../../lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "dy-peer dy-inline-flex dy-h-6 dy-w-11 dy-shrink-0 dy-cursor-pointer dy-items-center dy-rounded-full dy-border-2 dy-border-transparent dy-transition-colors focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring focus-visible:dy-ring-offset-2 focus-visible:dy-ring-offset-background disabled:dy-cursor-not-allowed disabled:dy-opacity-50 data-[state=checked]:dy-bg-primary data-[state=unchecked]:dy-bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "dy-pointer-events-none dy-block dy-h-5 dy-w-5 dy-rounded-full dy-bg-background dy-shadow-lg dy-ring-0 dy-transition-transform data-[state=checked]:dy-translate-x-5 data-[state=unchecked]:dy-translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
