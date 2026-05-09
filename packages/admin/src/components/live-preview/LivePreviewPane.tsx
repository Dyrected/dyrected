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

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div 
          className={`bg-white shadow-2xl transition-all duration-300 overflow-hidden rounded-md border border-border/40 ${
            viewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'
          }`}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full border-none"
            title="Live Preview"
          />
        </div>
      </div>
    </div>
  );
}
