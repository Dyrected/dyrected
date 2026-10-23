import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { Info } from "lucide-react"

import { cn } from "../../lib/utils"
import { useAdminTheme } from "../../hooks/use-admin-theme"
import { useHoverCapable } from "../../hooks/use-hover-capable"
import { hasInlineLink, InlineMarkdown } from "../../lib/inline-markdown"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./sheet"

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

function HintBody({ description, items }: Pick<InfoHintProps, "description" | "items">) {
  return (
    <div className="dy-space-y-2 dy-text-sm dy-leading-relaxed">
      {description && (
        <p>
          <InlineMarkdown text={description} />
        </p>
      )}
      {items && items.length > 0 && (
        <ul className="dy-space-y-1.5">
          {items.map((item) => (
            <li key={`${item.label}:${item.description}`}>
              <span className="dy-font-semibold">{item.label}: </span>
              <InlineMarkdown text={item.description} />
            </li>
          ))}
        </ul>
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
        "dy-inline-flex dy-h-4 dy-w-4 dy-shrink-0 dy-items-center dy-justify-center dy-rounded-full dy-text-current dy-opacity-50 dy-transition-opacity",
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
          <SheetContent side="bottom" className="dy-max-h-[70vh] dy-overflow-y-auto dy-rounded-t-xl dy-pb-8">
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription className="dy-sr-only">What {title} means</SheetDescription>
            </SheetHeader>
            <div className="dy-mt-3">
              <HintBody description={description} items={items} />
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
        <PopoverContent align="start" className="dy-w-72 dy-p-3">
          <HintBody description={description} items={items} />
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
              "dy-z-[100] dy-max-w-xs dy-rounded-md dy-border dy-border-border/40 dy-bg-popover dy-px-3 dy-py-2 dy-text-popover-foreground dy-shadow-lg",
            )}
          >
            <HintBody description={description} items={items} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>,
  )
}
