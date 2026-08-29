'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PromptInputProps {
  children: React.ReactNode;
  onSubmit: (value: string) => void;
  className?: string;
}

export const PromptInput = React.forwardRef<HTMLFormElement, PromptInputProps>(
  ({ children, onSubmit, className, ...props }, ref) => (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const value = formData.get('value') as string;
        if (value?.trim()) onSubmit(value.trim());
      }}
      className={cn('dy-flex dy-gap-2', className)}
      {...props}
    >
      {children}
    </form>
  )
);
PromptInput.displayName = 'PromptInput';

export interface PromptInputTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const PromptInputTextarea = React.forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
  ({ value, onChange, className, ...props }, ref) => (
    <textarea
      ref={ref}
      name="value"
      value={value}
      onChange={onChange}
      className={cn(
        'dy-flex-1 dy-resize-none dy-rounded-lg dy-border dy-bg-background dy-px-4 dy-py-2 dy-text-sm placeholder:dy-text-muted-foreground focus:dy-outline-none focus:dy-ring-2 focus:dy-ring-ring',
        className
      )}
      {...props}
    />
  )
);
PromptInputTextarea.displayName = 'PromptInputTextarea';

export interface PromptInputActionsProps {
  children: React.ReactNode;
  className?: string;
}

export const PromptInputActions = React.forwardRef<HTMLDivElement, PromptInputActionsProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('dy-flex dy-items-end dy-gap-1.5', className)} {...props}>
      {children}
    </div>
  )
);
PromptInputActions.displayName = 'PromptInputActions';

export interface PromptInputActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string;
  disabled?: boolean;
}

export const PromptInputAction = React.forwardRef<HTMLButtonElement, PromptInputActionProps>(
  ({ tooltip, disabled, className, ...props }, ref) => (
    <button
      ref={ref}
      type="submit"
      disabled={disabled}
      title={tooltip}
      className={cn(
        'dy-h-8 dy-w-8 dy-rounded-lg dy-bg-primary dy-text-primary-foreground dy-flex dy-items-center dy-justify-center dy-transition-colors disabled:dy-opacity-50 disabled:dy-cursor-not-allowed hover:dy-bg-primary/90',
        className
      )}
      {...props}
    >
      <svg className="dy-h-4 dy-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    </button>
  )
);
PromptInputAction.displayName = 'PromptInputAction';