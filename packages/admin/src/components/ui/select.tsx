"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "../../lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "dy-flex dy-h-10 dy-w-full dy-items-center dy-justify-between dy-rounded-md dy-border dy-border-input dy-bg-background dy-px-3 dy-py-2 dy-text-sm dy-ring-offset-background data-[placeholder]:dy-text-muted-foreground focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-ring focus:dy-ring-offset-2 disabled:dy-cursor-not-allowed disabled:dy-opacity-50 [&>span]:dy-line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="dy-h-4 dy-w-4 dy-opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "dy-flex dy-cursor-default dy-items-center dy-justify-center dy-py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="dy-h-4 dy-w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "dy-flex dy-cursor-default dy-items-center dy-justify-center dy-py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="dy-h-4 dy-w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "dy-relative dy-z-[100] dy-max-h-[--radix-select-content-available-height] dy-min-w-[8rem] dy-overflow-y-auto dy-overflow-x-hidden dy-rounded-md dy-border dy-bg-white dy-text-popover-foreground dy-shadow-md data-[state=open]:dy-animate-in data-[state=closed]:dy-animate-out data-[state=closed]:dy-fade-out-0 data-[state=open]:dy-fade-in-0 data-[state=closed]:dy-zoom-out-95 data-[state=open]:dy-zoom-in-95 data-[side=bottom]:dy-slide-in-from-top-2 data-[side=left]:dy-slide-in-from-right-2 data-[side=right]:dy-translate-x-1 data-[side=top]:dy--translate-y-1 dy-origin-[--radix-select-content-transform-origin]",
        position === "popper" &&
          "data-[side=bottom]:dy-translate-y-1 data-[side=left]:dy--translate-x-1 data-[side=right]:dy-translate-x-1 data-[side=top]:dy--translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "dy-p-1",
          position === "popper" &&
            "dy-h-[var(--radix-select-trigger-height)] dy-w-full dy-min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("dy-py-1.5 dy-pl-8 dy-pr-2 dy-text-sm dy-font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "dy-relative dy-flex dy-w-full dy-cursor-default dy-select-none dy-items-center dy-rounded-sm dy-py-1.5 dy-pl-8 dy-pr-2 dy-text-sm dy-outline-none focus:dy-bg-accent focus:dy-text-accent-foreground data-[disabled]:dy-pointer-events-none data-[disabled]:dy-opacity-50",
      className
    )}
    {...props}
  >
    <span className="dy-absolute dy-left-2 dy-flex dy-h-3.5 dy-w-3.5 dy-items-center dy-justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="dy-h-4 dy-w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("dy--mx-1 dy-my-1 dy-h-px dy-bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
