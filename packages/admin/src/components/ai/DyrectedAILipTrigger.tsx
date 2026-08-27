'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Plus, AlertCircle, MessageSquare, History, ChevronLeft, Trash2, X } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
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

export function DyrectedAILipTrigger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const aiThreadParam = searchParams.get('aiThread');

  const isOpen = Boolean(aiThreadParam);
  const activeThreadId = aiThreadParam === 'new' ? null : aiThreadParam;

  const handleOpen = useCallback((threadId?: string | null) => {
    const next = new URLSearchParams(searchParams);
    next.set('aiThread', threadId || 'new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleClose = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('aiThread');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSelectThread = useCallback((threadId: string | null) => {
    const next = new URLSearchParams(searchParams);
    next.set('aiThread', threadId || 'new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
              className="dy-flex dy-flex-col dy-w-96 lg:dy-w-[420px] dy-h-full dy-border-l dy-border-border/60 dy-bg-background dy-shrink-0 dy-relative dy-z-20 dy-animate-in dy-slide-in-from-right-6 dy-duration-200"
            >
              <DyrectedAIChatPanel
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
              aria-label="Open Dyrected AI Assistant (Cmd+J)"
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

  const { messages, sendMessage, status, error } = useChat({
    id: threadId || 'new',
    transport: chatTransport,
    messages: (threadMessagesData?.messages || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: 'text' as const, text: m.content }],
    })),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    try {
      await sendMessage({ text });
      queryClient.invalidateQueries({ queryKey: ['ai', 'threads'] });
    } catch (err) {
      console.error('[dyrected/ai] Send message error:', err);
    }
  };

  const threads = threadsData?.threads || [];

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
                  {messages.map((message) => {
                    const messageText =
                      message.parts?.map((p: any) => (p.type === 'text' ? p.text : '')).join('') ||
                      (message as any).content ||
                      '';

                    const toolParts =
                      message.parts?.filter(
                        (p: any) =>
                          p.type === 'tool-invocation' ||
                          p.type === 'tool' ||
                          p.type?.startsWith('tool-')
                      ) || [];

                    return (
                      <Message key={message.id} from={message.role as 'user' | 'assistant'}>
                        <MessageContent>
                          {toolParts.length > 0 && (
                            <div className="dy-mb-2 dy-space-y-1.5">
                              {toolParts.map((tp: any, idx: number) => {
                                const inv = tp.toolInvocation || tp;
                                const toolName = inv.toolName || inv.name || 'inspection tool';
                                const isDone = inv.state === 'result' || inv.result !== undefined;
                                return (
                                  <div
                                    key={idx}
                                    className="dy-inline-flex dy-items-center dy-gap-1.5 dy-text-[11px] dy-font-mono dy-bg-muted/70 dy-text-muted-foreground dy-px-2.5 dy-py-0.5 dy-rounded-md dy-border dy-border-border/50"
                                  >
                                    <span
                                      className={cn(
                                        'dy-w-1.5 dy-h-1.5 dy-rounded-full',
                                        isDone
                                          ? 'dy-bg-emerald-500'
                                          : 'dy-bg-primary/70 dy-animate-pulse'
                                      )}
                                    />
                                    <span>
                                      {isDone ? `Executed ${toolName}` : `Running ${toolName}...`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {messageText ? (
                            <MessageResponse>{messageText}</MessageResponse>
                          ) : (
                            <TypingDots />
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