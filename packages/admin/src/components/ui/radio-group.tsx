import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"

import { cn } from "../../lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("dy-grid dy-gap-2", className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "dy-aspect-square dy-h-5 dy-w-5 dy-rounded-full dy-border dy-border-primary/20 dy-bg-white/50 dy-text-primary dy-shadow-sm focus:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring disabled:dy-cursor-not-allowed disabled:dy-opacity-50 dy-transition-all hover:dy-border-primary/40 data-[state=checked]:dy-border-primary data-[state=checked]:dy-bg-primary/5",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="dy-flex dy-items-center dy-justify-center">
        <Circle className="dy-h-2.5 dy-w-2.5 dy-fill-current dy-text-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }
