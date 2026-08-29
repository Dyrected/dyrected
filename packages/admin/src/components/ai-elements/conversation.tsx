'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ConversationProps {
  children: React.ReactNode;
  className?: string;
}

export const Conversation = React.forwardRef<HTMLDivElement, ConversationProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('dy-flex dy-flex-col', className)} {...props}>
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
    <div ref={ref} className={cn('dy-flex-1 dy-overflow-y-auto', className)} {...props}>
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
        'dy-fixed dy-bottom-16 dy-right-4 dy-z-10 dy-rounded-full dy-bg-secondary dy-p-2 dy-text-secondary-foreground dy-shadow-lg dy-transition-opacity',
        className
      )}
      {...props}
    >
      <svg className="dy-h-5 dy-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  )
);
ConversationScrollButton.displayName = 'ConversationScrollButton';