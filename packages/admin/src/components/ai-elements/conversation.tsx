'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ConversationProps {
  children: React.ReactNode;
  className?: string;
}

export const Conversation = React.forwardRef<HTMLDivElement, ConversationProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col', className)} {...props}>
      {children}
    </div>
  )
);
Conversation.displayName = 'Conversation';

export interface ConversationContentProps {
  children: React.ReactNode;
  className?: string;
}

export const ConversationContent = React.forwardRef<HTMLDivElement, ConversationContentProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex-1 overflow-y-auto', className)} {...props}>
      {children}
    </div>
  )
);
ConversationContent.displayName = 'ConversationContent';

export interface ConversationScrollButtonProps {
  className?: string;
}

export const ConversationScrollButton = React.forwardRef<HTMLButtonElement, ConversationScrollButtonProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'fixed bottom-4 right-4 z-10 rounded-full bg-primary p-2 text-primary-foreground shadow-lg transition-opacity',
        className
      )}
      {...props}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  )
);
ConversationScrollButton.displayName = 'ConversationScrollButton';