'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface MessageProps {
  children: React.ReactNode;
  from: 'user' | 'assistant' | 'system' | 'data' | 'tool';
  className?: string;
}

export const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ children, from, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('w-full flex gap-3', from === 'user' && 'flex-row-reverse', className)}
      data-from={from}
      {...props}
    >
      {children}
    </div>
  )
);
Message.displayName = 'Message';

export interface MessageContentProps {
  children: React.ReactNode;
  className?: string;
}

export const MessageContent = React.forwardRef<HTMLDivElement, MessageContentProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('max-w-[70%] rounded-2xl px-4 py-2', className)} {...props}>
      {children}
    </div>
  )
);
MessageContent.displayName = 'MessageContent';

export interface MessageResponseProps {
  children: React.ReactNode;
  className?: string;
}

export const MessageResponse = React.forwardRef<HTMLDivElement, MessageResponseProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('prose prose-sm dark:prose-invert max-w-none', className)} {...props}>
      {children}
    </div>
  )
);
MessageResponse.displayName = 'MessageResponse';