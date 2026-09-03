import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { FolderIcon, FolderOpen, Layers, Check, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import type { MediaFolder } from "../../types/media-folders";

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: MediaFolder[];
  itemCount: number;
  onMove: (destinationFolderId: string | null) => Promise<void>;
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  folders,
  itemCount,
  onMove,
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [isMoving, setIsMoving] = React.useState(false);

  const handleConfirm = async () => {
    setIsMoving(true);
    try {
      await onMove(selectedFolderId);
      onOpenChange(false);
    } finally {
      setIsMoving(false);
    }
  };

  // Build hierarchical folder structure
  const renderFolderList = (parentId: string | null = null, level: number = 0) => {
    const children = folders.filter((f) => f.parentId === parentId);
    if (children.length === 0) return null;

    return (
      <div className="dy-space-y-1">
        {children.map((folder) => {
          const isSelected = selectedFolderId === folder.id;
          return (
            <React.Fragment key={folder.id}>
              <button
                type="button"
                onClick={() => setSelectedFolderId(folder.id)}
                className={cn(
                  "dy-w-full dy-flex dy-items-center dy-justify-between dy-py-2 dy-px-3 dy-rounded-lg dy-text-xs dy-font-medium dy-transition-all",
                  isSelected
                    ? "dy-bg-primary/10 dy-text-primary dy-border dy-border-primary/30"
                    : "dy-bg-muted/20 hover:dy-bg-muted/50 dy-text-foreground"
                )}
                style={{ paddingLeft: `${Math.max(12, level * 16 + 12)}px` }}
              >
                <div className="dy-flex dy-items-center dy-gap-2.5 dy-min-w-0">
                  {isSelected ? (
                    <FolderOpen className="dy-h-4 dy-w-4 dy-shrink-0" style={{ color: folder.color || undefined }} />
                  ) : (
                    <FolderIcon className="dy-h-4 dy-w-4 dy-shrink-0" style={{ color: folder.color || undefined }} />
                  )}
                  <span className="dy-truncate">{folder.name}</span>
                </div>
                {isSelected && <Check className="dy-h-4 dy-w-4 dy-text-primary dy-shrink-0" />}
              </button>
              {renderFolderList(folder.id, level + 1)}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:dy-max-w-md">
        <DialogHeader>
          <DialogTitle>Move {itemCount} {itemCount === 1 ? "Item" : "Items"} to Folder</DialogTitle>
        </DialogHeader>

        <div className="dy-py-3 dy-space-y-2 dy-max-h-[350px] dy-overflow-y-auto dy-pr-1">
          {/* Root / All Media option */}
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={cn(
              "dy-w-full dy-flex dy-items-center dy-justify-between dy-py-2 dy-px-3 dy-rounded-lg dy-text-xs dy-font-medium dy-transition-all",
              selectedFolderId === null
                ? "dy-bg-primary/10 dy-text-primary dy-border dy-border-primary/30"
                : "dy-bg-muted/20 hover:dy-bg-muted/50 dy-text-foreground"
            )}
          >
            <div className="dy-flex dy-items-center dy-gap-2.5">
              <Layers className="dy-h-4 dy-w-4 dy-shrink-0 dy-text-muted-foreground" />
              <span>Root (No Folder)</span>
            </div>
            {selectedFolderId === null && <Check className="dy-h-4 dy-w-4 dy-text-primary dy-shrink-0" />}
          </button>

          {/* Folder Hierarchy */}
          {renderFolderList(null, 0)}
        </div>

        <DialogFooter className="dy-gap-2 sm:dy-gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMoving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isMoving}>
            {isMoving && <Loader2 className="dy-h-4 dy-w-4 dy-animate-spin dy-mr-1.5" />}
            {isMoving ? "Moving..." : "Move Here"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
