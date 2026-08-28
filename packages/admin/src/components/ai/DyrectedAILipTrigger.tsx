'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  AlertCircle,
  MessageSquare,
  History,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Trash2,
  X,
  RefreshCw,
  FileText,
  Search,
  Database,
  BarChart2,
  Layers,
  Sliders,
  Settings,
  Wrench,
  Copy,
  Check,
  RotateCcw,
  Edit3,
  AlertTriangle,
  Brain,
} from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { diffWords } from 'diff';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from '@/components/ai-elements/prompt-input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useDyrected } from '@/providers/dyrected-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const DEFAULT_PANEL_WIDTH = 440;
const MIN_PANEL_WIDTH = 340;

export function DyrectedAILipTrigger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const aiThreadParam = searchParams.get('aiThread');

  // Persist open state in localStorage so navigating pages preserves the drawer
  const [isOpenState, setIsOpenState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (aiThreadParam !== null) return true;
    return localStorage.getItem('dyrected_ai_open') === 'true';
  });

  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    if (aiThreadParam) return aiThreadParam === 'new' ? null : aiThreadParam;
    const saved = localStorage.getItem('dyrected_ai_active_thread');
    return saved && saved !== 'new' ? saved : null;
  });

  // Sync if URL query explicitly provides aiThread param
  useEffect(() => {
    if (aiThreadParam !== null) {
      setIsOpenState(true);
      const tid = aiThreadParam === 'new' ? null : aiThreadParam;
      setActiveThreadId(tid);
      localStorage.setItem('dyrected_ai_open', 'true');
      localStorage.setItem('dyrected_ai_active_thread', aiThreadParam);
    }
  }, [aiThreadParam]);

  const isOpen = isOpenState;

  // Resizable panel width state (stored in localStorage)
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_PANEL_WIDTH;
    const saved = localStorage.getItem('dyrected_ai_panel_width');
    const parsed = saved ? parseInt(saved, 10) : DEFAULT_PANEL_WIDTH;
    return isNaN(parsed) ? DEFAULT_PANEL_WIDTH : Math.max(MIN_PANEL_WIDTH, Math.min(parsed, 1200));
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const maxWidth = Math.min(window.innerWidth * 0.75, 1100);
      const nextWidth = Math.max(MIN_PANEL_WIDTH, Math.min(startWidth + deltaX, maxWidth));
      setPanelWidth(nextWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setPanelWidth((curr) => {
        localStorage.setItem('dyrected_ai_panel_width', String(curr));
        return curr;
      });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [panelWidth]);

  const handleResetWidth = useCallback(() => {
    setPanelWidth(DEFAULT_PANEL_WIDTH);
    localStorage.setItem('dyrected_ai_panel_width', String(DEFAULT_PANEL_WIDTH));
  }, []);

  const handleOpen = useCallback((threadId?: string | null) => {
    setIsOpenState(true);
    const target = threadId || null;
    setActiveThreadId(target);
    localStorage.setItem('dyrected_ai_open', 'true');
    localStorage.setItem('dyrected_ai_active_thread', target || 'new');
  }, []);

  const handleClose = useCallback(() => {
    setIsOpenState(false);
    localStorage.setItem('dyrected_ai_open', 'false');
    if (searchParams.has('aiThread')) {
      const next = new URLSearchParams(searchParams);
      next.delete('aiThread');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSelectThread = useCallback((threadId: string | null) => {
    setActiveThreadId(threadId);
    localStorage.setItem('dyrected_ai_active_thread', threadId || 'new');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          handleOpen(activeThreadId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeThreadId, handleOpen, handleClose]);

  return (
    <>
      {/* Desktop View */}
      {!isMobile && (
        <>
          {/* Docked Right Sidebar (Desktop, when Open) */}
          {isOpen && (
            <aside
              aria-label="Dyrected AI Assistant"
              style={{ width: `${panelWidth}px` }}
              className={cn(
                'dy-flex dy-flex-col dy-h-full dy-border-l dy-border-border/60 dy-bg-background dy-shrink-0 dy-relative dy-z-20 dy-animate-in dy-slide-in-from-right-6 dy-duration-200',
                isResizing && 'dy-select-none dy-transition-none'
              )}
            >
              {/* VS Code-style Resizing Handle on the left border */}
              <div
                onMouseDown={startResizing}
                onDoubleClick={handleResetWidth}
                title="Drag to resize width, double-click to reset (440px)"
                className={cn(
                  'dy-absolute dy-top-0 dy-bottom-0 -dy-left-1.5 dy-w-3 dy-cursor-col-resize dy-z-30 dy-group dy-flex dy-items-center dy-justify-center hover:dy-bg-primary/10 dy-transition-colors',
                  isResizing && 'dy-bg-primary/20'
                )}
              >
                <div
                  className={cn(
                    'dy-w-[2px] dy-h-12 dy-rounded-full dy-bg-border/60 group-hover:dy-bg-primary/80 group-hover:dy-w-[3px] dy-transition-all',
                    isResizing && 'dy-bg-primary dy-w-[3px] dy-h-20'
                  )}
                />
              </div>

              <DyrectedAIChatPanel
                key={activeThreadId || 'new'}
                threadId={activeThreadId}
                onSelectThread={handleSelectThread}
                onClose={handleClose}
              />
            </aside>
          )}

          {/* Floating Lip Trigger (Desktop, when Closed) */}
          {!isOpen && (
            <button
              type="button"
              onClick={() => handleOpen(activeThreadId)}
              aria-label="Open AI Assistant (Cmd+J)"
              className={cn(
                'dy-fixed dy-right-0 dy-top-1/2 -dy-translate-y-1/2 dy-z-40 dy-flex dy-flex-col dy-items-center dy-gap-1.5 dy-px-2 dy-py-3.5 dy-bg-primary dy-text-primary-foreground dy-rounded-l-xl dy-shadow-xl hover:dy-pr-3.5 hover:dy-shadow-2xl dy-transition-all dy-duration-200 dy-group dy-cursor-pointer dy-border-y dy-border-l dy-border-primary/20'
              )}
            >
              <Sparkles className="dy-w-4 dy-h-4 dy-text-primary-foreground group-hover:dy-scale-110 dy-transition-transform" />
              <kbd className="dy-text-[9px] dy-bg-primary-foreground/20 dy-px-1 dy-py-0.5 dy-rounded dy-font-mono dy-select-none">
                ⌘J
              </kbd>
            </button>
          )}
        </>
      )}

      {/* Mobile View */}
      {isMobile && (
        <>
          {/* Mobile Floating Action Button (Mobile, when Closed) */}
          {!isOpen && (
            <button
              type="button"
              onClick={() => handleOpen(activeThreadId)}
              aria-label="Open Dyrected AI Assistant"
              className="dy-fixed dy-bottom-5 dy-right-5 dy-z-40 dy-flex dy-p-3.5 dy-bg-primary dy-text-primary-foreground dy-rounded-full dy-shadow-2xl active:dy-scale-95 dy-transition-transform"
            >
              <Sparkles className="dy-w-5 dy-h-5" />
            </button>
          )}

          {/* Mobile Slide-over Drawer (Mobile, when Open) */}
          {isOpen && (
            <Sheet open={isOpen} onOpenChange={(open) => (open ? handleOpen(activeThreadId) : handleClose())}>
              <SheetContent
                side="right"
                hideCloseButton
                className="dy-w-full sm:dy-max-w-md dy-p-0 dy-flex dy-flex-col dy-h-full dy-border-l dy-border-border/60"
              >
                <DyrectedAIChatPanel
                  key={activeThreadId || 'new'}
                  threadId={activeThreadId}
                  onSelectThread={handleSelectThread}
                  onClose={handleClose}
                />
              </SheetContent>
            </Sheet>
          )}
        </>
      )}
    </>
  );
}

function TypingDots() {
  return (
    <div className="dy-flex dy-items-center dy-gap-1 dy-py-1 dy-px-0.5" aria-label="Thinking">
      <span className="dy-w-1.5 dy-h-1.5 dy-bg-muted-foreground/70 dy-rounded-full dy-animate-bounce" />
      <span className="dy-w-1.5 dy-h-1.5 dy-bg-muted-foreground/70 dy-rounded-full dy-animate-bounce [animation-delay:0.15s]" />
      <span className="dy-w-1.5 dy-h-1.5 dy-bg-muted-foreground/70 dy-rounded-full dy-animate-bounce [animation-delay:0.3s]" />
    </div>
  );
}

function extractReasoningAndResponse(message: any, isComplete: boolean) {
  let reasoningFromParts = '';
  let textFromParts = '';

  if (Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (part.type === 'reasoning') {
        reasoningFromParts += (part.text || part.reasoning || '');
      } else if (part.type === 'text') {
        textFromParts += (part.text || '');
      }
    }
  }

  const rawContent = textFromParts || (typeof message.content === 'string' ? message.content : '');

  // Parse <think>...</think> or <thought>...</thought> tags if present in text
  const thinkRegex = /<(?:think|thought)>([\s\S]*?)(?:<\/(?:think|thought)>|$)/i;
  const match = rawContent.match(thinkRegex);

  let thinking = reasoningFromParts;
  let finalResponse = rawContent;

  if (match) {
    const extractedThink = match[1] || '';
    thinking = (thinking ? thinking + '\n\n' : '') + extractedThink.trim();
    finalResponse = rawContent.replace(/<(?:think|thought)>[\s\S]*?(?:<\/(?:think|thought)>|$)/gi, '').trim();
  }

  const isStillThinking =
    !isComplete &&
    Boolean(
      match &&
      !rawContent.includes('</think>') &&
      !rawContent.includes('</thought>') &&
      !finalResponse
    );

  return {
    thinking: thinking.trim(),
    finalResponse,
    isStillThinking,
  };
}

function AIReasoningAccordion({
  thinking,
  isStillThinking = false,
}: {
  thinking: string;
  isStillThinking?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(isStillThinking);

  // If streaming and currently thinking, keep open
  useEffect(() => {
    if (isStillThinking) {
      setIsOpen(true);
    }
  }, [isStillThinking]);

  if (!thinking && !isStillThinking) return null;

  return (
    <div className="dy-mb-2.5 dy-rounded-lg dy-border dy-border-border/60 dy-bg-muted/20 dy-overflow-hidden dy-text-xs dy-transition-all">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="dy-w-full dy-px-3 dy-py-1.5 dy-flex dy-items-center dy-justify-between dy-gap-2 dy-text-left hover:dy-bg-muted/40 dy-transition-colors group"
      >
        <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
          <Brain
            className={cn(
              'dy-w-3.5 dy-h-3.5 dy-shrink-0',
              isStillThinking
                ? 'dy-text-primary dy-animate-pulse'
                : 'dy-text-muted-foreground group-hover:dy-text-foreground'
            )}
          />
          <span className="dy-font-medium dy-truncate dy-text-muted-foreground group-hover:dy-text-foreground">
            {isStillThinking ? 'Thinking...' : 'Reasoning process'}
          </span>
        </div>

        <div className="dy-flex dy-items-center dy-gap-1 dy-text-[10px] dy-text-muted-foreground/80 dy-shrink-0">
          <span>{isOpen ? 'Hide' : 'Show'}</span>
          {isOpen ? (
            <ChevronDown className="dy-w-3 dy-h-3" />
          ) : (
            <ChevronRight className="dy-w-3 dy-h-3" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="dy-px-3 dy-pb-2.5 dy-pt-1 dy-border-t dy-border-border/30 dy-bg-background/40">
          <div className="dy-pl-2.5 dy-border-l-2 dy-border-primary/40 dy-font-mono dy-text-[11px] dy-leading-relaxed dy-text-muted-foreground dy-whitespace-pre-wrap dy-break-words">
            {thinking || (isStillThinking ? 'Reasoning in progress...' : '')}
          </div>
        </div>
      )}
    </div>
  );
}

function extractToolInvocation(tp: any, isMessageComplete: boolean) {
  const inv = tp.toolInvocation || tp;
  let toolName =
    inv.toolName ||
    inv.name ||
    tp.toolName ||
    tp.name;

  if (
    !toolName &&
    typeof tp.type === 'string' &&
    tp.type.startsWith('tool-') &&
    tp.type !== 'tool-invocation' &&
    tp.type !== 'tool-call' &&
    tp.type !== 'tool-result'
  ) {
    toolName = tp.type.replace(/^tool-/, '');
  }

  const args = inv.args || inv.input || inv.parameters || tp.args || tp.input || {};
  const result = inv.result ?? inv.output ?? tp.result ?? tp.output;

  // Infer toolName from arguments if missing or generic
  if (!toolName || toolName === 'tool' || toolName === 'tool-invocation') {
    if (args.query !== undefined) toolName = 'searchContent';
    else if (args.aggregates !== undefined) toolName = 'aggregateCollection';
    else if (args.collection !== undefined && args.id !== undefined) toolName = 'getDocument';
    else if (args.collection !== undefined) toolName = 'queryCollection';
    else if (args.global !== undefined) toolName = 'getGlobalSchema';
    else toolName = 'CMS Action';
  }

  const isDone =
    isMessageComplete ||
    inv.state === 'result' ||
    tp.state === 'result' ||
    result !== undefined ||
    tp.type === 'tool-result';

  return {
    inv,
    toolName,
    args,
    result,
    isDone,
  };
}

function getToolDisplayInfo(item: ReturnType<typeof extractToolInvocation>) {
  const { toolName, args, result, isDone } = item;

  switch (toolName) {
    case 'searchContent': {
      const q = args.query ? `"${args.query}"` : 'knowledge base';
      return {
        label: isDone
          ? `Searched content for ${q}`
          : `Searching knowledge base for ${q}...`,
        icon: Search,
        details: isDone
          ? `${result?.sources?.length ?? 0} matches found`
          : 'Querying vector embeddings...',
        sources: result?.sources || [],
      };
    }
    case 'queryCollection': {
      const col = args.collection || 'collection';
      return {
        label: isDone ? `Queried ${col}` : `Querying ${col}...`,
        icon: Database,
        details: isDone
          ? `${result?.docs?.length ?? result?.total ?? 0} items retrieved`
          : 'Applying filters and pagination...',
      };
    }
    case 'getDocument': {
      const col = args.collection || 'entry';
      return {
        label: isDone
          ? `Fetched ${col} #${args.id || ''}`
          : `Fetching ${col} #${args.id || ''}...`,
        icon: FileText,
        details: isDone ? 'Record loaded' : 'Reading database record...',
      };
    }
    case 'aggregateCollection': {
      const col = args.collection || 'collection';
      return {
        label: isDone
          ? `Computed metrics on ${col}`
          : `Computing statistics for ${col}...`,
        icon: BarChart2,
        details: isDone ? 'Calculated aggregates' : 'Running database aggregation...',
      };
    }
    case 'listCollections': {
      return {
        label: isDone ? 'Discovered content sections' : 'Checking available collections...',
        icon: Layers,
        details: isDone ? `${result?.collections?.length ?? 0} collections` : 'Inspecting CMS registry...',
      };
    }
    case 'getCollectionSchema': {
      const col = args.collection || 'collection';
      return {
        label: isDone ? `Inspected ${col} schema` : `Reading ${col} structure...`,
        icon: Sliders,
        details: isDone ? 'Fields & relationships loaded' : 'Inspecting field types...',
      };
    }
    case 'listGlobals':
    case 'getGlobalSchema': {
      const g = args.global || args.slug || 'site settings';
      return {
        label: isDone ? `Loaded ${g}` : `Checking ${g}...`,
        icon: Settings,
        details: isDone ? 'Global values loaded' : 'Reading singleton...',
      };
    }
    case 'proposeCreateDocument': {
      return {
        label: isDone ? `Proposed new ${args.collection || 'document'}` : `Drafting new ${args.collection || 'document'}...`,
        icon: Plus,
        details: isDone ? 'Proposal created for review' : 'Validating fields...',
        action: result?.requiresApproval ? result : undefined,
      };
    }
    case 'proposeUpdateDocument': {
      return {
        label: isDone ? `Proposed update for ${args.collection || 'document'} #${args.id || ''}` : `Drafting update for ${args.collection || 'document'}...`,
        icon: Edit3,
        details: isDone ? 'Proposal created for review' : 'Capturing current snapshot...',
        action: result?.requiresApproval ? result : undefined,
      };
    }
    case 'proposeDeleteDocument': {
      return {
        label: isDone ? `Proposed deleting ${args.collection || 'document'} #${args.id || ''}` : `Drafting deletion request...`,
        icon: Trash2,
        details: isDone ? 'Deletion proposal created' : 'Checking relations...',
        action: result?.requiresApproval ? result : undefined,
      };
    }
    case 'proposeUpdateGlobal': {
      return {
        label: isDone ? `Proposed updating global "${args.global || 'settings'}"` : `Drafting global update...`,
        icon: Settings,
        details: isDone ? 'Settings proposal created' : 'Validating schema...',
        action: result?.requiresApproval ? result : undefined,
      };
    }
    default: {
      const formatted = toolName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str: string) => str.toUpperCase())
        .trim();
      return {
        label: isDone ? `Executed ${formatted}` : `Running ${formatted}...`,
        icon: Wrench,
        details: isDone ? 'Action completed' : 'Processing...',
      };
    }
  }
}

function isHtmlContent(str: string): boolean {
  if (typeof str !== 'string') return false;
  return /<[a-z][\s\S]*>/i.test(str);
}

function cleanHtmlToText(html: string): string {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function WordDiffViewer({
  before,
  after,
}: {
  before: string | null;
  after: string;
}) {
  const parts = useMemo<Array<{ value: string; added?: boolean; removed?: boolean }>>(() => {
    if (!before) {
      return [{ value: after, added: true, removed: false }];
    }
    return diffWords(before, after);
  }, [before, after]);

  return (
    <div className="dy-font-sans dy-text-[11.5px] dy-leading-relaxed dy-p-2.5 dy-rounded-md dy-bg-background/80 dy-border dy-border-border/40 dy-max-h-60 dy-overflow-y-auto dy-whitespace-pre-wrap dy-select-text">
      {parts.map((part, index) => {
        if (part.added) {
          return (
            <ins
              key={index}
              className="dy-bg-emerald-500/15 dy-text-emerald-800 dark:dy-text-emerald-300 dy-no-underline dy-px-1 dy-py-0.5 dy-rounded-sm dy-font-medium"
            >
              {part.value}
            </ins>
          );
        }
        if (part.removed) {
          return (
            <del
              key={index}
              className="dy-bg-destructive/10 dy-text-muted-foreground/75 dy-line-through dy-px-1 dy-py-0.5 dy-rounded-sm dy-opacity-70"
            >
              {part.value}
            </del>
          );
        }
        return (
          <span key={index} className="dy-text-foreground">
            {part.value}
          </span>
        );
      })}
    </div>
  );
}

function InlineDiffViewer({
  before,
  after,
}: {
  before: string | null;
  after: string;
}) {
  const parts = useMemo<Array<{ value: string; added?: boolean; removed?: boolean }>>(() => {
    if (!before) {
      return [{ value: after, added: true, removed: false }];
    }
    return diffWords(before, after);
  }, [before, after]);

  return (
    <span className="dy-font-mono dy-text-[11px] dy-inline-flex dy-items-baseline dy-gap-1 dy-flex-wrap">
      {parts.map((part, index) => {
        if (part.added) {
          return (
            <ins
              key={index}
              className="dy-bg-emerald-500/15 dy-text-emerald-800 dark:dy-text-emerald-300 dy-no-underline dy-px-1 dy-rounded-sm dy-font-semibold"
            >
              {part.value}
            </ins>
          );
        }
        if (part.removed) {
          return (
            <del
              key={index}
              className="dy-bg-destructive/10 dy-text-muted-foreground/75 dy-line-through dy-px-1 dy-rounded-sm"
            >
              {part.value}
            </del>
          );
        }
        return (
          <span key={index} className="dy-text-foreground">
            {part.value}
          </span>
        );
      })}
    </span>
  );
}

function AIActionProposalCard({
  action,
  baseUrl,
  authHeaders,
}: {
  action: any;
  baseUrl: string;
  authHeaders: Record<string, string>;
}) {
  const queryClient = useQueryClient();
  const [actionStatus, setActionStatus] = useState<string>(action.status || 'pending');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [viewModes, setViewModes] = useState<Record<string, 'diff' | 'draft' | 'source'>>({});

  // Synchronize fresh action status from server on mount / refresh
  useEffect(() => {
    if (!action.actionId || !baseUrl) return;
    let cancelled = false;
    fetch(`${baseUrl}/api/ai/actions/${action.actionId}`, {
      headers: authHeaders,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.action?.status) {
          setActionStatus((prev) => (prev !== data.action.status ? data.action.status : prev));
        }
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, [action.actionId, baseUrl, authHeaders]);

  const executeMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await fetch(`${baseUrl}/api/ai/actions/${action.actionId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to execute proposed mutation');
      }
      return res.json();
    },
    onSuccess: () => {
      setActionStatus('executed');
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Execution failed');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await fetch(`${baseUrl}/api/ai/actions/${action.actionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to reject action');
      }
      return res.json();
    },
    onSuccess: () => {
      setActionStatus('rejected');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Rejection failed');
    },
  });

  const targetName = action.collection || action.global || 'Content';

  const diffEntries = useMemo(() => {
    if (!action.proposedData || typeof action.proposedData !== 'object') return [];
    return Object.entries(action.proposedData).map(([key, newVal]) => {
      const beforeVal = action.beforeSnapshot ? action.beforeSnapshot[key] : undefined;
      const rawBefore = beforeVal !== undefined ? (typeof beforeVal === 'string' ? beforeVal : JSON.stringify(beforeVal, null, 2)) : null;
      const rawAfter = typeof newVal === 'string' ? newVal : JSON.stringify(newVal, null, 2);
      const hasHtml = Boolean((rawBefore && isHtmlContent(rawBefore)) || (rawAfter && isHtmlContent(rawAfter)));

      return {
        key,
        rawBefore,
        rawAfter,
        cleanBefore: rawBefore ? cleanHtmlToText(rawBefore) : null,
        cleanAfter: cleanHtmlToText(rawAfter),
        hasHtml,
        isLong: (rawBefore?.length || 0) > 100 || rawAfter.length > 100,
      };
    });
  }, [action.proposedData, action.beforeSnapshot]);

  const hasLongContent = diffEntries.length > 3 || diffEntries.some((d) => d.isLong);
  const displayedEntries = isExpanded || !hasLongContent ? diffEntries : diffEntries.slice(0, 2);

  const isPending = actionStatus === 'pending';
  const isExecuted = actionStatus === 'executed';
  const isRejected = actionStatus === 'rejected';

  const setViewModeForField = (key: string, mode: 'diff' | 'draft' | 'source') => {
    setViewModes((prev) => ({
      ...prev,
      [key]: mode,
    }));
  };

  return (
    <div
      className={cn(
        'dy-my-2 dy-rounded-lg dy-border dy-border-border/60 dy-bg-muted/15 dy-text-xs dy-transition-all dy-overflow-hidden',
        isRejected && 'dy-opacity-60'
      )}
    >
      {/* Minimal Monochrome Header Bar */}
      <div className="dy-px-3 dy-py-2 dy-flex dy-items-center dy-justify-between dy-gap-2 dy-border-b dy-border-border/40">
        <div className="dy-flex dy-items-center dy-gap-1.5 dy-min-w-0">
          <span className="dy-text-muted-foreground">
            {action.type === 'deleteDocument' ? (
              <Trash2 className="dy-w-3.5 dy-h-3.5 dy-text-destructive" />
            ) : action.type === 'createDocument' ? (
              <Plus className="dy-w-3.5 dy-h-3.5" />
            ) : (
              <Edit3 className="dy-w-3.5 dy-h-3.5" />
            )}
          </span>
          <span className="dy-font-mono dy-font-medium dy-text-[11px] dy-text-foreground dy-truncate">
            {action.type === 'createDocument'
              ? `create ${targetName}`
              : action.type === 'deleteDocument'
                ? `delete ${targetName} #${action.documentId}`
                : action.type === 'updateGlobal'
                  ? `global / ${targetName}`
                  : `${targetName} #${action.documentId}`}
          </span>
        </div>

        {/* Right-aligned Action Controls */}
        <div className="dy-flex dy-items-center dy-gap-1.5 dy-shrink-0">
          {isPending && (
            <>
              <button
                type="button"
                disabled={executeMutation.isPending || rejectMutation.isPending}
                onClick={() => executeMutation.mutate()}
                className="dy-px-2.5 dy-py-1 dy-rounded dy-bg-emerald-600 hover:dy-bg-emerald-700 active:dy-scale-95 dy-text-white dy-font-medium dy-text-[11px] dy-flex dy-items-center dy-gap-1 dy-transition-all disabled:dy-opacity-50"
              >
                {executeMutation.isPending ? (
                  <RefreshCw className="dy-w-3 dy-h-3 dy-animate-spin" />
                ) : (
                  <Check className="dy-w-3 dy-h-3" />
                )}
                <span>Approve</span>
              </button>

              <button
                type="button"
                disabled={executeMutation.isPending || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
                title="Discard proposal"
                className="dy-p-1 dy-rounded hover:dy-bg-muted dy-text-muted-foreground hover:dy-text-foreground dy-transition-colors disabled:dy-opacity-50"
              >
                <X className="dy-w-3.5 dy-h-3.5" />
              </button>
            </>
          )}

          {isExecuted && (
            <span className="dy-px-2 dy-py-0.5 dy-rounded dy-bg-muted dy-text-muted-foreground dy-text-[10px] dy-font-medium dy-flex dy-items-center dy-gap-1">
              <Check className="dy-w-3 dy-h-3 dy-text-emerald-500" />
              <span>Applied</span>
            </span>
          )}

          {isRejected && (
            <span className="dy-px-2 dy-py-0.5 dy-rounded dy-bg-muted dy-text-muted-foreground dy-text-[10px] dy-font-medium">
              Discarded
            </span>
          )}
        </div>
      </div>

      {/* Clean Diff Body with Word-Level Diffing */}
      <div className="dy-px-3 dy-py-2 dy-space-y-2.5 dy-text-[11px]">
        {action.type === 'deleteDocument' ? (
          <div className="dy-text-destructive/90 dy-flex dy-items-center dy-gap-1.5 dy-font-sans dy-text-xs">
            <AlertTriangle className="dy-w-3.5 dy-h-3.5 dy-shrink-0" />
            <span>Document will be permanently removed upon approval.</span>
          </div>
        ) : (
          <div className="dy-space-y-2.5">
            {displayedEntries.map((entry) => {
              const currentMode = viewModes[entry.key] || 'diff';
              const textBefore = entry.hasHtml ? entry.cleanBefore : entry.rawBefore;
              const textAfter = entry.hasHtml ? entry.cleanAfter : entry.rawAfter;

              return (
                <div key={entry.key} className="dy-space-y-1">
                  <div className="dy-flex dy-items-center dy-justify-between">
                    <span className="dy-font-mono dy-text-muted-foreground dy-font-medium">{entry.key}:</span>
                    {entry.isLong && (
                      <div className="dy-flex dy-items-center dy-gap-1.5 dy-text-[10px] dy-text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => setViewModeForField(entry.key, 'diff')}
                          className={cn(
                            'dy-px-1.5 dy-py-0.5 dy-rounded hover:dy-text-foreground dy-transition-colors',
                            currentMode === 'diff' && 'dy-bg-muted dy-text-foreground dy-font-medium'
                          )}
                        >
                          Diff
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewModeForField(entry.key, 'draft')}
                          className={cn(
                            'dy-px-1.5 dy-py-0.5 dy-rounded hover:dy-text-foreground dy-transition-colors',
                            currentMode === 'draft' && 'dy-bg-muted dy-text-foreground dy-font-medium'
                          )}
                        >
                          Draft
                        </button>
                        {entry.hasHtml && (
                          <button
                            type="button"
                            onClick={() => setViewModeForField(entry.key, 'source')}
                            className={cn(
                              'dy-px-1.5 dy-py-0.5 dy-rounded hover:dy-text-foreground dy-transition-colors',
                              currentMode === 'source' && 'dy-bg-muted dy-text-foreground dy-font-medium'
                            )}
                          >
                            Source
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {entry.isLong ? (
                    currentMode === 'draft' ? (
                      <div className="dy-font-sans dy-text-[11.5px] dy-leading-relaxed dy-p-2.5 dy-rounded-md dy-bg-background/80 dy-border dy-border-border/40 dy-max-h-60 dy-overflow-y-auto dy-whitespace-pre-wrap dy-text-foreground">
                        {textAfter}
                      </div>
                    ) : currentMode === 'source' ? (
                      <pre className="dy-font-mono dy-text-[10.5px] dy-leading-relaxed dy-p-2.5 dy-rounded-md dy-bg-muted/40 dy-border dy-border-border/40 dy-max-h-60 dy-overflow-y-auto dy-whitespace-pre-wrap dy-text-muted-foreground">
                        {entry.rawAfter}
                      </pre>
                    ) : (
                      <WordDiffViewer before={textBefore} after={textAfter} />
                    )
                  ) : (
                    <InlineDiffViewer before={textBefore} after={textAfter} />
                  )}
                </div>
              );
            })}

            {/* Truncation / Expand button */}
            {hasLongContent && (
              <div className="dy-pt-1">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="dy-text-[11px] dy-font-medium dy-text-muted-foreground hover:dy-text-foreground dy-flex dy-items-center dy-gap-1 dy-transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="dy-w-3.5 dy-h-3.5" />
                      <span>Show less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="dy-w-3.5 dy-h-3.5" />
                      <span>Show full diff ({diffEntries.length} field{diffEntries.length === 1 ? '' : 's'})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error notification if failed */}
        {errorMsg && (
          <div className="dy-pt-1 dy-text-destructive dy-text-[11px] dy-flex dy-items-center dy-gap-1 font-sans">
            <AlertCircle className="dy-w-3 dy-h-3 dy-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Bottom Action Bar for Long / Expanded Diffs */}
        {isPending && (hasLongContent || isExpanded) && (
          <div className="dy-pt-2 dy-mt-2 dy-border-t dy-border-border/40 dy-flex dy-items-center dy-gap-2">
            <button
              type="button"
              disabled={executeMutation.isPending || rejectMutation.isPending}
              onClick={() => executeMutation.mutate()}
              className="dy-flex-1 dy-px-3 dy-py-1.5 dy-rounded-md dy-bg-emerald-600 hover:dy-bg-emerald-700 active:dy-scale-[0.99] dy-text-white dy-font-medium dy-text-xs dy-flex dy-items-center dy-justify-center dy-gap-1.5 dy-transition-all disabled:dy-opacity-50"
            >
              {executeMutation.isPending ? (
                <>
                  <RefreshCw className="dy-w-3.5 dy-h-3.5 dy-animate-spin" />
                  <span>Applying Changes...</span>
                </>
              ) : (
                <>
                  <Check className="dy-w-3.5 dy-h-3.5" />
                  <span>Approve & Apply</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={executeMutation.isPending || rejectMutation.isPending}
              onClick={() => rejectMutation.mutate()}
              className="dy-px-3 dy-py-1.5 dy-rounded-md dy-border dy-border-border/80 hover:dy-bg-muted dy-text-muted-foreground hover:dy-text-foreground dy-transition-colors disabled:dy-opacity-50"
            >
              Discard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AIToolExecutionsGroup({
  toolParts,
  isMessageComplete = false,
}: {
  toolParts: any[];
  isMessageComplete?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toolSummaries = useMemo(() => {
    return toolParts.map((tp) => {
      const extracted = extractToolInvocation(tp, isMessageComplete);
      return {
        ...extracted,
        ...getToolDisplayInfo(extracted),
      };
    });
  }, [toolParts, isMessageComplete]);

  const allDone = toolSummaries.every((s) => s.isDone);

  const headerSummary = useMemo(() => {
    if (!allDone) {
      const active = toolSummaries.find((s) => !s.isDone);
      return active?.label || 'Processing CMS actions...';
    }
    if (toolSummaries.length === 1) {
      return toolSummaries[0]?.label || '1 action completed';
    }
    return `${toolSummaries.length} actions completed (${toolSummaries.map((s) => s.label.split(' ')[0]).join(', ')})`;
  }, [allDone, toolSummaries]);

  return (
    <div className="dy-mb-2.5 dy-rounded-lg dy-border dy-border-border/60 dy-bg-muted/30 dy-overflow-hidden dy-text-xs dy-transition-all">
      {/* Collapsible Header Pill */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="dy-w-full dy-px-3 dy-py-2 dy-flex dy-items-center dy-justify-between dy-gap-2 dy-text-left hover:dy-bg-muted/60 dy-transition-colors group"
      >
        <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
          <span
            className={cn(
              'dy-w-2 dy-h-2 dy-rounded-full dy-shrink-0',
              allDone ? 'dy-bg-emerald-500' : 'dy-bg-primary dy-animate-pulse'
            )}
          />
          <span className="dy-font-medium dy-truncate dy-text-foreground/90 group-hover:dy-text-foreground">
            {headerSummary}
          </span>
        </div>

        <div className="dy-flex dy-items-center dy-gap-1.5 dy-text-[11px] dy-text-muted-foreground dy-shrink-0">
          <span>{isOpen ? 'Hide' : 'Details'}</span>
          {isOpen ? (
            <ChevronDown className="dy-w-3.5 dy-h-3.5 dy-transition-transform" />
          ) : (
            <ChevronRight className="dy-w-3.5 dy-h-3.5 dy-transition-transform" />
          )}
        </div>
      </button>

      {/* Expanded Breakdown */}
      {isOpen && (
        <div className="dy-px-3 dy-pb-3 dy-pt-1 dy-space-y-2 dy-border-t dy-border-border/40 dy-bg-background/40">
          {toolSummaries.map((step, sIdx) => {
            const Icon = step.icon;
            return (
              <div key={sIdx} className="dy-space-y-1.5 dy-pt-1">
                <div className="dy-flex dy-items-center dy-justify-between dy-gap-2">
                  <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
                    <div className="dy-p-1 dy-rounded dy-bg-muted dy-text-muted-foreground">
                      <Icon className="dy-w-3.5 dy-h-3.5" />
                    </div>
                    <div className="dy-min-w-0">
                      <p className="dy-font-medium dy-truncate dy-text-foreground/90">
                        {step.label}
                      </p>
                      {step.details && (
                        <p className="dy-text-[10px] dy-text-muted-foreground dy-truncate">
                          {step.details}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'dy-text-[10px] dy-font-mono dy-px-1.5 dy-py-0.5 dy-rounded dy-shrink-0',
                      step.isDone
                        ? 'dy-bg-emerald-500/10 dy-text-emerald-600 dark:dy-text-emerald-400'
                        : 'dy-bg-primary/10 dy-text-primary dy-animate-pulse'
                    )}
                  >
                    {step.isDone ? 'Completed' : 'Running...'}
                  </span>
                </div>

                {/* Sources cards if searchContent */}
                {step.sources && step.sources.length > 0 && (
                  <div className="dy-mt-1.5 dy-p-2 dy-bg-muted/40 dy-rounded-md dy-border dy-border-border/50 dy-space-y-1">
                    <div className="dy-flex dy-items-center dy-justify-between dy-text-[10px] dy-font-medium dy-text-muted-foreground">
                      <span>Retrieved Sources ({step.sources.length})</span>
                      <span className="dy-opacity-70">RAG Semantic Match</span>
                    </div>
                    <div className="dy-grid dy-grid-cols-1 dy-gap-1">
                      {step.sources.map((src: any, srcIdx: number) => (
                        <a
                          key={srcIdx}
                          href={src.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="dy-flex dy-items-center dy-justify-between dy-p-1.5 dy-bg-background/80 hover:dy-bg-background dy-rounded dy-border dy-border-border/40 hover:dy-border-primary/50 dy-transition-colors group/src"
                        >
                          <div className="dy-min-w-0 dy-flex-1 dy-mr-2">
                            <p className="dy-font-medium dy-truncate dy-text-[11px] group-hover/src:dy-text-primary dy-transition-colors">
                              {src.title}
                            </p>
                            <p className="dy-text-[9px] dy-text-muted-foreground dy-truncate">
                              {src.collection} &bull; {src.field}
                            </p>
                          </div>
                          {src.score !== undefined && (
                            <span className="dy-text-[9px] dy-font-mono dy-px-1 dy-py-0.5 dy-rounded dy-bg-primary/10 dy-text-primary dy-font-medium">
                              {Math.round(src.score * 100)}%
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DyrectedAIChatPanel({
  threadId,
  onSelectThread,
  onClose,
}: {
  threadId: string | null;
  onSelectThread: (id: string | null) => void;
  onClose?: () => void;
}) {
  const { client } = useDyrected();
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');

  const baseUrl = client?.getBaseUrl() || '';
  const authHeaders = useMemo(() => client?.getAuthHeaders() || {}, [client]);

  // TanStack Query: Fetch conversation threads list
  const { data: threadsData } = useQuery({
    queryKey: ['ai', 'threads'],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/api/ai/threads`, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });
      if (!res.ok) return { threads: [] };
      return res.json();
    },
    staleTime: 30000,
  });

  // TanStack Query: Fetch initial messages when switching to an existing thread
  const { data: threadMessagesData } = useQuery({
    queryKey: ['ai', 'thread', threadId],
    queryFn: async () => {
      if (!threadId) return { messages: [] };
      const res = await fetch(`${baseUrl}/api/ai/threads/${threadId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });
      if (!res.ok) return { messages: [] };
      return res.json();
    },
    enabled: Boolean(threadId),
  });

  // Delete a single thread
  const deleteThreadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${baseUrl}/api/ai/threads/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'threads'] });
      if (threadId === deletedId) {
        onSelectThread(null);
      }
    },
  });

  // Clear all threads
  const clearThreadsMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${baseUrl}/api/ai/threads`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'threads'] });
      onSelectThread(null);
    },
  });

  const chatTransport = useMemo(() => {
    return new DefaultChatTransport({
      api: `${baseUrl}/api/ai/chat`,
      headers: authHeaders,
      body: threadId ? { threadId } : undefined,
    });
  }, [baseUrl, authHeaders, threadId]);

  const formattedInitialMessages = useMemo(() => {
    return (threadMessagesData?.messages || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      parts:
        Array.isArray(m.parts) && m.parts.length > 0
          ? m.parts
          : [{ type: 'text' as const, text: m.content || '' }],
    }));
  }, [threadMessagesData?.messages]);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: threadId || 'new',
    transport: chatTransport,
    messages: formattedInitialMessages,
  });

  // Keep useChat synchronized when switching to an existing thread with history
  useEffect(() => {
    if (formattedInitialMessages.length > 0) {
      setMessages(formattedInitialMessages);
    }
  }, [formattedInitialMessages, setMessages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  // Automatically refresh threads history when a new conversation or response completes
  useEffect(() => {
    if (status === 'ready' && messages.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['ai', 'threads'] });
    }
  }, [status, messages.length, queryClient]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback((id: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleEditPrompt = useCallback((text: string) => {
    setInput(text);
  }, []);

  const handleRetry = useCallback(() => {
    if (messages.length === 0 || isLoading) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      const text =
        lastUserMsg.parts?.map((p: any) => (p.type === 'text' ? p.text : '')).join('') ||
        (lastUserMsg as any).content ||
        '';
      if (text) {
        sendMessage({ text });
      }
    }
  }, [messages, isLoading, sendMessage]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');

    let currentThreadId = threadId;
    if (!currentThreadId) {
      try {
        const res = await fetch(`${baseUrl}/api/ai/threads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ title: text.slice(0, 50) }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.thread?.id) {
            currentThreadId = data.thread.id;
            onSelectThread(currentThreadId);
            queryClient.invalidateQueries({ queryKey: ['ai', 'threads'] });
          }
        }
      } catch (err) {
        console.error('[dyrected/ai] Failed to pre-create thread:', err);
      }
    }

    try {
      await sendMessage({ text });
      queryClient.invalidateQueries({ queryKey: ['ai', 'threads'] });
    } catch (err) {
      console.error('[dyrected/ai] Send message error:', err);
    }
  };

  const threads = useMemo(() => threadsData?.threads || [], [threadsData?.threads]);

  const [reindexSuccess, setReindexSuccess] = useState<string | null>(null);

  const reindexMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}/api/ai/rag/reindex`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to reindex knowledge base');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setReindexSuccess(`Indexed ${data.totalChunks || 0} chunks`);
      setTimeout(() => setReindexSuccess(null), 3500);
    },
    onError: (err: any) => {
      console.error('[dyrected/rag] Reindex error:', err);
    },
  });

  const activeTitle = useMemo(() => {
    if (!threadId) return 'Dyrected Assistant';
    const found = threads.find((t: any) => t.id === threadId);
    if (found?.title && found.title !== 'New Conversation') return found.title;
    if (threadMessagesData?.thread?.title && threadMessagesData.thread.title !== 'New Conversation') {
      return threadMessagesData.thread.title;
    }
    return 'Dyrected Assistant';
  }, [threadId, threads, threadMessagesData]);

  return (
    <div className="dy-flex dy-flex-col dy-h-full dy-bg-background dy-overflow-hidden">
      {/* Top Bar */}
      <div className="dy-px-4 dy-py-3 dy-border-b dy-border-border/60 dy-flex dy-items-center dy-justify-between dy-shrink-0">
        <div className="dy-flex dy-items-center dy-gap-2 font-semibold dy-text-sm dy-min-w-0 dy-flex-1 dy-mr-2">
          {showHistory ? (
            <button
              onClick={() => setShowHistory(false)}
              className="dy-p-1 -dy-ml-1 hover:dy-bg-muted dy-rounded-md dy-text-muted-foreground hover:dy-text-foreground dy-transition-colors dy-flex dy-items-center dy-gap-1"
            >
              <ChevronLeft className="dy-w-4 dy-h-4" />
              <span className="dy-text-xs dy-font-medium">Back</span>
            </button>
          ) : (
            <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
              <Sparkles className="dy-w-4 dy-h-4 dy-text-primary dy-shrink-0" />
              <span
                className="dy-font-semibold dy-text-sm dy-truncate"
                title={activeTitle}
              >
                {activeTitle}
              </span>
            </div>
          )}
        </div>

        <div className="dy-flex dy-items-center dy-gap-1">
          <button
            onClick={() => reindexMutation.mutate()}
            disabled={reindexMutation.isPending}
            title="Sync Knowledge (Reindex RAG vector embeddings)"
            className={cn(
              'dy-p-1.5 hover:dy-bg-muted dy-rounded-md dy-text-xs dy-font-medium dy-flex dy-items-center dy-gap-1 dy-transition-colors',
              reindexMutation.isPending
                ? 'dy-text-primary dy-animate-pulse'
                : reindexSuccess
                  ? 'dy-text-emerald-500 font-medium'
                  : 'dy-text-muted-foreground hover:dy-text-foreground'
            )}
          >
            <RefreshCw
              className={cn(
                'dy-w-3.5 dy-h-3.5',
                reindexMutation.isPending && 'dy-animate-spin'
              )}
            />
            <span>{reindexSuccess || (reindexMutation.isPending ? 'Syncing...' : 'Sync')}</span>
          </button>

          <button
            onClick={() => setShowHistory((prev) => !prev)}
            title="Chat History"
            className={cn(
              'dy-p-1.5 hover:dy-bg-muted dy-rounded-md dy-text-xs dy-font-medium dy-flex dy-items-center dy-gap-1 dy-transition-colors',
              showHistory ? 'dy-bg-muted dy-text-foreground' : 'dy-text-muted-foreground'
            )}
          >
            <History className="dy-w-3.5 dy-h-3.5" />
            <span>History</span>
          </button>

          <button
            onClick={() => {
              onSelectThread(null);
              setShowHistory(false);
            }}
            title="New Conversation"
            className="dy-p-1.5 hover:dy-bg-muted dy-rounded-md dy-text-xs dy-font-medium dy-flex dy-items-center dy-gap-1 dy-text-muted-foreground hover:dy-text-foreground dy-transition-colors"
          >
            <Plus className="dy-w-3.5 dy-h-3.5" />
            <span>New</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close Assistant"
              className="dy-p-1.5 hover:dy-bg-muted dy-rounded-md dy-text-muted-foreground hover:dy-text-foreground dy-transition-colors"
            >
              <X className="dy-w-3.5 dy-h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* History Drawer List View */}
      {showHistory ? (
        <div className="dy-flex-1 dy-overflow-y-auto dy-p-3 dy-space-y-1">
          <div className="dy-flex dy-items-center dy-justify-between dy-px-2 dy-py-1">
            <p className="dy-text-[11px] dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground">
              Recent Conversations
            </p>
            {threads.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all conversation history?')) {
                    clearThreadsMutation.mutate();
                  }
                }}
                disabled={clearThreadsMutation.isPending}
                className="dy-text-[11px] dy-text-destructive hover:dy-underline disabled:dy-opacity-50"
              >
                Clear all
              </button>
            )}
          </div>
          {threads.length === 0 ? (
            <p className="dy-text-xs dy-text-muted-foreground dy-p-4 dy-text-center">
              No conversations yet. Start a new chat below!
            </p>
          ) : (
            threads.map((t: any) => (
              <div
                key={t.id}
                onClick={() => {
                  onSelectThread(t.id);
                  setShowHistory(false);
                }}
                className={cn(
                  'dy-group dy-w-full dy-text-left dy-p-2.5 dy-rounded-lg dy-flex dy-items-start dy-gap-2.5 dy-text-xs dy-transition-colors dy-cursor-pointer',
                  t.id === threadId ? 'dy-bg-primary/10 dy-text-primary dy-font-medium' : 'hover:dy-bg-muted dy-text-foreground'
                )}
              >
                <MessageSquare className="dy-w-3.5 dy-h-3.5 dy-mt-0.5 dy-shrink-0" />
                <div className="dy-flex-1 dy-truncate">
                  <div className="dy-truncate dy-font-medium">{t.title || 'Conversation'}</div>
                  <div className="dy-text-[10px] dy-text-muted-foreground">
                    {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  title="Delete conversation"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this conversation?')) {
                      deleteThreadMutation.mutate(t.id);
                    }
                  }}
                  className="dy-opacity-0 group-hover:dy-opacity-100 hover:dy-bg-destructive/10 hover:dy-text-destructive dy-p-1 dy-rounded dy-transition-all dy-shrink-0"
                >
                  <Trash2 className="dy-w-3.5 dy-h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Error Banner */}
          {error && (() => {
            const rawMsg = error.message || '';
            const isQuota =
              rawMsg.includes('quota') ||
              rawMsg.includes('429') ||
              rawMsg.includes('RESOURCE_EXHAUSTED') ||
              rawMsg.includes('rate-limits') ||
              rawMsg.includes('free_tier_requests');
            const isMissingKey =
              rawMsg.includes('API_KEY') ||
              rawMsg.includes('API key') ||
              rawMsg.includes('401') ||
              rawMsg.includes('403');

            return (
              <div className="dy-m-4 dy-p-3.5 dy-border dy-border-destructive/30 dy-bg-destructive/10 dy-rounded-xl dy-space-y-2 dy-text-xs">
                <div className="dy-flex dy-items-start dy-gap-2.5 dy-text-destructive">
                  <AlertCircle className="dy-w-4 dy-h-4 dy-shrink-0 dy-mt-0.5" />
                  <div className="dy-space-y-1 dy-flex-1">
                    <p className="dy-font-semibold">
                      {isQuota
                        ? 'Gemini API Rate Limit / Quota Reached'
                        : isMissingKey
                          ? 'Gemini API Key Required'
                          : 'AI Assistant Error'}
                    </p>
                    <p className="dy-text-destructive/90 dy-leading-relaxed">
                      {rawMsg || 'An error occurred while connecting to the AI service.'}
                    </p>
                  </div>
                </div>

                {isQuota && (
                  <div className="dy-pt-2 dy-border-t dy-border-destructive/20 dy-flex dy-items-center dy-justify-between dy-text-[11px] dy-text-destructive/80">
                    <span>Free-tier limits reset periodically.</span>
                    <a
                      href="https://ai.google.dev/pricing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dy-font-semibold dy-underline hover:dy-text-destructive dy-transition-colors"
                    >
                      Upgrade Plan &rarr;
                    </a>
                  </div>
                )}

                {isMissingKey && (
                  <div className="dy-pt-2 dy-border-t dy-border-destructive/20 dy-flex dy-items-center dy-justify-between dy-text-[11px] dy-text-destructive/80">
                    <span>Set <code>GEMINI_API_KEY</code> in your <code>.env.local</code>.</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dy-font-semibold dy-underline hover:dy-text-destructive dy-transition-colors"
                    >
                      Get API Key &rarr;
                    </a>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Conversation Thread using ai-elements */}
          <Conversation className="dy-flex-1 dy-min-h-0">
            <ConversationContent className="dy-p-4 dy-space-y-4">
              {messages.length === 0 ? (
                <div className="dy-flex dy-flex-col dy-items-center dy-justify-center dy-h-full dy-py-12 dy-text-center dy-text-muted-foreground dy-space-y-2">
                  <Sparkles className="dy-w-8 dy-h-8 dy-text-primary/60" />
                  <p className="dy-text-xs dy-font-medium">How can I help with this project today?</p>
                  <p className="dy-text-[11px] dy-text-muted-foreground/70 dy-max-w-xs">
                    Draft copy, brainstorm articles, generate SEO meta tags, or review schemas.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message, idx) => {
                    const isMessageComplete = !isLoading || idx < messages.length - 1;
                    const { thinking, finalResponse, isStillThinking } =
                      extractReasoningAndResponse(message, isMessageComplete);

                    const toolParts =
                      message.parts?.filter(
                        (p: any) =>
                          p.type === 'tool-invocation' ||
                          p.type === 'tool' ||
                          p.type?.startsWith('tool-')
                      ) || [];

                    const proposalActions =
                      toolParts
                        .map((tp: any) => {
                          const extracted = extractToolInvocation(tp, Boolean(finalResponse || thinking));
                          const info = getToolDisplayInfo(extracted);
                          return info.action;
                        })
                        .filter(Boolean);

                    const isLastAssistantMessage =
                      message.role === 'assistant' &&
                      (idx === messages.length - 1 ||
                        (idx === messages.length - 2 && messages[messages.length - 1]?.role === 'user'));

                    const textToCopy = finalResponse || thinking;

                    return (
                      <Message key={message.id} from={message.role as 'user' | 'assistant'}>
                        <MessageContent>
                          {/* 1. Tool Execution Breakdown (queries, aggregations, RAG search) */}
                          {toolParts.length > 0 && (
                            <AIToolExecutionsGroup
                              toolParts={toolParts}
                              isMessageComplete={Boolean(finalResponse || thinking)}
                            />
                          )}

                          {/* 2. Collapsible AI Reasoning / Thinking Process */}
                          {(thinking || isStillThinking) && (
                            <AIReasoningAccordion
                              thinking={thinking}
                              isStillThinking={isStillThinking}
                            />
                          )}

                          {/* 3. Final Response Text or Live Typing Dots */}
                          {finalResponse ? (
                            <MessageResponse>{finalResponse}</MessageResponse>
                          ) : isStillThinking ? null : (
                            <TypingDots />
                          )}

                          {/* 4. Action Proposal Diff Cards (at the bottom) */}
                          {proposalActions.length > 0 && (
                            <div className="dy-mt-2.5 dy-space-y-2">
                              {proposalActions.map((action: any, aIdx: number) => (
                                <AIActionProposalCard
                                  key={action.actionId || aIdx}
                                  action={action}
                                  baseUrl={baseUrl}
                                  authHeaders={authHeaders}
                                />
                              ))}
                            </div>
                          )}

                          {textToCopy && (
                            <MessageActions className={message.role === 'user' ? 'dy-justify-end' : 'dy-justify-start'}>
                              <MessageAction
                                onClick={() => handleCopy(message.id, textToCopy)}
                                tooltip={copiedId === message.id ? 'Copied to clipboard' : 'Copy'}
                              >
                                {copiedId === message.id ? (
                                  <>
                                    <Check className="dy-w-3 dy-h-3 dy-text-emerald-500" />
                                    <span className="dy-text-emerald-500">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="dy-w-3 dy-h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </MessageAction>

                              {message.role === 'assistant' && isLastAssistantMessage && !isLoading && (
                                <MessageAction
                                  onClick={handleRetry}
                                  tooltip="Regenerate response"
                                >
                                  <RotateCcw className="dy-w-3 dy-h-3" />
                                  <span>Retry</span>
                                </MessageAction>
                              )}

                              {message.role === 'user' && (
                                <MessageAction
                                  onClick={() => handleEditPrompt(textToCopy)}
                                  tooltip="Edit & resend prompt"
                                >
                                  <Edit3 className="dy-w-3 dy-h-3" />
                                  <span>Edit</span>
                                </MessageAction>
                              )}
                            </MessageActions>
                          )}
                        </MessageContent>
                      </Message>
                    );
                  })}

                  {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                    <Message from="assistant">
                      <MessageContent>
                        <TypingDots />
                      </MessageContent>
                    </Message>
                  )}
                </>
              )}
            </ConversationContent>
          </Conversation>

          {/* Prompt Input using ai-elements */}
          <div className="dy-p-3 dy-border-t dy-border-border/60 dy-shrink-0">
            <PromptInput onSubmit={() => handleSend()}>
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Dyrected anything... (Shift+Enter for newline)"
                className="dy-min-h-[44px] dy-max-h-32"
              />
              <PromptInputActions>
                <PromptInputAction
                  tooltip="Send message"
                  disabled={isLoading || !input.trim()}
                />
              </PromptInputActions>
            </PromptInput>
          </div>
        </>
      )}
    </div>
  );
}