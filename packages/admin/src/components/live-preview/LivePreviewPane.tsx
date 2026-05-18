import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { ExternalLink, Smartphone, Monitor, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LivePreviewPaneProps {
  previewUrl: string;
  data: any;
  mode?: 'postMessage' | 'token';
  onFieldFocus?: (path: string) => void;
}

export function LivePreviewPane({ previewUrl, data, mode = 'postMessage', onFieldFocus }: LivePreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [zoom, setZoom] = useState(0.50);
  const [editMode, setEditMode] = useState(false);

  // Handle postMessage communication
  useEffect(() => {
    if (mode !== 'postMessage') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'dyrected-live-preview-ready') {
        setIsReady(true);
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'dyrected-live-preview', data },
          '*'
        );
      }

      if (event.data?.type === 'dyrected-element-clicked' && event.data.path) {
        onFieldFocus?.(event.data.path);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mode, data, onFieldFocus]);

  // Sync data whenever it changes
  useEffect(() => {
    if (mode === 'postMessage' && isReady) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'dyrected-live-preview', data },
        '*'
      );
    }
  }, [data, isReady, mode]);

  // Notify iframe when edit mode changes
  useEffect(() => {
    if (!isReady) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: editMode ? 'dyrected-enter-edit-mode' : 'dyrected-exit-edit-mode' },
      '*'
    );
  }, [editMode, isReady]);

  const reload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = previewUrl;
      setIsReady(false);
      setEditMode(false);
    }
  };

  return (
    <div className="dy-flex dy-flex-col dy-h-full dy-bg-muted/20 dy-border-l dy-border-border/60">
      <div className="dy-flex dy-items-center dy-justify-between dy-px-4 dy-py-2 dy-bg-white dy-border-b dy-border-border/40">
        <div className="dy-flex dy-items-center dy-gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`dy-h-8 dy-w-8 ${viewMode === 'desktop' ? 'dy-bg-muted' : ''}`}
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="dy-h-4 dy-w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`dy-h-8 dy-w-8 ${viewMode === 'mobile' ? 'dy-bg-muted' : ''}`}
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="dy-h-4 dy-w-4" />
          </Button>

          {viewMode === 'desktop' && (
            <div className="dy-flex dy-items-center dy-gap-1 dy-ml-2 dy-pl-2 dy-border-l dy-border-border/40">
              <span className="dy-text-[10px] dy-font-bold dy-text-muted-foreground/50 dy-uppercase dy-tracking-wider dy-mr-1">Zoom</span>
              {[0.50, 0.75, 1.0].map((z) => (
                <Button
                  key={z}
                  variant="ghost"
                  size="sm"
                  className={`dy-h-7 dy-px-2 dy-text-[10px] dy-font-medium ${zoom === z ? 'dy-bg-primary/10 dy-text-primary' : 'dy-text-muted-foreground/60'}`}
                  onClick={() => setZoom(z)}
                >
                  {Math.round(z * 100)}%
                </Button>
              ))}
            </div>
          )}

          {/* Edit Mode toggle hidden for now */}
          {/* <div className="dy-ml-2 dy-pl-2 dy-border-l dy-border-border/40">
            <Button
              variant="ghost"
              size="sm"
              title={editMode ? 'Exit Edit Mode' : 'Enter Edit Mode — click elements to focus fields'}
              className={cn(
                'dy-h-7 dy-gap-1.5 dy-px-2 dy-text-[11px] dy-font-semibold dy-transition-all',
                editMode
                  ? 'dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary/90'
                  : 'dy-text-muted-foreground/60 hover:dy-text-foreground'
              )}
              onClick={() => setEditMode(v => !v)}
            >
              <MousePointer2 className="dy-h-3.5 dy-w-3.5" />
              {editMode ? 'Editing' : 'Edit'}
            </Button>
          </div> */}
        </div>

        <div className="dy-flex dy-items-center dy-gap-2">
          <Button variant="ghost" size="icon" className="dy-h-8 dy-w-8" onClick={reload}>
            <RotateCcw className="dy-h-3.5 dy-w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="dy-h-8 dy-w-8" asChild>
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="dy-h-3.5 dy-w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <div className="dy-flex-1 dy-flex dy-items-center dy-justify-center dy-p-0 dy-overflow-hidden dy-bg-muted/5">
        <div
          className={`dy-bg-white dy-shadow-[0_20px_50px_rgba(0,0,0,0.1)] dy-transition-all dy-duration-500 dy-overflow-hidden dy-border dy-border-border/40 ${viewMode === 'mobile' ? 'dy-w-[375px] dy-h-[667px]' : 'dy-w-full dy-h-full'
            }`}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className={cn(
              'dy-border-none dy-transition-transform dy-duration-300',
              editMode && 'dy-cursor-crosshair'
            )}
            style={viewMode === 'desktop' ? {
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            } : {
              width: '100%',
              height: '100%',
            }}
            title="Live Preview"
          />
        </div>
      </div>
    </div>
  );
}
