import * as React from "react";
import { Link } from "react-router-dom";
import {
  Pencil,
  Trash2,
  Copy,
  Check,
  FileText,
  Music,
  Video as VideoIcon,
  ExternalLink,
  FolderInput,
  MoreVertical,
} from "lucide-react";
import { Blurhash } from "react-blurhash";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { getMediaPreviewUrl, isExternalMedia } from "../../lib/external-media";
import { getTransformedMediaUrl, cn } from "../../lib/utils";
import type { AspectRatioMode } from "./media-filter-bar";

interface MediaCardProps {
  item: any;
  baseUrl: string;
  onDelete: (id: string) => void;
  editPath: string;
  aspectRatio?: AspectRatioMode;
  isSelected?: boolean;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
  onMoveToFolder?: (item: any) => void;
  onClick?: () => void;
}

function formatBytes(bytes?: number, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function MediaCard({
  item,
  baseUrl,
  onDelete,
  editPath,
  aspectRatio = "square",
  isSelected = false,
  onToggleSelect,
  onMoveToFolder,
  onClick,
}: MediaCardProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasCopied, setHasCopied] = React.useState(false);

  const isExternal = isExternalMedia(item);
  const rawUrl = getMediaPreviewUrl(item, baseUrl);
  const previewUrl = getTransformedMediaUrl(item, { width: 500, quality: 80 }, baseUrl) || rawUrl;
  const isImage = item.mimeType?.startsWith("image/") || (!item.mimeType && !isExternal);
  const isVideo = item.mimeType?.startsWith("video/") || isExternal;
  const isAudio = item.mimeType?.startsWith("audio/");

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const cdnUrl = item.url || rawUrl;
    if (cdnUrl) {
      navigator.clipboard.writeText(cdnUrl);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const getAspectClass = () => {
    if (aspectRatio === "16/9") return "dy-aspect-video";
    if (aspectRatio === "original" && item.aspectRatio) {
      return item.aspectRatio > 1.2 ? "dy-aspect-video" : "dy-aspect-square";
    }
    return "dy-aspect-square";
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "dy-group dy-relative dy-rounded-xl dy-overflow-hidden dy-bg-background dy-border dy-transition-all dy-duration-200 dy-cursor-pointer",
        getAspectClass(),
        isSelected
          ? "dy-border-primary dy-ring-2 dy-ring-primary/30 dy-shadow-md"
          : "dy-border-border/60 hover:dy-border-primary/40 hover:dy-shadow-lg"
      )}
    >
      {/* Blurhash Placeholder */}
      {isImage && item.blurhash && (
        <div
          className={cn(
            "dy-absolute dy-inset-0 dy-transition-opacity dy-duration-500",
            isLoaded ? "dy-opacity-0" : "dy-opacity-100"
          )}
        >
          <Blurhash
            hash={item.blurhash}
            width="100%"
            height="100%"
            resolutionX={32}
            resolutionY={32}
            punch={1}
          />
        </div>
      )}

      {/* Main Preview Asset */}
      {isImage ? (
        <img
          src={previewUrl}
          alt={item.alt || item.filename}
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "dy-w-full dy-h-full dy-object-cover dy-transition-all dy-duration-500 group-hover:dy-scale-105",
            item.blurhash && !isLoaded ? "dy-opacity-0" : "dy-opacity-100"
          )}
        />
      ) : isVideo ? (
        <div className="dy-w-full dy-h-full dy-flex dy-flex-col dy-items-center dy-justify-center dy-bg-muted/30">
          {rawUrl && rawUrl.startsWith("http") && !isExternal ? (
            <video
              src={rawUrl}
              className="dy-w-full dy-h-full dy-object-cover"
              preload="metadata"
              muted
            />
          ) : (
            <div className="dy-flex dy-flex-col dy-items-center dy-gap-2 dy-text-muted-foreground">
              <VideoIcon className="dy-h-10 dy-w-10" />
              <span className="dy-text-[11px] dy-font-medium dy-uppercase">Video Asset</span>
            </div>
          )}
        </div>
      ) : isAudio ? (
        <div className="dy-w-full dy-h-full dy-flex dy-flex-col dy-items-center dy-justify-center dy-bg-muted/30 dy-text-muted-foreground">
          <Music className="dy-h-10 dy-w-10" />
          <span className="dy-text-[11px] dy-font-medium dy-uppercase dy-mt-2">Audio Asset</span>
        </div>
      ) : (
        <div className="dy-w-full dy-h-full dy-flex dy-flex-col dy-items-center dy-justify-center dy-bg-muted/30 dy-text-muted-foreground">
          <FileText className="dy-h-10 dy-w-10" />
          <span className="dy-text-[11px] dy-font-medium dy-uppercase dy-mt-2">Document</span>
        </div>
      )}

      {/* Top Controls: Selection Checkbox & Type Badge */}
      <div className="dy-absolute dy-top-2 dy-left-2 dy-right-2 dy-flex dy-items-center dy-justify-between dy-pointer-events-none dy-z-20">
        {onToggleSelect && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item.id, e);
            }}
            className={cn(
              "dy-pointer-events-auto dy-p-1 dy-rounded-md dy-bg-background/80 dy-backdrop-blur-sm dy-transition-opacity",
              isSelected ? "dy-opacity-100" : "dy-opacity-0 group-hover:dy-opacity-100"
            )}
          >
            <Checkbox checked={isSelected} className="dy-h-4 dy-w-4" />
          </div>
        )}

        <div className="dy-flex dy-items-center dy-gap-1.5 dy-ml-auto dy-pointer-events-auto">
          {isExternal && (
            <Badge
              variant="secondary"
              className="dy-bg-background/80 dy-backdrop-blur-sm dy-text-[10px] dy-h-5"
            >
              <ExternalLink className="dy-h-2.5 dy-w-2.5 dy-mr-1" />
              Embed
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                size="icon"
                variant="secondary"
                className="dy-h-6 dy-w-6 dy-rounded-md dy-bg-background/80 hover:dy-bg-background dy-backdrop-blur-sm dy-shadow-sm dy-text-foreground opacity-90 sm:dy-opacity-0 sm:group-hover:dy-opacity-100 dy-transition-opacity"
              >
                <MoreVertical className="dy-h-3.5 dy-w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dy-w-44" onClick={(e) => e.stopPropagation()}>
              {onMoveToFolder && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToFolder(item);
                  }}
                >
                  <FolderInput className="dy-h-3.5 dy-w-3.5 dy-mr-2 dy-text-primary" />
                  Move to Folder...
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (onClick) onClick();
                }}
              >
                <Pencil className="dy-h-3.5 dy-w-3.5 dy-mr-2" />
                Inspect Asset
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="dy-h-3.5 dy-w-3.5 dy-mr-2" />
                Copy CDN URL
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="dy-text-destructive focus:dy-text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
              >
                <Trash2 className="dy-h-3.5 dy-w-3.5 dy-mr-2" />
                Delete Asset
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Hover Overlay Action Bar */}
      <div className="dy-absolute dy-inset-0 dy-flex dy-items-center dy-justify-center dy-gap-2 dy-bg-black/40 dy-backdrop-blur-[2px] dy-opacity-0 group-hover:dy-opacity-100 dy-transition-all dy-duration-200">
        <Button
          size="icon"
          variant="secondary"
          className="dy-h-8 dy-w-8 dy-rounded-full dy-bg-background/90 hover:dy-bg-background dy-text-foreground dy-shadow-md"
          onClick={handleCopy}
          title="Copy CDN URL"
        >
          {hasCopied ? <Check className="dy-h-3.5 dy-w-3.5 dy-text-emerald-500" /> : <Copy className="dy-h-3.5 dy-w-3.5" />}
        </Button>

        {onMoveToFolder && (
          <Button
            size="icon"
            variant="secondary"
            className="dy-h-8 dy-w-8 dy-rounded-full dy-bg-background/90 hover:dy-bg-background dy-text-foreground dy-shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToFolder(item);
            }}
            title="Move to Folder"
          >
            <FolderInput className="dy-h-3.5 dy-w-3.5" />
          </Button>
        )}

        <Link to={editPath} onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon"
            variant="secondary"
            className="dy-h-8 dy-w-8 dy-rounded-full dy-bg-background/90 hover:dy-bg-background dy-text-foreground dy-shadow-md"
            title="Edit Details"
          >
            <Pencil className="dy-h-3.5 dy-w-3.5" />
          </Button>
        </Link>

        <Button
          size="icon"
          variant="destructive"
          className="dy-h-8 dy-w-8 dy-rounded-full dy-bg-destructive/90 hover:dy-bg-destructive dy-shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          title="Delete Asset"
        >
          <Trash2 className="dy-h-3.5 dy-w-3.5" />
        </Button>
      </div>

      {/* Bottom Metadata Gradient Banner */}
      <div className="dy-absolute dy-bottom-0 dy-left-0 dy-right-0 dy-p-2 dy-bg-gradient-to-t dy-from-black/80 dy-via-black/40 dy-to-transparent dy-opacity-90 group-hover:dy-opacity-100 dy-transition-opacity">
        <p className="dy-text-[11px] dy-text-white dy-truncate dy-font-medium">
          {item.originalFilename || item.filename}
        </p>
        <div className="dy-flex dy-items-center dy-justify-between dy-mt-0.5">
          <span className="dy-text-[9px] dy-text-white/70 dy-uppercase dy-tracking-wider">
            {item.mimeType?.split("/")[1] || "asset"}
          </span>
          {item.filesize && (
            <span className="dy-text-[9px] dy-text-white/70 dy-tabular-nums">
              {formatBytes(item.filesize)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
