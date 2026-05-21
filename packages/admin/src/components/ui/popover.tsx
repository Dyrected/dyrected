import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "../../lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <div className="dy-admin-ui">
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "dy-z-[100] dy-w-72 dy-rounded-md dy-border dy-bg-popover dy-p-0 dy-text-popover-foreground dy-shadow-md dy-outline-none data-[state=open]:dy-animate-in data-[state=closed]:dy-animate-out data-[state=closed]:dy-fade-out-0 data-[state=open]:dy-fade-in-0 data-[state=closed]:dy-zoom-out-95 data-[state=open]:dy-zoom-in-95 data-[side=bottom]:dy-slide-in-from-top-2 data-[side=left]:dy-slide-in-from-right-2 data-[side=right]:dy-slide-in-from-left-2 data-[side=top]:dy-slide-in-from-bottom-2 dy-origin-[--radix-popover-content-transform-origin]",
          className
        )}
        {...props}
      />
    </div>
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
