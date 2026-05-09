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
    <div className="flex flex-col h-full bg-muted/20 border-l border-border/60">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-border/40">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${viewMode === 'desktop' ? 'bg-muted' : ''}`}
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${viewMode === 'mobile' ? 'bg-muted' : ''}`}
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>

          {viewMode === 'desktop' && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border/40">
              <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mr-1">Zoom</span>
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

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reload}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-0 overflow-hidden bg-muted/5">
        <div
          className={`bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 overflow-hidden border border-border/40 ${viewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'
            }`}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="border-none transition-transform duration-300"
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
