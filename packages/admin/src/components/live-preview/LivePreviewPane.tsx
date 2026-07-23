import { useEffect, useRef, useState } from 'react';
import { PREVIEW_TOKEN_PARAM } from '@dyrected/sdk';
import { Button } from '../ui/button';
import { ExternalLink, Smartphone, Monitor, RotateCcw, MousePointer2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDyrected } from '../../providers/dyrected-context';

interface LivePreviewPaneProps {
  previewUrl: string;
  data: any;
  mode?: 'postMessage' | 'token';
  /** Collection slug, required to mint a preview token in `token` mode. */
  collectionSlug?: string;
  /** Current document id (omitted for new/unsaved documents). */
  documentId?: string;
  onFieldFocus?: (path: string) => void;
}

/** Append the preview token to a resolved (absolute) preview URL. */
function withPreviewToken(url: string, token: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set(PREVIEW_TOKEN_PARAM, token);
    return u.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}${PREVIEW_TOKEN_PARAM}=${encodeURIComponent(token)}`;
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '';
  }
}

export function LivePreviewPane({ previewUrl, data, mode = 'postMessage', collectionSlug, documentId, onFieldFocus }: LivePreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const latestDataRef = useRef(data);
  const { client } = useDyrected();
  const [isReady, setIsReady] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [zoom, setZoom] = useState(0.75);
  const [editMode, setEditMode] = useState(true);

  // Token mode: mint a short-lived token carrying the draft and load the iframe
  // at `previewUrl?dyPreview=<token>`, so a server-rendered frontend can fetch
  // the draft during its render. Refresh-based (a mint + reload per change),
  // debounced so we don't mint on every keystroke.
  const [tokenSrc, setTokenSrc] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const lastDataKeyRef = useRef<string | null>(null);

  // Serialize the draft to a stable primitive so this effect only re-runs when
  // the data actually changes — not on every parent render. Depending on the
  // `data` object directly made the effect thrash: each render cancelled the
  // in-flight mint (via the cleanup below), so a token that minted successfully
  // was discarded before it could reach the iframe, and the debounce timer kept
  // getting cleared. `dataKey` changes only on a real edit, so cancellation now
  // means "the draft changed again", which is exactly when we want to discard a
  // stale mint.
  const dataKey = safeStringify(data);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (mode !== 'token' || !client || !collectionSlug) return;
    if (dataKey === lastDataKeyRef.current) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { token } = await client.createPreviewToken({ collectionSlug, documentId, data });
        if (cancelled) return;
        lastDataKeyRef.current = dataKey;
        setTokenSrc(withPreviewToken(previewUrl, token));
        setTokenError(null);
      } catch (err) {
        if (cancelled) return;
        setTokenError(err instanceof Error ? err.message : 'Failed to create preview token.');
      }
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `data` is intentionally read from the closure; `dataKey` is its stable
    // primitive proxy and drives re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, client, collectionSlug, documentId, previewUrl, dataKey]);

  // The URL actually loaded into the iframe. In token mode we wait for the first
  // token before adding it; until then the frame shows published content.
  const iframeSrc = mode === 'token' ? tokenSrc ?? previewUrl : previewUrl;

  // Handle postMessage communication
  useEffect(() => {
    if (mode !== 'postMessage') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'dyrected-live-preview-ready') {
        setIsReady(true);
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'dyrected-live-preview', data: latestDataRef.current },
          '*'
        );
      }

      if (event.data?.type === 'dyrected-element-clicked' && event.data.path) {
        onFieldFocus?.(event.data.path);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mode, onFieldFocus]);

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
      iframeRef.current.src = 'about:blank';
      iframeRef.current.src = iframeSrc;
      setIsReady(false);
      // Keep edit mode on across reloads — it re-arms once the iframe is ready.
    }
  };

  return (
    <div className="dy-flex dy-flex-col dy-h-full dy-bg-muted/20 dy-border-l dy-border-border/60">
      <div className="dy-flex dy-items-center dy-justify-between dy-px-4 dy-py-2 dy-bg-background dy-border-b dy-border-border/40">
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

          {/* Edit Mode toggle — enables click-to-edit in the preview iframe */}
          <div className="dy-ml-2 dy-pl-2 dy-border-l dy-border-border/40">
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
              <span className='sm:dy-hidden'> {editMode ? 'Editing' : 'Edit'}</span>
            </Button>
          </div>
        </div>

        <div className="dy-flex dy-items-center dy-gap-2">
          {mode === 'token' && tokenError && (
            <span
              className="dy-text-[11px] dy-font-medium dy-text-destructive dy-truncate dy-max-w-[220px]"
              title={tokenError}
            >
              Preview token failed
            </span>
          )}
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
          className={`dy-bg-background dy-shadow-[0_20px_50px_rgba(0,0,0,0.1)] dy-transition-all dy-duration-500 dy-overflow-hidden dy-border dy-border-border/40 ${viewMode === 'mobile' ? 'dy-w-[375px] dy-h-[667px]' : 'dy-w-full dy-h-full'
            }`}
        >
          <iframe
            ref={iframeRef}
            src={iframeSrc}
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
