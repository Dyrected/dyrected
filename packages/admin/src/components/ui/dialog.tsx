"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "../../lib/utils"

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
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "dy-fixed dy-left-[50%] dy-top-[50%] dy-z-50 dy-grid dy-w-full dy-max-w-lg dy-translate-x-[-50%] dy-translate-y-[-50%] dy-gap-4 dy-border dy-bg-white dy-p-6 dy-shadow-2xl dy-duration-200 data-[state=open]:dy-animate-in data-[state=closed]:dy-animate-out data-[state=closed]:dy-fade-out-0 data-[state=open]:dy-fade-in-0 data-[state=closed]:dy-zoom-out-95 data-[state=open]:dy-zoom-in-95 data-[state=closed]:dy-slide-out-to-left-1/2 data-[state=closed]:dy-slide-out-to-top-[48%] data-[state=open]:dy-slide-in-from-left-1/2 data-[state=open]:dy-slide-in-from-top-[48%] sm:dy-rounded-xl",
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
  </DialogPortal>
))
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
