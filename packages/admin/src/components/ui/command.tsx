import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "../../lib/utils"
import { Dialog, DialogContent } from "../../components/ui/dialog"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "dy-flex dy-h-full dy-w-full dy-flex-col dy-overflow-hidden dy-rounded-md dy-bg-popover dy-text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandDialog = ({ children, ...props }: DialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="dy-overflow-hidden dy-p-0 dy-shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:dy-px-2 [&_[cmdk-group-heading]]:dy-font-medium [&_[cmdk-group-heading]]:dy-text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:dy-pt-0 [&_[cmdk-group]]:dy-px-2 [&_[cmdk-input-wrapper]_svg]:dy-h-5 [&_[cmdk-input-wrapper]_svg]:dy-w-5 [&_[cmdk-input]]:dy-h-12 [&_[cmdk-item]]:dy-px-2 [&_[cmdk-item]]:dy-py-3 [&_[cmdk-item]_svg]:dy-h-5 [&_[cmdk-item]_svg]:dy-w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="dy-flex dy-items-center dy-border-b dy-px-3" cmdk-input-wrapper="">
    <Search className="dy-mr-2 dy-h-4 dy-w-4 dy-shrink-0 dy-opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "dy-flex dy-h-11 dy-w-full dy-rounded-md dy-bg-transparent dy-py-3 dy-text-sm dy-outline-none placeholder:dy-text-muted-foreground disabled:dy-cursor-not-allowed disabled:dy-opacity-50",
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("dy-max-h-[300px] dy-overflow-y-auto dy-overflow-x-hidden", className)}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="dy-py-6 dy-text-center dy-text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "dy-overflow-hidden dy-p-1 dy-text-foreground [&_[cmdk-group-heading]]:dy-px-2 [&_[cmdk-group-heading]]:dy-py-1.5 [&_[cmdk-group-heading]]:dy-text-xs [&_[cmdk-group-heading]]:dy-font-medium [&_[cmdk-group-heading]]:dy-text-muted-foreground",
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("dy--mx-1 dy-h-px dy-bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "dy-relative dy-flex dy-cursor-default dy-gap-2 dy-select-none dy-items-center dy-rounded-sm dy-px-2 dy-py-1.5 dy-text-sm dy-outline-none data-[disabled=true]:dy-pointer-events-none data-[selected='true']:dy-bg-accent data-[selected=true]:dy-text-accent-foreground data-[disabled=true]:dy-opacity-50 [&_svg]:dy-pointer-events-none [&_svg]:dy-size-4 [&_svg]:dy-shrink-0",
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "dy-ml-auto dy-text-xs dy-tracking-widest dy-text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
