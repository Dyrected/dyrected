// Title: Event Calendar Nav
// Description: Composable navigation - Today, prev/next, period title, view switcher dropdown, and a free toolbar slot.

"use client"

import {
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import {
  useEventCalendarNavigation,
  useEventCalendarSettings,
  useEventCalendarView,
  useEventCalendarViewConfig,
} from "./event-calendar"
import { toZoned } from "./event-calendar-lib"
import type { CalendarView } from "./event-calendar-types"
import { addDays, format } from "date-fns"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "../../../lib/utils"
import { Button } from "../../../components/ui/button"
import { Calendar } from "../../../components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip"
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from "lucide-react"

/** Configured nav button variant/size (viewConfig.navButtonVariant/Size)
 *  plus the shared classNames.navButton hook, merged on every nav button. */
function useNavButtonProps(): {
  variant: "ghost" | "outline" | "secondary" | "default"
  size: "sm" | "default"
  iconSize: "sm" | "icon"
  className: string | undefined
} {
  const viewConfig = useEventCalendarViewConfig()
  return {
    variant: viewConfig.navButtonVariant ?? "outline",
    size: viewConfig.navButtonSize ?? "sm",
    iconSize: viewConfig.navButtonSize === "sm" ? "sm" : "icon",
    className: cn("dy-border-border/50 dy-rounded-lg dy-text-xs", viewConfig.classNames?.navButton),
  }
}

/** Resolved nav tooltip policy (viewConfig.navTooltips + classNames.navTooltip). */
function useNavTooltipConfig(): {
  disabled: boolean
  side: "top" | "bottom" | "left" | "right"
  delay: number
  closeDelay: number
  timeout: number
  className: string | undefined
} {
  const viewConfig = useEventCalendarViewConfig()
  const config =
    viewConfig.navTooltips === false ? undefined : viewConfig.navTooltips
  return {
    disabled: viewConfig.navTooltips === false,
    // the nav sits at the top of the calendar, so tooltips open upward by
    // default (away from the grid); collision flipping still drops them below
    // when there is no room above
    side: config?.side ?? "top",
    delay: config?.delay ?? 600,
    closeDelay: config?.closeDelay ?? 0,
    timeout: config?.timeout ?? 300,
    className: viewConfig.classNames?.navTooltip,
  }
}

type NavButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children?: ReactNode
  /**
   * Tooltip policy (the part that usually goes wrong on clickable elements):
   * tooltips appear ONLY on hover or keyboard focus-visible - a pointer click
   * never re-triggers them. Buttons that open overlays (the view switcher)
   * use a hover-only tooltip that is force-closed while the overlay is up and
   * ignores focus, so nothing flashes when focus returns after selection.
   * Icon-only buttons default to their accessible label; Today defaults to
   * the actual current date (info the label doesn't carry). Pass null to
   * disable one, or any node to override; viewConfig.navTooltips=false turns
   * them all off (its object form tunes side/delay/closeDelay/timeout).
   */
  tooltip?: ReactNode | null
  asChild?: boolean
}

/** Hover/focus-visible tooltip wrapper; renders the bare button when disabled
 *  (per-button content=null or viewConfig.navTooltips=false). */
function NavTooltip({
  content,
  children,
}: {
  content: ReactNode | null
  children: React.ReactElement
}) {
  const tooltips = useNavTooltipConfig()
  if (tooltips.disabled || content === null || content === undefined)
    return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={tooltips.side} className={tooltips.className}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

function EventCalendarNavToday({
  className,
  asChild = false,
  children,
  tooltip,
  ...props
}: NavButtonProps) {
  const { today, isToday } = useEventCalendarNavigation()
  const settings = useEventCalendarSettings()
  const nav = useNavButtonProps()
  // display-zone "today", like every other today derivation in the calendar
  // (a system-zone new Date() can name a different day than Today opens)
  const defaultTooltip = format(
    toZoned(new Date(), settings.timeZone),
    settings.i18n.formats.dayTitle,
    { locale: settings.locale }
  )
  return (
    <NavTooltip content={tooltip === undefined ? defaultTooltip : tooltip}>
      <Button
        variant={nav.variant}
        size={nav.size}
        data-slot="event-calendar-nav-today"
        data-active={isToday || undefined}
        className={cn(nav.className, className)}
        onClick={today}
        asChild={asChild}
        {...props}
      >
        {children ?? settings.i18n.labels.today}
      </Button>
    </NavTooltip>
  )
}

function EventCalendarNavPrev({
  className,
  asChild = false,
  children,
  tooltip,
  ...props
}: NavButtonProps) {
  const { prev } = useEventCalendarNavigation()
  const settings = useEventCalendarSettings()
  const nav = useNavButtonProps()
  return (
    <NavTooltip
      content={tooltip === undefined ? settings.i18n.labels.previous : tooltip}
    >
      <Button
        variant={nav.variant}
        size={nav.iconSize}
        data-slot="event-calendar-nav-prev"
        aria-label={settings.i18n.labels.previous}
        className={cn(nav.className, className)}
        onClick={prev}
        asChild={asChild}
        {...props}
      >
        {children ?? (
          <ChevronLeft aria-hidden="true" />
        )}
      </Button>
    </NavTooltip>
  )
}

function EventCalendarNavNext({
  className,
  asChild = false,
  children,
  tooltip,
  ...props
}: NavButtonProps) {
  const { next } = useEventCalendarNavigation()
  const settings = useEventCalendarSettings()
  const nav = useNavButtonProps()
  return (
    <NavTooltip
      content={tooltip === undefined ? settings.i18n.labels.next : tooltip}
    >
      <Button
        variant={nav.variant}
        size={nav.iconSize}
        data-slot="event-calendar-nav-next"
        aria-label={settings.i18n.labels.next}
        className={cn(nav.className, className)}
        onClick={next}
        asChild={asChild}
        {...props}
      >
        {children ?? (
          <ChevronRight aria-hidden="true" />
        )}
      </Button>
    </NavTooltip>
  )
}

interface EventCalendarTitleProps extends HTMLAttributes<HTMLDivElement> {
  format?: (ctx: { title: string }) => ReactNode
  asChild?: boolean
}

function EventCalendarTitle({
  className,
  asChild = false,
  format: formatTitle,
  children,
  ...props
}: EventCalendarTitleProps) {
  const { title } = useEventCalendarNavigation()
  const viewConfig = useEventCalendarViewConfig()
  const Comp = asChild ? Slot : "div"
  return (
    <Comp
      data-slot="event-calendar-title"
      aria-live="polite"
      className={cn(
        "dy-min-w-0 dy-truncate dy-text-sm dy-font-semibold dy-text-foreground dy-tracking-tight",
        viewConfig.classNames?.title,
        className
      )}
      {...props}
    >
      {children ?? formatTitle?.({ title }) ?? title}
    </Comp>
  )
}

interface EventCalendarViewSwitcherProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  children?: ReactNode
  /** Hover/focus-visible hint; defaults to the "Select view" label. Pass
   *  null to disable (overlay-opener policy). */
  tooltip?: ReactNode | null
  asChild?: boolean
}

function EventCalendarViewSwitcher({
  className,
  asChild = false,
  children,
  tooltip,
  ...props
}: EventCalendarViewSwitcherProps) {
  const { view, dayCount, availableViews, setView } = useEventCalendarView()
  const settings = useEventCalendarSettings()
  const viewConfig = useEventCalendarViewConfig()
  const nav = useNavButtonProps()
  const tooltips = useNavTooltipConfig()
  const labels = settings.i18n.labels
  // Controlled open: selecting a view swaps the whole content subtree in the
  // same click, so closing must not depend on the menu's internal handler.
  const [open, setOpen] = useState(false)
  // Hover-only tooltip: when the menu closes, Radix focuses the trigger
  // again and a focus-opened tooltip would flash - ignore focus opens.
  const [tipOpen, setTipOpen] = useState(false)

  const selectView = (v: CalendarView, opts?: { dayCount?: number }) => {
    setOpen(false)
    setView(v, opts)
  }

  const viewLabel = (v: CalendarView) =>
    v === "days"
      ? settings.i18n.viewNames.days(dayCount)
      : settings.i18n.viewNames[v]

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next)
        if (next) setTipOpen(false)
      }}
    >
      {/* Tooltip on an overlay-opener: hover-only (focus opens ignored) and
          force-closed while the menu is up, so it never lingers or flashes
          when focus returns on close. Inherits the nav TooltipProvider's
          delayDuration/skipDelayDuration. */}
      <Tooltip open={tipOpen && !open} onOpenChange={setTipOpen}>
        <DropdownMenuTrigger asChild {...props}>
          {/* opens are hover-only; the trigger-focus open that follows a
              menu close is ignored (prevented before Radix opens), closes
              always land */}
          <TooltipTrigger asChild onFocus={(event) => event.preventDefault()}>
            <Button
              variant={nav.variant}
              size={nav.size}
              data-slot="event-calendar-view-switcher"
              aria-label={labels.selectView}
              className={cn("dy-gap-1", nav.className, className)}
              asChild={asChild}
            >
              {children ?? (
                <>
                  {viewLabel(view)}
                  <ChevronDown aria-hidden="true" />
                </>
              )}
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        {tipOpen && !open && tooltip !== null && !tooltips.disabled && (
          <TooltipContent side={tooltips.side} className={tooltips.className}>
            {tooltip ?? labels.selectView}
          </TooltipContent>
        )}
      </Tooltip>
      <DropdownMenuContent
        align="start"
        className={cn("dy-min-w-44", viewConfig.classNames?.viewSwitcherContent)}
      >
        {/* Keep the label inside the group so it stays associated with its items */}
        <DropdownMenuGroup>
          <DropdownMenuLabel
            className={cn(
              "dy-text-muted-foreground dy-font-normal",
              viewConfig.classNames?.viewSwitcherLabel
            )}
          >
            {settings.i18n.labels.selectView}
          </DropdownMenuLabel>
          {availableViews.map((v) =>
            v === "days" ? (
              viewConfig.dayCountPresets.map((count) => (
                <DropdownMenuItem
                  key={`days-${count}`}
                  data-active={
                    (view === "days" && dayCount === count) || undefined
                  }
                  onClick={() => selectView("days", { dayCount: count })}
                >
                  {settings.i18n.viewNames.days(count)}
                  {/* hint derived from the preset itself, not i18n's default */}
                  {viewConfig.enableShortcuts && (
                    <EventCalendarViewShortcut>
                      {count}
                    </EventCalendarViewShortcut>
                  )}
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem
                key={v}
                data-active={view === v || undefined}
                onClick={() => selectView(v)}
              >
                {viewLabel(v)}
                {viewConfig.enableShortcuts && (
                  <EventCalendarViewShortcut>
                    {labels.viewShortcuts[v]}
                  </EventCalendarViewShortcut>
                )}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Outline key badge; theme-token only, so it adapts to every style. */
function EventCalendarViewShortcut({ children }: { children: ReactNode }) {
  const viewConfig = useEventCalendarViewConfig()
  return (
    <kbd
      data-slot="event-calendar-view-shortcut"
      className={cn(
        "dy-text-muted-foreground dy-ms-auto dy-inline-flex dy-size-5 dy-shrink-0 dy-items-center dy-justify-center dy-rounded-sm dy-border dy-font-sans dy-text-xs",
        viewConfig.classNames?.viewShortcut
      )}
    >
      {children}
    </kbd>
  )
}

interface EventCalendarDatePickerProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  children?: ReactNode
  /** "auto" (default) resolves per view: range for week/N-days/agenda. */
  mode?: "auto" | "single" | "range"
  /** Hover/focus-visible hint; defaults to null - no tooltip, because the
   *  button opens an overlay (see the NavButtonProps tooltip policy). */
  tooltip?: ReactNode | null
  asChild?: boolean
}

/** Views whose period reads better as a highlighted range. */
const RANGE_VIEWS: CalendarView[] = ["week", "days", "agenda"]

/**
 * Optional go-to-date picker (shadcn Calendar in a popover), view-aware:
 * week/N-days/agenda highlight the whole active range (any click re-anchors
 * the period), other views select a single date. Not part of the default
 * nav - compose it yourself (or any external picker driving
 * useEventCalendarNavigation().goTo). No tooltip by default: it opens an
 * overlay (see the NavButtonProps tooltip policy); pass `tooltip` to opt in.
 */
function EventCalendarDatePicker({
  className,
  asChild = false,
  children,
  tooltip = null,
  mode,
  ...props
}: EventCalendarDatePickerProps) {
  const { date, goTo, activeRange } = useEventCalendarNavigation()
  const { view } = useEventCalendarView()
  const settings = useEventCalendarSettings()
  const viewConfig = useEventCalendarViewConfig()
  const nav = useNavButtonProps()
  const [open, setOpen] = useState(false)
  const zoned = toZoned(date, settings.timeZone)

  const configured = mode ?? "auto"
  const resolved =
    configured === "auto"
      ? RANGE_VIEWS.includes(view)
        ? "range"
        : "single"
      : configured

  const pick = (next: Date | undefined) => {
    if (!next) return
    goTo(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <NavTooltip content={tooltip}>
        <PopoverTrigger asChild {...props}>
          <Button
            variant={nav.variant}
            size={nav.iconSize}
            data-slot="event-calendar-date-picker"
            data-mode={resolved}
            aria-label={settings.i18n.labels.goToDate}
            className={cn(nav.className, className)}
            asChild={asChild}
          >
            {children ?? (
              <CalendarIcon aria-hidden="true" />
            )}
          </Button>
        </PopoverTrigger>
      </NavTooltip>
      <PopoverContent
        align="start"
        className={cn("dy-w-auto dy-p-0!", viewConfig.classNames?.datePickerContent)}
      >
        {resolved === "range" ? (
          <Calendar
            mode="range"
            selected={{
              from: toZoned(activeRange.start, settings.timeZone),
              to: toZoned(addDays(activeRange.end, -1), settings.timeZone),
            }}
            defaultMonth={zoned}
            onDayClick={pick}
            locale={settings.locale}
            weekStartsOn={settings.weekStartsOn}
          />
        ) : (
          <Calendar
            mode="single"
            selected={zoned}
            defaultMonth={zoned}
            onSelect={pick}
            locale={settings.locale}
            weekStartsOn={settings.weekStartsOn}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

interface EventCalendarToolbarProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

/** Free slot for consumer toolbar buttons; pure layout shell. */
function EventCalendarToolbar({
  className,
  asChild = false,
  children,
  ...props
}: EventCalendarToolbarProps) {
  const viewConfig = useEventCalendarViewConfig()
  const Comp = asChild ? Slot : "div"
  return (
    <Comp
      data-slot="event-calendar-toolbar"
      className={cn(
        "dy-flex dy-items-center dy-gap-2",
        viewConfig.classNames?.toolbar,
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}

interface EventCalendarNavProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Render the view switcher in the composed layout. Turn off when the
   * calendar ships with a fixed view (e.g. a month-only embed) and users
   * should not be able to change it.
   * @default true
   */
  showViewSwitcher?: boolean
  asChild?: boolean
}

/**
 * Default composed nav: Today, prev/next, title, spacer, view switcher.
 * Pass children to use it as a pure layout shell instead.
 */
function EventCalendarNav({
  className,
  asChild = false,
  children,
  showViewSwitcher = true,
  ...props
}: EventCalendarNavProps) {
  const viewConfig = useEventCalendarViewConfig()
  const tooltips = useNavTooltipConfig()
  const Comp = asChild ? Slot : "div"
  return (
    <Comp
      data-slot="event-calendar-nav"
      className={cn(
        "dy-flex dy-min-w-0 dy-flex-wrap dy-items-center dy-gap-2 dy-px-4 dy-py-3 dy-border-b dy-border-border/40 dy-bg-muted/10",
        viewConfig.stickyNav && "dy-bg-background dy-sticky dy-top-0 dy-z-30",
        viewConfig.classNames?.nav,
        className
      )}
      {...props}
    >
      {children ?? (
        // Shared provider: first tooltip waits, moving between buttons is instant
        <TooltipProvider
          delayDuration={tooltips.delay}
          skipDelayDuration={tooltips.timeout}
        >
          <EventCalendarNavToday />
          {showViewSwitcher && <EventCalendarViewSwitcher />}
          <div className="dy-flex dy-items-center dy-gap-0.5 dy-rounded-lg dy-border dy-border-border/50 dy-bg-card dy-p-0.5">
            <EventCalendarNavPrev className="dy-h-7 dy-w-7 dy-rounded-md dy-border-0" />
            <EventCalendarNavNext className="dy-h-7 dy-w-7 dy-rounded-md dy-border-0" />
          </div>
          {/* ms-3 sets the title apart from the tight control cluster so the
              period reads as its own group, not another button */}
          <EventCalendarTitle className="dy-ms-3" />
          <div className="dy-grow" />
        </TooltipProvider>
      )}
    </Comp>
  )
}

export {
  EventCalendarDatePicker,
  EventCalendarNav,
  EventCalendarNavNext,
  EventCalendarNavPrev,
  EventCalendarNavToday,
  EventCalendarTitle,
  EventCalendarToolbar,
  EventCalendarViewSwitcher,
}
export type {
  EventCalendarNavProps,
  EventCalendarTitleProps,
  EventCalendarToolbarProps,
  EventCalendarViewSwitcherProps,
}