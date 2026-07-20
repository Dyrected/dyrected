import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { ScrollArea } from "../ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet"
import { cn } from "../../lib/utils"
import type { CompareCard, CompareMediaPreview, DraftLiveComparison } from "../../lib/draft-live-compare"

function statusBadgeClass(status: CompareCard["status"]) {
  if (status === "Added") return "dy-bg-emerald-50 dy-text-emerald-700 dy-border-emerald-200"
  if (status === "Removed") return "dy-bg-rose-50 dy-text-rose-700 dy-border-rose-200"
  return "dy-bg-amber-50 dy-text-amber-700 dy-border-amber-200"
}

export function DraftLiveCompareSheet({
  open,
  onOpenChange,
  comparison,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  comparison: DraftLiveComparison
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="dy-w-[96vw] sm:dy-max-w-4xl lg:dy-max-w-6xl dy-border-l dy-border-border/60"
      >
        <SheetHeader className="dy-border-b dy-border-border/50 dy-bg-background/95 dy-px-6 dy-py-5 dy-backdrop-blur">
          <div className="dy-flex dy-flex-wrap dy-items-start dy-justify-between dy-gap-4">
            <div className="dy-space-y-1">
              <SheetTitle className="dy-text-2xl dy-font-serif dy-font-bold dy-tracking-tight">
                Compare draft to live
              </SheetTitle>
              <SheetDescription>
                These changes are in your draft and are not live yet.
              </SheetDescription>
            </div>
            <div className="dy-flex dy-flex-wrap dy-gap-2">
              <SummaryChip label={`${comparison.fieldChangeCount} fields changed`} />
              <SummaryChip label={`${comparison.sectionsAdded} sections added`} />
              <SummaryChip label={`${comparison.sectionsRemoved} sections removed`} />
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="dy-h-[calc(100vh-132px)]">
          <div className="dy-space-y-8 dy-p-6">
            {!comparison.hasChanges && (
              <Card className="dy-rounded-2xl dy-border-border/60">
                <CardContent className="dy-p-8 dy-text-center">
                  <p className="dy-text-base dy-font-semibold dy-text-foreground">Draft matches the live site.</p>
                  <p className="dy-mt-2 dy-text-sm dy-text-muted-foreground">
                    There are no unpublished changes in this document right now.
                  </p>
                </CardContent>
              </Card>
            )}

            {comparison.groups.map((group) => (
              <section key={group.title} className="dy-space-y-4">
                <div className="dy-flex dy-items-center dy-justify-between">
                  <div>
                    <h3 className="dy-text-sm dy-font-bold dy-uppercase dy-tracking-[0.18em] dy-text-muted-foreground/70">
                      {group.title}
                    </h3>
                    <p className="dy-mt-1 dy-text-sm dy-text-muted-foreground">
                      {group.cards.length} {group.cards.length === 1 ? "change" : "changes"}
                    </p>
                  </div>
                </div>
                <div className="dy-space-y-4">
                  {group.cards.map((card) => (
                    <ChangeCard key={card.id} card={card} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function SummaryChip({ label }: { label: string }) {
  return (
    <div className="dy-rounded-full dy-border dy-border-border/60 dy-bg-muted/40 dy-px-3 dy-py-1.5 dy-text-xs dy-font-semibold dy-text-foreground/80">
      {label}
    </div>
  )
}

function ChangeCard({ card }: { card: CompareCard }) {
  return (
    <Card className="dy-overflow-hidden dy-rounded-2xl dy-border-border/60">
      <CardHeader className="dy-gap-3 dy-border-b dy-border-border/50 dy-bg-muted/20 dy-px-5 dy-py-4">
        <div className="dy-flex dy-flex-wrap dy-items-center dy-justify-between dy-gap-3">
          <div>
            <CardTitle className="dy-text-base dy-font-semibold">{card.label}</CardTitle>
            <p className="dy-mt-1 dy-text-xs dy-text-muted-foreground">{card.path}</p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "dy-rounded-full dy-border dy-px-2.5 dy-py-1 dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-[0.18em]",
              statusBadgeClass(card.status),
            )}
          >
            {card.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="dy-grid dy-gap-4 dy-p-5 lg:dy-grid-cols-2">
        <CompareSide
          title="Live"
          text={card.liveText}
          media={card.liveMedia}
        />
        <CompareSide
          title="Draft"
          text={card.draftText}
          media={card.draftMedia}
          emphasize
        />
      </CardContent>
    </Card>
  )
}

function CompareSide({
  title,
  text,
  media,
  emphasize = false,
}: {
  title: string
  text: string
  media?: CompareMediaPreview | null
  emphasize?: boolean
}) {
  return (
    <div
      className={cn(
        "dy-space-y-3 dy-rounded-2xl dy-border dy-p-4",
        emphasize
          ? "dy-border-primary/20 dy-bg-primary/5"
          : "dy-border-border/60 dy-bg-background",
      )}
    >
      <div className="dy-flex dy-items-center dy-justify-between">
        <p className="dy-text-[11px] dy-font-bold dy-uppercase dy-tracking-[0.18em] dy-text-muted-foreground/70">
          {title}
        </p>
      </div>
      {media && <MediaPreview media={media} />}
      <div className="dy-rounded-xl dy-bg-muted/35 dy-p-3">
        <p className="dy-whitespace-pre-wrap dy-break-words dy-text-sm dy-leading-6 dy-text-foreground/90">
          {text}
        </p>
      </div>
    </div>
  )
}

function MediaPreview({ media }: { media: CompareMediaPreview }) {
  return (
    <div className="dy-flex dy-gap-3">
      <div className="dy-flex dy-h-20 dy-w-20 dy-shrink-0 dy-items-center dy-justify-center dy-overflow-hidden dy-rounded-xl dy-border dy-border-border/60 dy-bg-muted/30">
        {media.url ? (
          <img
            src={media.url}
            alt={media.alt || media.filename || "Media preview"}
            className="dy-h-full dy-w-full dy-object-cover"
          />
        ) : (
          <div className="dy-text-[11px] dy-font-semibold dy-text-muted-foreground">No preview</div>
        )}
      </div>
      <div className="dy-min-w-0 dy-space-y-1">
        {media.filename && <p className="dy-text-sm dy-font-semibold dy-text-foreground dy-break-all">{media.filename}</p>}
        {media.alt && <p className="dy-text-xs dy-text-muted-foreground">{media.alt}</p>}
        {media.url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="dy-h-auto dy-justify-start dy-p-0 dy-text-xs dy-text-primary hover:dy-bg-transparent hover:dy-text-primary/80"
            onClick={() => window.open(media.url!, "_blank", "noopener,noreferrer")}
          >
            Open asset
          </Button>
        )}
      </div>
    </div>
  )
}
