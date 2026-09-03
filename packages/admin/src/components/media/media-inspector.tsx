import * as React from "react";
import {
  X,
  Copy,
  Check,
  Trash2,
  Info,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { FocalPointPicker } from "./focal-point-picker";
import { getMediaPreviewUrl, isExternalMedia } from "../../lib/external-media";
import { getTransformedMediaUrl, cn } from "../../lib/utils";
import { useIsMobile } from "../../hooks/use-mobile";
import { useDyrected } from "../../providers/dyrected-context";
import type { MediaFolder } from "../../types/media-folders";

interface MediaInspectorProps {
  item: any | null;
  isOpen: boolean;
  onClose: () => void;
  baseUrl: string;
  folders?: MediaFolder[];
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

function formatBytes(bytes?: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function MediaInspector({
  item,
  isOpen,
  onClose,
  baseUrl,
  folders,
  onUpdate,
  onDelete,
}: MediaInspectorProps) {
  const isMobile = useIsMobile();

  if (!item) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "dy-p-0 dy-flex dy-flex-col dy-bg-background dy-border-border dy-z-50",
          isMobile ? "dy-h-[85vh] dy-rounded-t-2xl" : "sm:dy-max-w-md dy-h-full"
        )}
      >
        <MediaInspectorForm
          key={item.id}
          item={item}
          baseUrl={baseUrl}
          folders={folders}
          onClose={onClose}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </SheetContent>
    </Sheet>
  );
}

function MediaInspectorForm({
  item,
  baseUrl,
  folders = [],
  onClose,
  onUpdate,
  onDelete,
}: {
  item: any;
  baseUrl: string;
  folders?: MediaFolder[];
  onClose: () => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const { client } = useDyrected();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isReplacing, setIsReplacing] = React.useState(false);

  const [alt, setAlt] = React.useState(item?.alt || "");
  const [caption, setCaption] = React.useState(item?.caption || "");
  const [folderId, setFolderId] = React.useState<string>(item?.folderId || "root");
  const [focalPoint, setFocalPoint] = React.useState<{ x: number; y: number } | undefined>(
    item?.focalPoint || undefined
  );
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const previewUrl = getMediaPreviewUrl(item, baseUrl);
  const isExternal = isExternalMedia(item);
  const isImage = item.mimeType?.startsWith("image/") || (!item.mimeType && !isExternal);

  const handleCopy = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client) return;

    setIsReplacing(true);
    const toastId = toast.loading("Replacing file in-place...");
    try {
      const col = item.collection || "media";
      const updated = await client.replaceMedia(item.id, file, col);
      onUpdate(item.id, {
        filename: updated.filename,
        originalFilename: file.name,
        mimeType: updated.mimeType,
        filesize: updated.filesize,
        url: updated.url,
        width: updated.width,
        height: updated.height,
        aspectRatio: updated.aspectRatio,
        blurhash: updated.blurhash,
      });
      toast.success("File replaced successfully", { id: toastId });
    } catch (err: any) {
      toast.error("Failed to replace file", { description: err.message, id: toastId });
    } finally {
      setIsReplacing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    onUpdate(item.id, {
      alt,
      caption,
      folderId: folderId === "root" ? null : folderId,
      focalPoint,
    });
    onClose();
  };

  const cdnUrl = item.url || previewUrl;
  const thumbUrl = getTransformedMediaUrl(item, { width: 300, height: 300, crop: "fill", format: "webp" }, baseUrl);
  const webpUrl = getTransformedMediaUrl(item, { format: "webp", quality: 85 }, baseUrl);

  return (
    <>
      {/* Hidden File Input for in-place replacement */}
      <input
        ref={fileInputRef}
        type="file"
        accept={isImage ? "image/*" : (item.mimeType || undefined)}
        className="dy-hidden"
        onChange={handleReplaceFile}
      />

      {/* Header */}
      <SheetHeader className="dy-p-4 dy-border-b dy-border-border/60 dy-flex dy-flex-row dy-items-center dy-justify-between">
        <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
          <SheetTitle className="dy-text-sm dy-font-semibold dy-truncate">
            {item.originalFilename || item.filename}
          </SheetTitle>
          {isExternal && (
            <Badge variant="secondary" className="dy-text-[10px] dy-h-5">
              Embed
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="dy-h-7 dy-w-7 dy-rounded-full"
          onClick={onClose}
        >
          <X className="dy-h-4 dy-w-4" />
        </Button>
      </SheetHeader>

      {/* Scrollable Content */}
      <div className="dy-flex-1 dy-overflow-y-auto dy-p-4 dy-space-y-5">
        {/* Asset Preview Frame */}
        <div className="dy-relative dy-w-full dy-aspect-video dy-rounded-xl dy-overflow-hidden dy-bg-muted/30 dy-border dy-border-border/40 dy-flex dy-items-center dy-justify-center dy-group">
          {isImage ? (
            <img
              src={previewUrl}
              alt={alt || item.filename}
              className="dy-w-full dy-h-full dy-object-contain"
            />
          ) : (
            <div className="dy-flex dy-flex-col dy-items-center dy-gap-2 dy-text-muted-foreground">
              <Info className="dy-h-8 dy-w-8" />
              <span className="dy-text-xs dy-uppercase">{item.mimeType || "Asset"}</span>
            </div>
          )}

          {!isExternal && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isReplacing}
              onClick={() => fileInputRef.current?.click()}
              className="dy-absolute dy-bottom-2 dy-right-2 dy-h-7 dy-px-2 dy-text-[11px] dy-bg-background/90 dy-backdrop-blur dy-shadow-md hover:dy-bg-background dy-opacity-90 sm:dy-opacity-0 sm:dy-group-hover:dy-opacity-100 dy-transition-all"
            >
              <RefreshCw className={cn("dy-h-3 dy-w-3 dy-mr-1.5", isReplacing && "dy-animate-spin")} />
              {isReplacing ? "Replacing..." : "Replace File"}
            </Button>
          )}
        </div>

        <Tabs defaultValue="metadata" className="dy-w-full">
          <TabsList className="dy-grid dy-grid-cols-3 dy-h-8 dy-p-0.5 dy-bg-muted/40">
            <TabsTrigger value="metadata" className="dy-text-xs dy-h-7">
              Metadata
            </TabsTrigger>
            <TabsTrigger value="transforms" className="dy-text-xs dy-h-7">
              Transforms
            </TabsTrigger>
            {isImage && (
              <TabsTrigger value="focal" className="dy-text-xs dy-h-7">
                Focal Point
              </TabsTrigger>
            )}
          </TabsList>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="dy-space-y-4 dy-pt-3">
            <div className="dy-grid dy-grid-cols-2 dy-gap-2 dy-p-3 dy-rounded-lg dy-bg-muted/20 dy-border dy-border-border/40 dy-text-xs">
              <div>
                <span className="dy-text-muted-foreground">Dimensions:</span>
                <p className="dy-font-medium dy-mt-0.5">
                  {item.width && item.height ? `${item.width} × ${item.height}` : "—"}
                </p>
              </div>
              <div>
                <span className="dy-text-muted-foreground">File Size:</span>
                <p className="dy-font-medium dy-mt-0.5">{formatBytes(item.filesize)}</p>
              </div>
              <div>
                <span className="dy-text-muted-foreground">MIME Type:</span>
                <p className="dy-font-medium dy-mt-0.5 dy-truncate">{item.mimeType || "—"}</p>
              </div>
              <div>
                <span className="dy-text-muted-foreground">Aspect Ratio:</span>
                <p className="dy-font-medium dy-mt-0.5">
                  {item.aspectRatio ? item.aspectRatio.toFixed(2) : "—"}
                </p>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="dy-space-y-3">
              <div className="dy-space-y-1.5">
                <Label htmlFor="alt" className="dy-text-xs">
                  Alt Text
                </Label>
                <Input
                  id="alt"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="Describe image for accessibility"
                  className="dy-h-8 dy-text-xs"
                />
              </div>

              <div className="dy-space-y-1.5">
                <Label htmlFor="caption" className="dy-text-xs">
                  Caption
                </Label>
                <Input
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Optional caption"
                  className="dy-h-8 dy-text-xs"
                />
              </div>

              {folders.length > 0 && (
                <div className="dy-space-y-1.5">
                  <Label htmlFor="folder" className="dy-text-xs">
                    Folder
                  </Label>
                  <Select value={folderId} onValueChange={setFolderId}>
                    <SelectTrigger id="folder" className="dy-h-8 dy-text-xs">
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">
                        <span className="dy-text-muted-foreground">None (Root Folder)</span>
                      </SelectItem>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          <div className="dy-flex dy-items-center dy-gap-2">
                            <span
                              className="dy-h-2 dy-w-2 dy-rounded-full dy-shrink-0"
                              style={{ backgroundColor: f.color || "#64748b" }}
                            />
                            <span>{f.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Dynamic Transforms Tab */}
          <TabsContent value="transforms" className="dy-space-y-3 dy-pt-3">
            <div className="dy-space-y-2">
              <div className="dy-flex dy-items-center dy-justify-between dy-p-2 dy-rounded-md dy-border dy-border-border/40 dy-bg-muted/10">
                <div className="dy-min-w-0">
                  <p className="dy-text-xs dy-font-medium">Original CDN URL</p>
                  <p className="dy-text-[10px] dy-text-muted-foreground dy-truncate">{cdnUrl}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="dy-h-7 dy-px-2 dy-text-xs"
                  onClick={() => handleCopy(cdnUrl, "original")}
                >
                  {copiedKey === "original" ? <Check className="dy-h-3 dy-w-3 dy-text-emerald-500" /> : <Copy className="dy-h-3 dy-w-3" />}
                </Button>
              </div>

              {isImage && (
                <>
                  <div className="dy-flex dy-items-center dy-justify-between dy-p-2 dy-rounded-md dy-border dy-border-border/40 dy-bg-muted/10">
                    <div className="dy-min-w-0">
                      <p className="dy-text-xs dy-font-medium">Thumbnail (300×300 WebP)</p>
                      <p className="dy-text-[10px] dy-text-muted-foreground dy-truncate">{thumbUrl}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="dy-h-7 dy-px-2 dy-text-xs"
                      onClick={() => handleCopy(thumbUrl, "thumb")}
                    >
                      {copiedKey === "thumb" ? <Check className="dy-h-3 dy-w-3 dy-text-emerald-500" /> : <Copy className="dy-h-3 dy-w-3" />}
                    </Button>
                  </div>

                  <div className="dy-flex dy-items-center dy-justify-between dy-p-2 dy-rounded-md dy-border dy-border-border/40 dy-bg-muted/10">
                    <div className="dy-min-w-0">
                      <p className="dy-text-xs dy-font-medium">WebP Auto-Optimized</p>
                      <p className="dy-text-[10px] dy-text-muted-foreground dy-truncate">{webpUrl}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="dy-h-7 dy-px-2 dy-text-xs"
                      onClick={() => handleCopy(webpUrl, "webp")}
                    >
                      {copiedKey === "webp" ? <Check className="dy-h-3 dy-w-3 dy-text-emerald-500" /> : <Copy className="dy-h-3 dy-w-3" />}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Focal Point Tab */}
          {isImage && (
            <TabsContent value="focal" className="dy-space-y-3 dy-pt-3">
              <p className="dy-text-xs dy-text-muted-foreground">
                Click or drag the crosshair to set the focal point for smart dynamic cropping.
              </p>
              <div className="dy-flex dy-justify-center">
                <FocalPointPicker
                  url={previewUrl}
                  value={focalPoint}
                  onChange={(fp) => setFocalPoint(fp)}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Footer Actions */}
      <div className="dy-p-3 dy-border-t dy-border-border/60 dy-flex dy-items-center dy-justify-between dy-gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="dy-text-destructive hover:dy-bg-destructive/10 dy-h-8 dy-text-xs"
          onClick={() => {
            onDelete(item.id);
            onClose();
          }}
        >
          <Trash2 className="dy-h-3.5 dy-w-3.5 dy-mr-1.5" />
          Delete
        </Button>

        <div className="dy-flex dy-items-center dy-gap-2">
          <Button variant="outline" size="sm" className="dy-h-8 dy-text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="dy-h-8 dy-text-xs" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </>
  );
}
