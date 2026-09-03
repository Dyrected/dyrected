import * as React from "react";
import {
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  Plus,
  Layers,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import type { MediaFolder, FolderBreadcrumbItem } from "../../types/media-folders";

interface FolderPillCarouselProps {
  folders: MediaFolder[];
  activeFolderId: string | null;
  breadcrumbs: FolderBreadcrumbItem[];
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string, parentId?: string | null) => Promise<unknown> | void;
  className?: string;
  totalAssetCount?: number;
}

export function FolderPillCarousel({
  folders,
  activeFolderId,
  breadcrumbs,
  onSelectFolder,
  onCreateFolder,
  className,
  totalAssetCount,
}: FolderPillCarouselProps) {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [folderName, setFolderName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  // Determine current sibling / child folders to display as pills
  const visibleFolders = React.useMemo(() => {
    if (!activeFolderId) {
      // At root: show top-level folders
      return folders.filter((f) => !f.parentId);
    }
    // Inside folder: show child subfolders if any; otherwise show sibling folders
    const children = folders.filter((f) => f.parentId === activeFolderId);
    if (children.length > 0) return children;

    const current = folders.find((f) => f.id === activeFolderId);
    if (current) {
      return folders.filter((f) => f.parentId === current.parentId);
    }
    return folders.filter((f) => !f.parentId);
  }, [folders, activeFolderId]);

  const handleCreate = async () => {
    if (!folderName.trim() || isCreating) return;
    setIsCreating(true);
    const toastId = toast.loading("Creating folder...");
    try {
      await onCreateFolder(folderName.trim(), activeFolderId);
      setFolderName("");
      setIsCreateOpen(false);
      toast.success("Folder created", { id: toastId });
    } catch (err: any) {
      toast.error("Failed to create folder", { description: err?.message, id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={cn("dy-flex dy-flex-col dy-gap-2 dy-w-full dy-pb-2", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <nav
          aria-label="Folder Breadcrumb"
          className="dy-flex dy-items-center dy-gap-1.5 dy-text-xs dy-text-muted-foreground dy-overflow-x-auto dy-no-scrollbar dy-py-0.5"
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id || "root"}>
                {idx > 0 && <ChevronRight className="dy-h-3 dy-w-3 dy-shrink-0 dy-text-muted-foreground/50" />}
                <button
                  type="button"
                  onClick={() => onSelectFolder(crumb.id)}
                  className={cn(
                    "dy-truncate dy-transition-colors hover:dy-text-foreground",
                    isLast
                      ? "dy-font-semibold dy-text-foreground"
                      : "dy-text-muted-foreground"
                  )}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Horizontal Pill Carousel */}
      <div className="dy-flex dy-items-center dy-gap-2 dy-overflow-x-auto dy-no-scrollbar dy-py-1">
        {/* All / Parent Root Pill */}
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className={cn(
            "dy-flex dy-items-center dy-gap-1.5 dy-px-3 dy-py-1.5 dy-rounded-full dy-text-xs dy-font-medium dy-shrink-0 dy-transition-all dy-border",
            activeFolderId === null
              ? "dy-bg-primary dy-text-primary-foreground dy-border-primary dy-shadow-sm"
              : "dy-bg-background dy-text-muted-foreground dy-border-border hover:dy-bg-accent hover:dy-text-foreground"
          )}
        >
          <Layers className="dy-h-3.5 dy-w-3.5" />
          <span>All</span>
          {totalAssetCount !== undefined && (
            <Badge
              variant="secondary"
              className={cn(
                "dy-px-1.5 dy-py-0 dy-text-[10px] dy-h-4",
                activeFolderId === null
                  ? "dy-bg-primary-foreground/20 dy-text-primary-foreground"
                  : "dy-bg-muted dy-text-muted-foreground"
              )}
            >
              {totalAssetCount}
            </Badge>
          )}
        </button>

        {/* Folder Pills */}
        {visibleFolders.map((folder) => {
          const isActive = activeFolderId === folder.id;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className={cn(
                "dy-flex dy-items-center dy-gap-1.5 dy-px-3 dy-py-1.5 dy-rounded-full dy-text-xs dy-font-medium dy-shrink-0 dy-transition-all dy-border",
                isActive
                  ? "dy-bg-primary dy-text-primary-foreground dy-border-primary dy-shadow-sm"
                  : "dy-bg-background dy-text-muted-foreground dy-border-border hover:dy-bg-accent hover:dy-text-foreground"
              )}
            >
              {isActive ? (
                <FolderOpen className="dy-h-3.5 dy-w-3.5" style={{ color: folder.color }} />
              ) : (
                <FolderIcon className="dy-h-3.5 dy-w-3.5" style={{ color: folder.color }} />
              )}
              <span className="dy-truncate dy-max-w-[120px]">{folder.name}</span>
            </button>
          );
        })}

        {/* New Folder Action */}
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="dy-flex dy-items-center dy-gap-1 dy-px-2.5 dy-py-1.5 dy-rounded-full dy-text-xs dy-font-medium dy-shrink-0 dy-border dy-border-dashed dy-border-border hover:dy-border-primary hover:dy-text-primary dy-text-muted-foreground dy-transition-colors"
        >
          <Plus className="dy-h-3 dy-w-3" />
          <span>Folder</span>
        </button>
      </div>

      {/* New Folder Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:dy-max-w-md">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <div className="dy-py-2">
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!folderName.trim() || isCreating}>
              {isCreating && <Loader2 className="dy-h-4 dy-w-4 dy-animate-spin dy-mr-1.5" />}
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
