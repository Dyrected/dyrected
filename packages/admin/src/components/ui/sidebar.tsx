"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "../../hooks/use-mobile"
import { cn } from "../../lib/utils"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Separator } from "../../components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet"
import { Skeleton } from "../../components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)

    // This is the internal state of the sidebar.
    // We use openProp and setOpenProp for control from outside the component.
    const [_open, _setOpen] = React.useState(defaultOpen)
    const open = openProp ?? _open
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          _setOpen(openState)
        }

        // This sets the cookie to keep the sidebar state.
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      },
      [setOpenProp, open]
    )

    // Helper to toggle the sidebar.
    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open)
    }, [isMobile, setOpen, setOpenMobile])

    // Adds a keyboard shortcut to toggle the sidebar.
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    // We add a state so that we can do data-state="expanded" or "collapsed".
    // This makes it easier to style the sidebar with Tailwind classes.
    const state = open ? "expanded" : "collapsed"

    const contextValue = React.useMemo<SidebarContextProps>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "dy-group/sidebar-wrapper dy-flex dy-min-h-svh dy-w-full has-[[data-variant=inset]]:dy-bg-sidebar",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right"
    variant?: "sidebar" | "floating" | "inset"
    collapsible?: "offcanvas" | "icon" | "none"
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

    if (collapsible === "none") {
      return (
        <div
          className={cn(
            "dy-flex dy-h-full dy-w-[--sidebar-width] dy-flex-col dy-bg-sidebar dy-text-sidebar-foreground",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      )
    }

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            data-sidebar="sidebar"
            data-mobile="true"
            className="dy-w-[--sidebar-width] dy-bg-sidebar dy-p-0 dy-text-sidebar-foreground [&>button]:dy-hidden"
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
            side={side}
          >
            <SheetHeader className="dy-sr-only">
              <SheetTitle>Sidebar</SheetTitle>
              <SheetDescription>Displays the mobile sidebar.</SheetDescription>
            </SheetHeader>
            <div className="dy-flex dy-h-full dy-w-full dy-flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      )
    }

    return (
      <div
        ref={ref}
        className="dy-group dy-peer dy-hidden dy-text-sidebar-foreground md:dy-block"
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
      >
        {/* This is what handles the sidebar gap on desktop */}
        <div
          className={cn(
            "dy-relative dy-w-[--sidebar-width] dy-bg-transparent dy-transition-[width] dy-duration-200 dy-ease-linear",
            "dy-group-data-[collapsible=offcanvas]:dy-w-0",
            "dy-group-data-[side=right]:dy-rotate-180",
            variant === "floating" || variant === "inset"
              ? "group-data-[collapsible=icon]:dy-w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
              : "group-data-[collapsible=icon]:dy-w-[--sidebar-width-icon]"
          )}
        />
        <div
          className={cn(
            "dy-fixed dy-inset-y-0 dy-z-10 dy-hidden dy-h-svh dy-w-[--sidebar-width] dy-transition-[left,right,width] dy-duration-200 dy-ease-linear md:dy-flex",
            side === "left"
              ? "dy-left-0 group-data-[collapsible=offcanvas]:dy-left-[calc(var(--sidebar-width)*-1)]"
              : "dy-right-0 group-data-[collapsible=offcanvas]:dy-right-[calc(var(--sidebar-width)*-1)]",
            // Adjust the padding for floating and inset variants.
            variant === "floating" || variant === "inset"
              ? "dy-p-2 group-data-[collapsible=icon]:dy-w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
              : "group-data-[collapsible=icon]:dy-w-[--sidebar-width-icon] group-data-[side=left]:dy-border-r group-data-[side=right]:dy-border-l",
            className
          )}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className="dy-flex dy-h-full dy-w-full dy-flex-col dy-bg-sidebar dy-group-data-[variant=floating]:dy-rounded-lg dy-group-data-[variant=floating]:dy-border dy-group-data-[variant=floating]:dy-border-sidebar-border dy-group-data-[variant=floating]:dy-shadow"
          >
            {children}
          </div>
        </div>
      </div>
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("dy-h-7 dy-w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft />
      <span className="dy-sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "dy-absolute dy-inset-y-0 dy-z-20 dy-hidden dy-w-4 dy--translate-x-1/2 dy-transition-all dy-ease-linear after:dy-absolute after:dy-inset-y-0 after:dy-left-1/2 after:dy-w-[2px] hover:after:dy-bg-sidebar-border dy-group-data-[side=left]:dy--right-4 dy-group-data-[side=right]:dy-left-0 sm:dy-flex",
        "[[data-side=left]_&]:dy-cursor-w-resize [[data-side=right]_&]:dy-cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:dy-cursor-e-resize [[data-side=right][data-state=collapsed]_&]:dy-cursor-w-resize",
        "dy-group-data-[collapsible=offcanvas]:dy-translate-x-0 dy-group-data-[collapsible=offcanvas]:after:dy-left-full dy-group-data-[collapsible=offcanvas]:hover:dy-bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:dy--right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:dy--left-2",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, ...props }, ref) => {
  return (
    <main
      ref={ref}
      className={cn(
        "dy-relative dy-flex dy-w-full dy-flex-1 dy-flex-col dy-bg-background",
        "md:dy-peer-data-[variant=inset]:dy-m-2 md:dy-peer-data-[state=collapsed]:dy-peer-data-[variant=inset]:dy-ml-2 md:dy-peer-data-[variant=inset]:dy-ml-0 md:dy-peer-data-[variant=inset]:dy-rounded-xl md:dy-peer-data-[variant=inset]:dy-shadow",
        className
      )}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-sidebar="input"
      className={cn(
        "dy-h-8 dy-w-full dy-bg-background dy-shadow-none focus-visible:dy-ring-2 focus-visible:dy-ring-sidebar-ring",
        className
      )}
      {...props}
    />
  )
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("dy-flex dy-flex-col dy-gap-2 dy-p-2", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn("dy-flex dy-flex-col dy-gap-2 dy-p-2", className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("dy-mx-2 dy-w-auto dy-bg-sidebar-border", className)}
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "dy-flex dy-min-h-0 dy-flex-1 dy-flex-col dy-gap-2 dy-overflow-auto dy-group-data-[collapsible=icon]:dy-overflow-hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("dy-relative dy-flex dy-w-full dy-min-w-0 dy-flex-col dy-p-2", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "dy-flex dy-h-8 dy-shrink-0 dy-items-center dy-rounded-md dy-px-2 dy-text-xs dy-font-medium dy-text-sidebar-foreground/70 dy-outline-none dy-ring-sidebar-ring dy-transition-[margin,opacity] dy-duration-200 dy-ease-linear focus-visible:dy-ring-2 [&>svg]:dy-size-4 [&>svg]:dy-shrink-0",
        "dy-group-data-[collapsible=icon]:dy--mt-8 dy-group-data-[collapsible=icon]:dy-opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "dy-absolute dy-right-3 dy-top-3.5 dy-flex dy-aspect-square dy-w-5 dy-items-center dy-justify-center dy-rounded-md dy-p-0 dy-text-sidebar-foreground dy-outline-none dy-ring-sidebar-ring dy-transition-transform hover:dy-bg-sidebar-accent hover:dy-text-sidebar-accent-foreground focus-visible:dy-ring-2 [&>svg]:dy-size-4 [&>svg]:dy-shrink-0",
        // Increases the hit area of the button on mobile.
        "after:dy-absolute after:dy--inset-2 after:md:dy-hidden",
        "dy-group-data-[collapsible=icon]:dy-hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("dy-w-full dy-text-sm", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("dy-flex dy-w-full dy-min-w-0 dy-flex-col dy-gap-1", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("dy-group/menu-item dy-relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(
  "dy-peer/menu-button dy-flex dy-w-full dy-items-center dy-gap-2 dy-overflow-hidden dy-rounded-md dy-p-2 dy-text-left dy-text-sm dy-outline-none dy-ring-sidebar-ring dy-transition-[width,height,padding] hover:dy-bg-sidebar-accent hover:dy-text-sidebar-accent-foreground focus-visible:dy-ring-2 active:dy-bg-sidebar-accent active:dy-text-sidebar-accent-foreground disabled:dy-pointer-events-none disabled:dy-opacity-50 dy-group-has-[[data-sidebar=menu-action]]/menu-item:dy-pr-8 aria-disabled:dy-pointer-events-none aria-disabled:dy-opacity-50 data-[active=true]:dy-bg-sidebar-accent data-[active=true]:dy-font-medium data-[active=true]:dy-text-sidebar-accent-foreground data-[state=open]:hover:dy-bg-sidebar-accent data-[state=open]:hover:dy-text-sidebar-accent-foreground dy-group-data-[collapsible=icon]:dy-!size-8 dy-group-data-[collapsible=icon]:dy-!p-2 [&>span:last-child]:dy-truncate [&>svg]:dy-size-4 [&>svg]:dy-shrink-0",
  {
    variants: {
      variant: {
        default: "hover:dy-bg-sidebar-accent hover:dy-text-sidebar-accent-foreground",
        outline:
          "dy-bg-background dy-shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:dy-bg-sidebar-accent hover:dy-text-sidebar-accent-foreground hover:dy-shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "dy-h-8 dy-text-sm",
        sm: "dy-h-7 dy-text-xs",
        lg: "dy-h-12 dy-text-sm group-data-[collapsible=icon]:!dy-p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const { isMobile, state } = useSidebar()

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    )

    if (!tooltip) {
      return button
    }

    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
      }
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltip}
        />
      </Tooltip>
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    showOnHover?: boolean
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "dy-absolute dy-right-1 dy-top-1.5 dy-flex dy-aspect-square dy-w-5 dy-items-center dy-justify-center dy-rounded-md dy-p-0 dy-text-sidebar-foreground dy-outline-none dy-ring-sidebar-ring dy-transition-transform hover:dy-bg-sidebar-accent hover:dy-text-sidebar-accent-foreground focus-visible:dy-ring-2 dy-peer-hover/menu-button:dy-text-sidebar-accent-foreground [&>svg]:dy-size-4 [&>svg]:dy-shrink-0",
        // Increases the hit area of the button on mobile.
        "after:dy-absolute after:dy--inset-2 after:md:dy-hidden",
        "dy-peer-data-[size=sm]/menu-button:dy-top-1",
        "dy-peer-data-[size=default]/menu-button:dy-top-1.5",
        "dy-peer-data-[size=lg]/menu-button:dy-top-2.5",
        "dy-group-data-[collapsible=icon]:dy-hidden",
        showOnHover &&
          "dy-group-focus-within/menu-item:dy-opacity-100 dy-group-hover/menu-item:dy-opacity-100 data-[state=open]:dy-opacity-100 dy-peer-data-[active=true]/menu-button:dy-text-sidebar-accent-foreground md:dy-opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "dy-pointer-events-none dy-absolute dy-right-1 dy-flex dy-h-5 dy-min-w-5 dy-select-none dy-items-center dy-justify-center dy-rounded-md dy-px-1 dy-text-xs dy-font-medium dy-tabular-nums dy-text-sidebar-foreground",
      "dy-peer-hover/menu-button:dy-text-sidebar-accent-foreground dy-peer-data-[active=true]/menu-button:dy-text-sidebar-accent-foreground",
      "dy-peer-data-[size=sm]/menu-button:dy-top-1",
      "dy-peer-data-[size=default]/menu-button:dy-top-1.5",
      "dy-peer-data-[size=lg]/menu-button:dy-top-2.5",
      "dy-group-data-[collapsible=icon]:dy-hidden",
      className
    )}
    {...props}
  />
))
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => {
  const [width, setWidth] = React.useState("0%")

  React.useEffect(() => {
    // Random width between 50 to 90% set after mount to avoid hydration mismatch
    setWidth(`${Math.floor(Math.random() * 40) + 50}%`)
  }, [])

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("dy-flex dy-h-8 dy-items-center dy-gap-2 dy-rounded-md dy-px-2", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="dy-size-4 dy-rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="dy-h-4 dy-flex-1"
        data-sidebar="menu-skeleton-text"
        style={{ width }}
      />
    </div>
  )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "dy-mx-3.5 dy-flex dy-min-w-0 dy-translate-x-px dy-flex-col dy-gap-1 dy-border-l dy-border-sidebar-border dy-px-2.5 dy-py-0.5",
      "dy-group-data-[collapsible=icon]:dy-hidden",
      className
    )}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean
    size?: "sm" | "md"
    isActive?: boolean
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "dy-flex dy-h-7 dy-min-w-0 dy--translate-x-px dy-items-center dy-gap-2 dy-overflow-hidden dy-rounded-md dy-px-2 dy-text-sidebar-foreground dy-outline-none dy-ring-sidebar-ring hover:dy-bg-sidebar-accent hover:dy-text-sidebar-accent-foreground focus-visible:dy-ring-2 active:dy-bg-sidebar-accent active:dy-text-sidebar-accent-foreground disabled:dy-pointer-events-none disabled:dy-opacity-50 aria-disabled:dy-pointer-events-none aria-disabled:dy-opacity-50 [&>span:last-child]:dy-truncate [&>svg]:dy-size-4 [&>svg]:dy-shrink-0 [&>svg]:dy-text-sidebar-accent-foreground",
        "data-[active=true]:dy-bg-sidebar-accent data-[active=true]:dy-text-sidebar-accent-foreground",
        size === "sm" && "dy-text-xs",
        size === "md" && "dy-text-sm",
        "dy-group-data-[collapsible=icon]:dy-hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}
