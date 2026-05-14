import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "../../lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "dy-inline-flex dy-h-10 dy-items-center dy-justify-center dy-rounded-md dy-bg-muted dy-p-1 dy-text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "dy-inline-flex dy-items-center dy-justify-center dy-whitespace-nowrap dy-rounded-sm dy-px-3 dy-py-1.5 dy-text-sm dy-font-medium dy-ring-offset-background dy-transition-all focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring focus-visible:dy-ring-offset-2 disabled:dy-pointer-events-none disabled:dy-opacity-50 data-[state=active]:dy-bg-background data-[state=active]:dy-text-foreground data-[state=active]:dy-shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "dy-mt-2 dy-ring-offset-background focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring focus-visible:dy-ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
