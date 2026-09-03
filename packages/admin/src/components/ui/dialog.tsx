"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"
import { useAdminTheme } from "../../hooks/use-admin-theme"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "dy-fixed dy-inset-0 dy-z-50 dy-bg-black/40 dy-backdrop-blur-[2px] data-[state=open]:dy-animate-in data-[state=closed]:dy-animate-out data-[state=closed]:dy-fade-out-0 data-[state=open]:dy-fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { resolvedTheme, themeClassName } = useAdminTheme()

  return (
    <DialogPortal>
      <div className={themeClassName} data-theme={resolvedTheme}>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "dy-fixed dy-z-50 dy-grid dy-w-full dy-gap-4 dy-border dy-bg-background dy-p-6 dy-shadow-2xl dy-duration-200",
            // Mobile: bottom sheet style, pinned to bottom, rounded top
            "max-sm:dy-bottom-0 max-sm:dy-left-0 max-sm:dy-right-0 max-sm:dy-top-auto max-sm:dy-max-h-[92dvh] max-sm:dy-max-w-none max-sm:dy-rounded-t-2xl max-sm:dy-rounded-b-none max-sm:dy-border-b-0 max-sm:dy-translate-x-0 max-sm:dy-translate-y-0",
            "max-sm:data-[state=open]:dy-slide-in-from-bottom max-sm:data-[state=closed]:dy-slide-out-to-bottom",
            // Desktop: centered modal
            "sm:dy-left-[50%] sm:dy-top-[50%] sm:dy-max-w-lg sm:dy-translate-x-[-50%] sm:dy-translate-y-[-50%] sm:dy-max-h-[90vh] sm:dy-rounded-xl",
            "sm:data-[state=open]:dy-zoom-in-95 sm:data-[state=closed]:dy-zoom-out-95 sm:data-[state=open]:dy-slide-in-from-left-1/2 sm:data-[state=open]:dy-slide-in-from-top-[48%] sm:data-[state=closed]:dy-slide-out-to-left-1/2 sm:data-[state=closed]:dy-slide-out-to-top-[48%]",
            "data-[state=open]:dy-animate-in data-[state=closed]:dy-animate-out data-[state=closed]:dy-fade-out-0 data-[state=open]:dy-fade-in-0",
            className
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="dy-absolute dy-right-4 dy-top-4 dy-rounded-sm dy-opacity-70 dy-ring-offset-background dy-transition-opacity hover:dy-opacity-100 focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-ring focus:dy-ring-offset-2 disabled:dy-pointer-events-none data-[state=open]:dy-bg-accent data-[state=open]:dy-text-muted-foreground">
            <X className="dy-h-4 dy-w-4" />
            <span className="dy-sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "dy-flex dy-flex-col dy-space-y-1.5 dy-text-center sm:dy-text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
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
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "dy-text-lg dy-font-semibold dy-leading-none dy-tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("dy-text-sm dy-text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
