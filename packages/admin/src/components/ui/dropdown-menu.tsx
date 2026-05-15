"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "../../lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "dy-flex dy-cursor-default dy-select-none dy-items-center dy-gap-2 dy-rounded-sm dy-px-2 dy-py-1.5 dy-text-sm dy-outline-none focus:dy-bg-accent data-[state=open]:dy-bg-accent [&_svg]:dy-pointer-events-none [&_svg]:dy-size-4 [&_svg]:dy-shrink-0",
      inset && "dy-pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="dy-ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "dy-z-50 dy-min-w-[8rem] dy-overflow-hidden dy-rounded-md dy-border dy-bg-popover dy-p-1 dy-text-popover-foreground dy-shadow-lg data-[state=open]:dy-animate-in data-[state=closed]:dy-animate-out data-[state=closed]:dy-fade-out-0 data-[state=open]:dy-fade-in-0 data-[state=closed]:dy-zoom-out-95 data-[state=open]:dy-zoom-in-95 data-[side=bottom]:dy-slide-in-from-top-2 data-[side=left]:dy-slide-in-from-right-2 data-[side=right]:dy-slide-in-from-left-2 data-[side=top]:dy-slide-in-from-bottom-2 dy-origin-[--radix-dropdown-menu-content-transform-origin]",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "dy-z-50 dy-max-h-[var(--radix-dropdown-menu-content-available-height)] dy-min-w-[8rem] dy-overflow-y-auto dy-overflow-x-hidden dy-rounded-md dy-border dy-bg-white dy-p-1 dy-text-popover-foreground dy-shadow-md data-[state=open]:dy-animate-in data-[state=closed]:dy-animate-out data-[state=closed]:dy-fade-out-0 data-[state=open]:dy-fade-in-0 data-[state=closed]:dy-zoom-out-95 data-[state=open]:dy-zoom-in-95 data-[side=bottom]:dy-slide-in-from-top-2 data-[side=left]:dy-slide-in-from-right-2 data-[side=right]:dy-slide-in-from-left-2 data-[side=top]:dy-slide-in-from-bottom-2 dy-origin-[--radix-dropdown-menu-content-transform-origin]",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "dy-relative dy-flex dy-cursor-default dy-select-none dy-items-center dy-gap-2 dy-rounded-sm dy-px-2 dy-py-1.5 dy-text-sm dy-outline-none dy-transition-colors focus:dy-bg-accent focus:dy-text-accent-foreground data-[disabled]:dy-pointer-events-none data-[disabled]:dy-opacity-50 [&_svg]:dy-pointer-events-none [&_svg]:dy-size-4 [&_svg]:dy-shrink-0",
      inset && "dy-pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "dy-relative dy-flex dy-cursor-default dy-select-none dy-items-center dy-rounded-sm dy-py-1.5 dy-pl-8 dy-pr-2 dy-text-sm dy-outline-none dy-transition-colors focus:dy-bg-accent focus:dy-text-accent-foreground data-[disabled]:dy-pointer-events-none data-[disabled]:dy-opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="dy-absolute dy-left-2 dy-flex dy-h-3.5 dy-w-3.5 dy-items-center dy-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="dy-h-4 dy-w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "dy-relative dy-flex dy-cursor-default dy-select-none dy-items-center dy-rounded-sm dy-py-1.5 dy-pl-8 dy-pr-2 dy-text-sm dy-outline-none dy-transition-colors focus:dy-bg-accent focus:dy-text-accent-foreground data-[disabled]:dy-pointer-events-none data-[disabled]:dy-opacity-50",
      className
    )}
    {...props}
  >
    <span className="dy-absolute dy-left-2 dy-flex dy-h-3.5 dy-w-3.5 dy-items-center dy-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="dy-h-2 dy-w-2 dy-fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "dy-px-2 dy-py-1.5 dy-text-sm dy-font-semibold",
      inset && "dy-pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("dy--mx-1 dy-my-1 dy-h-px dy-bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("dy-ml-auto dy-text-xs dy-tracking-widest dy-opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
