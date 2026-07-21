import { HardDrive, Wrench, ArrowRight } from "lucide-react"
import { Button } from "../ui/button"
import { Link } from "react-router-dom"

interface StorageNotConfiguredNoticeProps {
  variant?: "banner" | "inline"
  className?: string
  showSetupLink?: boolean
}

export function StorageNotConfiguredNotice({
  variant = "banner",
  className = "",
  showSetupLink = true,
}: StorageNotConfiguredNoticeProps) {
  if (variant === "inline") {
    return (
      <div className={`dy-rounded-xl dy-border dy-border-amber-500/30 dy-bg-amber-500/10 dy-p-4 dy-text-amber-900 dark:dy-text-amber-200 ${className}`}>
        <div className="dy-flex dy-items-start dy-gap-3">
          <HardDrive className="dy-h-5 dy-w-5 dy-flex-shrink-0 dy-text-amber-600 dark:dy-text-amber-400 dy-mt-0.5" />
          <div className="dy-space-y-1">
            <p className="dy-text-sm dy-font-semibold">Media storage isn't set up yet</p>
            <p className="dy-text-xs dy-opacity-90 dy-leading-relaxed">
              File uploads require a storage provider (such as AWS S3, Cloudinary, Backblaze B2, or local storage). Please ask your developer or system administrator to configure media storage in Dyrected.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`dy-relative dy-overflow-hidden dy-rounded-xl dy-border dy-border-amber-500/30 dy-bg-gradient-to-r dy-from-amber-500/10 dy-via-amber-500/5 dy-to-transparent dy-p-5 dy-text-foreground ${className}`}
    >
      <div className="dy-flex dy-flex-col sm:dy-flex-row sm:dy-items-center dy-justify-between dy-gap-4">
        <div className="dy-flex dy-items-start dy-gap-4">
          <div className="dy-flex dy-h-10 dy-w-10 dy-flex-shrink-0 dy-items-center dy-justify-center dy-rounded-lg dy-bg-amber-500/20 dy-text-amber-600 dark:dy-text-amber-400">
            <HardDrive className="dy-h-5 dy-w-5" />
          </div>
          <div className="dy-space-y-1">
            <h4 className="dy-text-sm dy-font-bold dy-text-amber-950 dark:dy-text-amber-100">
              Media storage isn't set up yet
            </h4>
            <p className="dy-text-xs dy-text-muted-foreground dy-leading-relaxed">
              File uploads are currently unavailable because a media storage provider (such as AWS S3, Cloudinary, Backblaze B2, or local storage) hasn't been configured. Please ask your developer or system administrator to add a storage adapter to your Dyrected config.
            </p>
          </div>
        </div>
        {showSetupLink && (
          <div className="dy-flex-shrink-0">
            <Button asChild variant="outline" size="sm" className="dy-h-9 dy-gap-2 dy-border-amber-500/30 hover:dy-bg-amber-500/10">
              <Link to="/setup">
                <Wrench className="dy-h-3.5 dy-w-3.5" />
                Setup Guide
                <ArrowRight className="dy-h-3.5 dy-w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
