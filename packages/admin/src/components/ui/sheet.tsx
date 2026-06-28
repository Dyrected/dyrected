"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"
import { useAdminTheme } from "../../hooks/use-admin-theme"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "dy-fixed dy-inset-0 dy-z-50 dy-bg-black/40 dy-backdrop-blur-[2px] data-[state=open]:dy-animate-in data-[state=closed]:dy-animate-out data-[state=closed]:dy-fade-out-0 data-[state=open]:dy-fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "dy-fixed dy-z-50 dy-gap-4 dy-bg-background dy-p-6 dy-shadow-2xl dy-transition dy-ease-in-out data-[state=open]:dy-animate-in data-[state=closed]:dy-animate-out data-[state=closed]:dy-duration-300 data-[state=open]:dy-duration-500",
  {
    variants: {
      side: {
        top: "dy-inset-x-0 dy-top-0 dy-border-b data-[state=closed]:dy-slide-out-to-top data-[state=open]:dy-slide-in-from-top",
        bottom:
          "dy-inset-x-0 dy-bottom-0 dy-border-t data-[state=closed]:dy-slide-out-to-bottom data-[state=open]:dy-slide-in-from-bottom",
        left: "dy-inset-y-0 dy-left-0 dy-h-full dy-w-3/4 dy-border-r data-[state=closed]:dy-slide-out-to-left data-[state=open]:dy-slide-in-from-left sm:dy-max-w-sm",
        right:
          "dy-inset-y-0 dy-right-0 dy-h-full dy-w-3/4 dy-border-l data-[state=closed]:dy-slide-out-to-right data-[state=open]:dy-slide-in-from-right sm:dy-max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => {
  const { resolvedTheme, themeClassName } = useAdminTheme()

  return (
    <SheetPortal>
      <div className={themeClassName} data-theme={resolvedTheme}>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={ref}
          className={cn(sheetVariants({ side }), className)}
          {...props}
        >
          {children}
          <SheetPrimitive.Close className="dy-absolute dy-right-4 dy-top-4 dy-rounded-sm dy-opacity-70 dy-ring-offset-background dy-transition-opacity hover:dy-opacity-100 focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-ring focus:dy-ring-offset-2 disabled:dy-pointer-events-none data-[state=open]:dy-bg-secondary">
            <X className="dy-h-4 dy-w-4" />
            <span className="dy-sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </div>
    </SheetPortal>
  )
})
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "dy-flex dy-flex-col dy-space-y-2 dy-text-center sm:dy-text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "dy-flex dy-flex-col-reverse sm:dy-flex-row sm:dy-justify-end sm:dy-space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("dy-text-lg dy-font-semibold dy-text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("dy-text-sm dy-text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
