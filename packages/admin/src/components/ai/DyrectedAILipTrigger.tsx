'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Plus, AlertCircle } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { useCompletion } from '@ai-sdk/react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
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
import { cn } from '@/lib/utils';

export function DyrectedAILipTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* PostHog-style Right-Side Floating Lip (Desktop) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Dyrected AI Assistant (Cmd+J)"
        className={cn(
          'hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 items-center gap-1.5 px-2 py-3.5 bg-primary text-primary-foreground rounded-l-xl shadow-xl hover:pr-3.5 hover:shadow-2xl transition-all duration-200 group cursor-pointer border-y border-l border-primary/20'
        )}
      >
        <Sparkles className="w-4 h-4 text-primary-foreground group-hover:scale-110 transition-transform" />
        <span className="[writing-mode:vertical-lr] text-[11px] font-bold tracking-widest uppercase select-none">
          AI Assistant
        </span>
        <kbd className="text-[9px] bg-primary-foreground/20 px-1 py-0.5 rounded font-mono select-none">
          ⌘J
        </kbd>
      </button>

      {/* Mobile Floating Action Button (< 768px) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Dyrected AI Assistant"
        className="flex md:hidden fixed bottom-5 right-5 z-40 p-3.5 bg-primary text-primary-foreground rounded-full shadow-2xl active:scale-95 transition-transform"
      >
        <Sparkles className="w-5 h-5" />
      </button>

      {/* Slide-over Drawer */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full">
          <DyrectedAIChatPanel
            threadId={activeThreadId}
            onSelectThread={setActiveThreadId}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

export function DyrectedAIChatPanel({
  threadId,
  onSelectThread,
}: {
  threadId: string | null;
  onSelectThread: (id: string | null) => void;
}) {
  const { messages, status, error } = useChat({
    id: threadId || 'new',
  });

  const { input, handleInputChange, isLoading, complete } = useCompletion({
    api: threadId ? `/api/ai/threads/${threadId}/messages` : '/api/ai/chat',
    body: threadId ? { threadId } : undefined,
  });

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    await complete(input);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Bar */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Dyrected Assistant</span>
        </div>
        <button
          onClick={() => onSelectThread(null)}
          title="New Conversation"
          className="p-1.5 hover:bg-muted rounded-md text-xs font-medium flex items-center gap-1 text-muted-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>

      {/* Missing Key Banner */}
      {error && (
        <div className="m-4 p-3 border border-destructive/20 bg-destructive/10 rounded-lg flex items-start gap-2.5 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">AI not configured:</span> Please set <code className="font-mono bg-destructive/20 px-1 py-0.5 rounded">GEMINI_API_KEY</code> in your environment.
          </div>
        </div>
      )}

      {/* Conversation Thread using ai-elements */}
      <Conversation className="flex-1">
        <ConversationContent className="p-4 space-y-4">
          {messages.map((message) => (
            <Message key={message.id} from={message.role as 'user' | 'assistant'}>
              <MessageContent>
                <MessageResponse>{(message as any).parts?.[0]?.text || ''}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Prompt Input using ai-elements */}
      <div className="p-4 border-t">
        <PromptInput onSubmit={() => handleSend()}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => handleInputChange(e)}
            placeholder="Ask Dyrected anything..."
            className="min-h-[44px]"
          />
          <PromptInputActions>
            <PromptInputAction
              tooltip="Send message"
              disabled={isLoading || status === 'submitted' || !input.trim()}
            />
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  );
}