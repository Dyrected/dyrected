import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "../../lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "dy-z-50 dy-overflow-hidden dy-rounded-md dy-border dy-border-border/40 dy-bg-popover/95 dy-backdrop-blur-sm dy-px-3 dy-py-1.5 dy-text-sm dy-text-popover-foreground dy-shadow-lg dy-animate-in dy-fade-in-0 dy-zoom-in-95 data-[state=closed]:dy-animate-out data-[state=closed]:dy-fade-out-0 data-[state=closed]:dy-zoom-out-95 data-[side=bottom]:dy-slide-in-from-top-2 data-[side=left]:dy-slide-in-from-right-2 data-[side=right]:dy-slide-in-from-left-2 data-[side=top]:dy-slide-in-from-bottom-2 dy-origin-[--radix-tooltip-content-transform-origin]",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
