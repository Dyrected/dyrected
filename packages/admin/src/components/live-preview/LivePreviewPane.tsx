import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { ExternalLink, Smartphone, Monitor, RotateCcw } from 'lucide-react';

interface LivePreviewPaneProps {
  previewUrl: string;
  data: any;
  mode?: 'postMessage' | 'token';
}

export function LivePreviewPane({ previewUrl, data, mode = 'postMessage' }: LivePreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [zoom, setZoom] = useState(0.50); // 85% zoom by default for desktop

  // Handle postMessage communication
  useEffect(() => {
    if (mode !== 'postMessage') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'dyrected-live-preview-ready') {
        setIsReady(true);
        // Send initial data once ready
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'dyrected-live-preview', data },
          '*'
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mode, data]);

  // Sync data whenever it changes
  useEffect(() => {
    if (mode === 'postMessage' && isReady) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'dyrected-live-preview', data },
        '*'
      );
    }
  }, [data, isReady, mode]);

  const reload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = previewUrl;
      setIsReady(false);
    }
  };

  return (
    <div className="dy-flex dy-flex-col dy-h-full dy-bg-muted/20 dy-border-l dy-border-border/60">
      <div className="dy-flex dy-items-center dy-justify-between dy-px-4 dy-py-2 dy-bg-white dy-border-b dy-border-border/40">
        <div className="dy-flex dy-items-center dy-gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${viewMode === 'desktop' ? 'bg-muted' : ''}`}
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="dy-h-4 dy-w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${viewMode === 'mobile' ? 'bg-muted' : ''}`}
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
                  className={`h-7 px-2 text-[10px] font-medium ${zoom === z ? 'bg-primary/10 text-primary' : 'text-muted-foreground/60'}`}
                  onClick={() => setZoom(z)}
                >
                  {Math.round(z * 100)}%
                </Button>
              ))}
            </div>
          )}
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
          className={`bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 overflow-hidden border border-border/40 ${viewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'
            }`}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="dy-border-none dy-transition-transform dy-duration-300"
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
