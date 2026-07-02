import logo from "@/assets/dyrected.svg"
import { cn } from "../../lib/utils"

/**
 * A single, calm, branded full-screen loading state used everywhere the admin
 * is bootstrapping (initial mount + auth resolution). Keeping one consistent
 * splash — instead of a sequence of differently-worded loaders — makes the cold
 * load feel like one smooth step rather than several flashes.
 *
 * Assumes it renders inside a themed `.dy-admin-ui` ancestor so the tokens
 * (`--background`, `--foreground`, `--primary`) resolve for both light and dark.
 */
export function AdminSplash({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "dy-flex dy-h-screen dy-w-full dy-items-center dy-justify-center dy-bg-background",
        className
      )}
    >
      <div className="dy-flex dy-flex-col dy-items-center dy-gap-6">
        <img
          src={logo}
          alt="Dyrected"
          className="dy-h-9 dy-w-auto dy-animate-[dy-splash-breathe_1.8s_ease-in-out_infinite]"
        />
        <div className="dy-h-[3px] dy-w-28 dy-overflow-hidden dy-rounded-full dy-bg-muted">
          <div className="dy-h-full dy-w-1/2 dy-rounded-full dy-bg-primary dy-animate-[dy-splash-slide_1.2s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  )
}
