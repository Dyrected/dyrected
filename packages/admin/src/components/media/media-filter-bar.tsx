import * as React from "react";
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  FileText,
  LayoutGrid,
  Table as TableIcon,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export type MimeFilterType = "all" | "image" | "video" | "audio" | "document";
export type AspectRatioMode = "square" | "original" | "16/9";
export type MediaViewMode = "grid" | "table" | "spreadsheet";

interface MediaFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  mimeFilter: MimeFilterType;
  onMimeFilterChange: (filter: MimeFilterType) => void;
  aspectRatio: AspectRatioMode;
  onAspectRatioChange: (mode: AspectRatioMode) => void;
  viewMode: MediaViewMode;
  onViewModeChange: (mode: MediaViewMode) => void;
  sortValue: string;
  onSortChange: (sort: string) => void;
  sortOptions: { value: string; label: string }[];
  className?: string;
}

const MIME_CHIPS: { type: MimeFilterType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "all", label: "All Types", icon: SlidersHorizontal },
  { type: "image", label: "Images", icon: ImageIcon },
  { type: "video", label: "Videos", icon: VideoIcon },
  { type: "audio", label: "Audio", icon: MusicIcon },
  { type: "document", label: "Documents", icon: FileText },
];

export function MediaFilterBar({
  search,
  onSearchChange,
  mimeFilter,
  onMimeFilterChange,
  aspectRatio,
  onAspectRatioChange,
  viewMode,
  onViewModeChange,
  sortValue,
  onSortChange,
  sortOptions,
  className,
}: MediaFilterBarProps) {
  return (
    <div className={cn("dy-flex dy-flex-col dy-gap-3 dy-w-full dy-py-2", className)}>
      <div className="dy-flex dy-flex-wrap dy-items-center dy-justify-between dy-gap-2.5">
        {/* Search Input */}
        <div className="dy-relative dy-flex-1 dy-min-w-[200px] dy-max-w-md">
          <Search className="dy-absolute dy-left-2.5 dy-top-1/2 -dy-translate-y-1/2 dy-h-4 dy-w-4 dy-text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search assets..."
            className="dy-pl-9 dy-pr-8 dy-h-9 dy-text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="dy-absolute dy-right-2.5 dy-top-1/2 -dy-translate-y-1/2 dy-p-0.5 dy-rounded-full hover:dy-bg-muted dy-text-muted-foreground"
            >
              <X className="dy-h-3.5 dy-w-3.5" />
            </button>
          )}
        </div>

        {/* View mode & Sort controls */}
        <div className="dy-flex dy-items-center dy-gap-2">
          {/* Aspect Ratio Toggle (Cards Mode Only) */}
          {viewMode === "grid" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="dy-h-9 dy-text-xs dy-gap-1.5">
                  <span className="dy-text-muted-foreground">Ratio:</span>
                  <span className="dy-capitalize">{aspectRatio === "16/9" ? "16:9" : aspectRatio}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={aspectRatio}
                  onValueChange={(v) => onAspectRatioChange(v as AspectRatioMode)}
                >
                  <DropdownMenuRadioItem value="square">Square (1:1)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="original">Original Ratio</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="16/9">Landscape (16:9)</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Sort Selector */}
          <Select value={sortValue} onValueChange={onSortChange}>
            <SelectTrigger className="dy-h-9 dy-w-[150px] dy-text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent align="end">
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="dy-text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Mode Toggle Group */}
          <div className="dy-flex dy-items-center dy-border dy-border-border dy-rounded-md dy-p-0.5 dy-bg-muted/20">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "dy-p-1.5 dy-rounded dy-transition-colors",
                viewMode === "grid"
                  ? "dy-bg-background dy-text-foreground dy-shadow-sm"
                  : "dy-text-muted-foreground hover:dy-text-foreground"
              )}
              title="Cards Grid"
            >
              <LayoutGrid className="dy-h-3.5 dy-w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={cn(
                "dy-p-1.5 dy-rounded dy-transition-colors",
                viewMode === "table"
                  ? "dy-bg-background dy-text-foreground dy-shadow-sm"
                  : "dy-text-muted-foreground hover:dy-text-foreground"
              )}
              title="Table View"
            >
              <TableIcon className="dy-h-3.5 dy-w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MIME Filter Chips */}
      <div className="dy-flex dy-items-center dy-gap-1.5 dy-overflow-x-auto dy-no-scrollbar">
        {MIME_CHIPS.map((chip) => {
          const Icon = chip.icon;
          const isActive = mimeFilter === chip.type;
          return (
            <button
              key={chip.type}
              type="button"
              onClick={() => onMimeFilterChange(chip.type)}
              className={cn(
                "dy-flex dy-items-center dy-gap-1.5 dy-px-3 dy-py-1 dy-rounded-md dy-text-xs dy-font-medium dy-shrink-0 dy-transition-all dy-border",
                isActive
                  ? "dy-bg-primary/10 dy-text-primary dy-border-primary/30"
                  : "dy-bg-background dy-text-muted-foreground dy-border-border/60 hover:dy-bg-muted/40 hover:dy-text-foreground"
              )}
            >
              <Icon className="dy-h-3 dy-w-3" />
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
