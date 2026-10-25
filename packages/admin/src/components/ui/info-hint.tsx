import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { Info, X } from "lucide-react"

import { cn } from "../../lib/utils"
import { useAdminTheme } from "../../hooks/use-admin-theme"
import { useHoverCapable } from "../../hooks/use-hover-capable"
import { hasInlineLink, InlineMarkdown } from "../../lib/inline-markdown"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "./sheet"

/** One extra explanation shown under the main one, such as a breakdown row of a metric. */
export interface InfoHintItem {
  label: string
  description: string
}

export interface InfoHintProps {
  /** Name of the thing being explained. Used as the sheet title and the button's accessible name. */
  title: string
  /** Explanation text. Supports `**bold**`, `*italic*`, `` `code` `` and `[links](https://…)`. */
  description?: string
  /** Further explanations listed under the description. */
  items?: InfoHintItem[]
  className?: string
}

/**
 * The explanation itself: the main text, then a "Breakdown" list when rows have their own notes.
 * `sheet` is sized for reading on a phone; `tooltip` is compact for hovering.
 */
function HintBody({
  description,
  items,
  variant,
}: Pick<InfoHintProps, "description" | "items"> & { variant: "sheet" | "tooltip" }) {
  const sheet = variant === "sheet"
  const hasItems = Boolean(items && items.length > 0)

  return (
    <div className={cn(sheet ? "dy-space-y-4" : "dy-space-y-2")}>
      {description && (
        <p className={cn(sheet ? "dy-text-[15px] dy-leading-6 dy-text-foreground" : "dy-text-xs dy-leading-5")}>
          <InlineMarkdown text={description} />
        </p>
      )}
      {hasItems && (
        <div className={cn(description && "dy-border-t dy-border-border/60", description && (sheet ? "dy-pt-4" : "dy-pt-2"))}>
          {description && (
            <p
              className={cn(
                "dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground",
                sheet ? "dy-mb-3 dy-text-[11px]" : "dy-mb-1.5 dy-text-[10px]",
              )}
            >
              Breakdown
            </p>
          )}
          <dl className={cn(sheet ? "dy-space-y-3" : "dy-space-y-1.5")}>
            {items!.map((item) => (
              <div key={`${item.label}:${item.description}`}>
                <dt className={cn("dy-font-semibold dy-text-foreground", sheet ? "dy-text-sm" : "dy-text-xs")}>
                  {item.label}
                </dt>
                <dd
                  className={cn(
                    "dy-text-muted-foreground",
                    sheet ? "dy-mt-0.5 dy-text-sm dy-leading-relaxed" : "dy-text-xs dy-leading-5",
                  )}
                >
                  <InlineMarkdown text={item.description} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

/**
 * A small "i" button that explains what a number or label means.
 *
 * - Mouse and trackpad: a tooltip on hover or keyboard focus. If the text contains a link, the
 *   explanation opens on click instead, because a tooltip closes as the pointer moves toward it.
 * - Touch screens: tapping opens a sheet from the bottom of the screen, which is easier to read
 *   and to dismiss than a small popover.
 *
 * The choice follows the input device, not the screen width. Renders nothing when there is
 * nothing to explain. Safe to place inside a clickable card: its events do not reach the card.
 *
 * @example
 * <InfoHint title="Collected" description="Payments **received** in the last `30` days." />
 */
export function InfoHint({ title, description, items, className }: InfoHintProps) {
  const hoverCapable = useHoverCapable()
  const { resolvedTheme, themeClassName } = useAdminTheme()
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const hasContent = Boolean(description?.trim()) || Boolean(items?.length)
  if (!hasContent) return null

  const linkInside = hasInlineLink(description ?? "") || (items ?? []).some((i) => hasInlineLink(i.description))

  // Clicks and key presses inside portaled content (the sheet, its overlay, the popover) still
  // bubble to React parents, such as a clickable metric card. Stop them at this wrapper.
  const isolate = (children: React.ReactNode) => (
    <span
      className="dy-inline-flex dy-items-center"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </span>
  )

  const button = (props: React.ButtonHTMLAttributes<HTMLButtonElement> = {}) => (
    <button
      type="button"
      aria-label={`About ${title}`}
      {...props}
      className={cn(
        "dy-relative dy-inline-flex dy-h-4 dy-w-4 dy-shrink-0 dy-items-center dy-justify-center dy-rounded-full dy-text-current dy-opacity-50 dy-transition-opacity",
        // Invisible padding around the icon so a fingertip can hit it (about 32px square).
        "after:dy-absolute after:-dy-inset-2 after:dy-content-['']",
        "hover:dy-opacity-90 focus-visible:dy-opacity-100 focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring",
        className,
      )}
    >
      <Info className="dy-h-3 dy-w-3" aria-hidden="true" />
    </button>
  )

  if (!hoverCapable) {
    return isolate(
      <>
        {button({ onClick: () => setSheetOpen(true) })}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            hideCloseButton
            className="dy-flex dy-max-h-[85dvh] dy-flex-col dy-rounded-t-2xl dy-border-border/60"
          >
            <div className="dy-flex dy-justify-center dy-pt-2.5" aria-hidden="true">
              <span className="dy-h-1 dy-w-10 dy-rounded-full dy-bg-muted-foreground/30" />
            </div>
            <div className="dy-flex dy-items-start dy-justify-between dy-gap-4 dy-px-5 dy-pb-3 dy-pt-3">
              <SheetTitle className="dy-text-left dy-text-base dy-font-semibold dy-leading-6">{title}</SheetTitle>
              <SheetClose
                className="dy--mr-2 dy--mt-1 dy-inline-flex dy-h-9 dy-w-9 dy-shrink-0 dy-items-center dy-justify-center dy-rounded-full dy-text-muted-foreground dy-transition-colors hover:dy-bg-muted hover:dy-text-foreground focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring"
                aria-label="Close"
              >
                <X className="dy-h-4 dy-w-4" aria-hidden="true" />
              </SheetClose>
            </div>
            <SheetDescription className="dy-sr-only">What {title} means</SheetDescription>
            <div className="dy-overflow-y-auto dy-px-5 dy-pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <HintBody variant="sheet" description={description} items={items} />
            </div>
          </SheetContent>
        </Sheet>
      </>,
    )
  }

  if (linkInside) {
    return isolate(
      <Popover>
        <PopoverTrigger asChild>{button()}</PopoverTrigger>
        <PopoverContent align="start" className="dy-w-80 dy-p-3.5">
          <HintBody variant="tooltip" description={description} items={items} />
        </PopoverContent>
      </Popover>,
    )
  }

  return isolate(
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{button()}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="top"
            align="start"
            sideOffset={6}
            data-theme={resolvedTheme}
            className={cn(
              themeClassName,
              "dy-z-[100] dy-max-w-xs dy-rounded-lg dy-border dy-border-border/60 dy-bg-popover dy-px-3.5 dy-py-3 dy-text-popover-foreground dy-shadow-lg",
            )}
          >
            <HintBody variant="tooltip" description={description} items={items} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>,
  )
}
