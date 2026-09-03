import * as React from "react";
import {
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  FolderPlus,
  Layers,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import type { MediaFolder } from "../../types/media-folders";

interface FolderTreeProps {
  folders: MediaFolder[];
  activeFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string, parentId?: string | null, color?: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  className?: string;
  totalAssetCount?: number;
}

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#64748b", // Slate
];

export function FolderTree({
  folders,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  className,
  totalAssetCount,
}: FolderTreeProps) {
  const [expandedFolderIds, setExpandedFolderIds] = React.useState<Set<string>>(
    new Set(["marketing", "products"])
  );
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean;
    type: "create" | "rename";
    folderId?: string;
    parentId?: string | null;
    initialName?: string;
  }>({
    isOpen: false,
    type: "create",
  });
  const [folderNameInput, setFolderNameInput] = React.useState("");
  const [selectedColor, setSelectedColor] = React.useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openCreateDialog = (parentId: string | null = null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFolderNameInput("");
    setSelectedColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setDialogState({
      isOpen: true,
      type: "create",
      parentId,
    });
  };

  const openRenameDialog = (folder: MediaFolder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFolderNameInput(folder.name);
    setSelectedColor(folder.color || PRESET_COLORS[0]);
    setDialogState({
      isOpen: true,
      type: "rename",
      folderId: folder.id,
      initialName: folder.name,
    });
  };

  const handleDialogSubmit = async () => {
    if (!folderNameInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const isCreate = dialogState.type === "create";
    const toastId = toast.loading(isCreate ? "Creating folder..." : "Updating folder...");
    try {
      if (isCreate) {
        await onCreateFolder(folderNameInput.trim(), dialogState.parentId, selectedColor);
        if (dialogState.parentId) {
          setExpandedFolderIds((prev) => new Set(prev).add(dialogState.parentId!));
        }
        toast.success("Folder created", { id: toastId });
      } else if (dialogState.folderId) {
        await onRenameFolder(dialogState.folderId, folderNameInput.trim());
        toast.success("Folder updated", { id: toastId });
      }
      setDialogState((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      toast.error("Operation failed", { description: err?.message, id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build tree hierarchy
  const renderFolderItem = (folder: MediaFolder, level: number = 0) => {
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    const hasChildren = childFolders.length > 0;
    const isExpanded = expandedFolderIds.has(folder.id);
    const isActive = activeFolderId === folder.id;

    return (
      <div key={folder.id} className="dy-flex dy-flex-col">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectFolder(folder.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onSelectFolder(folder.id);
            }
          }}
          className={cn(
            "dy-group/item dy-flex dy-items-center dy-gap-2 dy-py-1.5 dy-px-2 dy-rounded-md dy-text-xs dy-font-medium dy-transition-colors dy-cursor-pointer",
            isActive
              ? "dy-bg-primary/10 dy-text-primary dy-font-semibold"
              : "dy-text-muted-foreground hover:dy-bg-accent/60 hover:dy-text-foreground"
          )}
          style={{ paddingLeft: `${Math.max(8, level * 16 + 8)}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => toggleExpand(folder.id, e)}
              className="dy-p-0.5 dy-rounded hover:dy-bg-muted/80 dy-text-muted-foreground hover:dy-text-foreground"
            >
              {isExpanded ? (
                <ChevronDown className="dy-h-3.5 dy-3.5" />
              ) : (
                <ChevronRight className="dy-h-3.5 dy-w-3.5" />
              )}
            </button>
          ) : (
            <span className="dy-w-3.5" />
          )}

          <div className="dy-flex dy-items-center dy-gap-1.5 dy-flex-1 dy-min-w-0">
            {isActive || isExpanded ? (
              <FolderOpen
                className="dy-h-4 dy-w-4 dy-shrink-0"
                style={{ color: folder.color || "currentColor" }}
              />
            ) : (
              <FolderIcon
                className="dy-h-4 dy-w-4 dy-shrink-0"
                style={{ color: folder.color || "currentColor" }}
              />
            )}
            <span className="dy-truncate">{folder.name}</span>
          </div>

          <div className="dy-flex dy-items-center dy-opacity-0 group-hover/item:dy-opacity-100 dy-transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="dy-p-1 dy-rounded hover:dy-bg-muted dy-text-muted-foreground hover:dy-text-foreground"
                >
                  <MoreVertical className="dy-h-3.5 dy-w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dy-w-40">
                <DropdownMenuItem onClick={(e) => openCreateDialog(folder.id, e)}>
                  <FolderPlus className="dy-h-3.5 dy-w-3.5 dy-mr-2" />
                  New Subfolder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => openRenameDialog(folder, e)}>
                  <Pencil className="dy-h-3.5 dy-w-3.5 dy-mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="dy-text-destructive focus:dy-text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder.id);
                  }}
                >
                  <Trash2 className="dy-h-3.5 dy-w-3.5 dy-mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="dy-flex dy-flex-col dy-mt-0.5">
            {childFolders.map((child) => renderFolderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter((f) => !f.parentId);

  return (
    <aside className={cn("dy-flex dy-flex-col dy-w-52 lg:dy-w-60 dy-border-r dy-border-border/60 dy-bg-muted/10 dy-p-3 dy-shrink-0", className)}>
      <div className="dy-flex dy-items-center dy-justify-between dy-mb-3 dy-px-1">
        <span className="dy-text-xs dy-font-semibold dy-text-muted-foreground dy-uppercase dy-tracking-wider">
          Folders
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="dy-h-6 dy-w-6 dy-rounded-md hover:dy-bg-accent"
          onClick={() => openCreateDialog(null)}
          title="Create Folder"
        >
          <Plus className="dy-h-3.5 dy-w-3.5" />
        </Button>
      </div>

      {/* Root "All Media" option */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectFolder(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelectFolder(null);
        }}
        className={cn(
          "dy-flex dy-items-center dy-justify-between dy-py-2 dy-px-2.5 dy-rounded-md dy-text-xs dy-font-medium dy-transition-colors dy-cursor-pointer dy-mb-1",
          activeFolderId === null
            ? "dy-bg-primary/10 dy-text-primary dy-font-semibold"
            : "dy-text-muted-foreground hover:dy-bg-accent/60 hover:dy-text-foreground"
        )}
      >
        <div className="dy-flex dy-items-center dy-gap-2">
          <Layers className="dy-h-4 dy-w-4" />
          <span>All Media</span>
        </div>
        {totalAssetCount !== undefined && (
          <span className="dy-text-[11px] dy-text-muted-foreground dy-tabular-nums">
            {totalAssetCount}
          </span>
        )}
      </div>

      {/* Folder Tree Items */}
      <div className="dy-flex dy-flex-col dy-gap-0.5 dy-overflow-y-auto dy-flex-1">
        {rootFolders.map((folder) => renderFolderItem(folder, 0))}
      </div>

      {/* Create / Rename Dialog */}
      <Dialog
        open={dialogState.isOpen}
        onOpenChange={(open) =>
          setDialogState((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="sm:dy-max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogState.type === "create" ? "Create New Folder" : "Rename Folder"}
            </DialogTitle>
          </DialogHeader>

          <div className="dy-space-y-4 dy-py-2">
            <div className="dy-space-y-1.5">
              <label className="dy-text-xs dy-font-medium dy-text-muted-foreground">
                Folder Name
              </label>
              <Input
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                placeholder="e.g. Summer 2026 Campaign"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleDialogSubmit();
                  }
                }}
                autoFocus
              />
            </div>

            {dialogState.type === "create" && (
              <div className="dy-space-y-1.5">
                <label className="dy-text-xs dy-font-medium dy-text-muted-foreground">
                  Folder Color
                </label>
                <div className="dy-flex dy-items-center dy-gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "dy-h-6 dy-w-6 dy-rounded-full dy-transition-transform",
                        selectedColor === color
                          ? "dy-ring-2 dy-ring-primary dy-ring-offset-2 dy-scale-110"
                          : "hover:dy-scale-105"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() =>
                setDialogState((prev) => ({ ...prev, isOpen: false }))
              }
            >
              Cancel
            </Button>
            <Button onClick={handleDialogSubmit} disabled={!folderNameInput.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="dy-h-4 dy-w-4 dy-animate-spin dy-mr-1.5" />}
              {isSubmitting ? "Saving..." : (dialogState.type === "create" ? "Create" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
