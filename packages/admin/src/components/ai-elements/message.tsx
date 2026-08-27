'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const MessageContext = React.createContext<{ from: 'user' | 'assistant' | 'system' | 'data' | 'tool' }>({
  from: 'assistant',
});

export interface MessageProps {
  children: React.ReactNode;
  from: 'user' | 'assistant' | 'system' | 'data' | 'tool';
  className?: string;
}

export const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ children, from, className, ...props }, ref) => (
    <MessageContext.Provider value={{ from }}>
      <div
        ref={ref}
        className={cn('dy-w-full dy-flex dy-gap-3', from === 'user' && 'dy-flex-row-reverse', className)}
        data-from={from}
        {...props}
      >
        {children}
      </div>
    </MessageContext.Provider>
  )
);
Message.displayName = 'Message';

export interface MessageContentProps {
  children: React.ReactNode;
  from?: 'user' | 'assistant' | 'system' | 'data' | 'tool';
  className?: string;
}

export const MessageContent = React.forwardRef<HTMLDivElement, MessageContentProps>(
  ({ children, from: fromProp, className, ...props }, ref) => {
    const context = React.useContext(MessageContext);
    const from = fromProp || context.from;
    const isUser = from === 'user';

    return (
      <div
        ref={ref}
        className={cn(
          'dy-max-w-[85%] dy-rounded-2xl dy-px-4 dy-py-2.5 dy-text-sm dy-shadow-xs dy-transition-colors',
          isUser
            ? 'dy-bg-secondary/70 dy-text-secondary-foreground dy-border dy-border-secondary/60 dy-rounded-br-xs dy-whitespace-pre-wrap'
            : 'dy-bg-card dy-text-card-foreground dy-border dy-border-border/60 dy-rounded-bl-xs',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MessageContent.displayName = 'MessageContent';

export interface MessageResponseProps {
  children: React.ReactNode;
  className?: string;
}

export const MessageResponse = React.forwardRef<HTMLDivElement, MessageResponseProps>(
  ({ children, className, ...props }, ref) => {
    if (typeof children === 'string') {
      return (
        <div
          ref={ref}
          className={cn('dy-text-sm dy-leading-relaxed dy-space-y-2', className)}
          {...props}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="dy-mb-2.5 last:dy-mb-0 dy-leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="dy-list-disc dy-pl-5 dy-my-2 dy-space-y-1.5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="dy-list-decimal dy-pl-5 dy-my-2 dy-space-y-1.5">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="dy-leading-relaxed">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="dy-font-semibold dy-text-foreground">{children}</strong>
              ),
              b: ({ children }) => (
                <b className="dy-font-semibold dy-text-foreground">{children}</b>
              ),
              h1: ({ children }) => (
                <h1 className="dy-text-base dy-font-bold dy-mt-3.5 dy-mb-1.5 dy-text-foreground">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="dy-text-sm dy-font-bold dy-mt-3 dy-mb-1 dy-text-foreground">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="dy-text-xs dy-font-bold dy-mt-2.5 dy-mb-1 dy-text-foreground">{children}</h3>
              ),
              code: ({ className, children, ...codeProps }) => {
                const isInline = !className && typeof children === 'string' && !children.includes('\n');
                if (isInline) {
                  return (
                    <code
                      className="dy-px-1.5 dy-py-0.5 dy-rounded-md dy-bg-muted dy-text-foreground dy-font-mono dy-text-xs dy-border dy-border-border/40"
                      {...codeProps}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <code
                    className={cn('dy-block dy-font-mono dy-text-xs', className)}
                    {...codeProps}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="dy-bg-muted/80 dy-text-muted-foreground dy-p-3 dy-rounded-xl dy-my-2.5 dy-overflow-x-auto dy-text-xs dy-font-mono dy-border dy-border-border/40">
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="dy-border-l-2 dy-border-primary/60 dy-pl-3 dy-italic dy-my-2 dy-text-muted-foreground">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="dy-overflow-x-auto dy-my-2.5">
                  <table className="dy-w-full dy-text-xs dy-border-collapse dy-border dy-border-border/60">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="dy-border dy-border-border/60 dy-bg-muted/50 dy-px-2.5 dy-py-1.5 dy-text-left dy-font-semibold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="dy-border dy-border-border/60 dy-px-2.5 dy-py-1.5">
                  {children}
                </td>
              ),
              hr: () => <hr className="dy-my-3 dy-border-border/60" />,
            }}
          >
            {children}
          </ReactMarkdown>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('dy-text-sm dy-leading-relaxed', className)} {...props}>
        {children}
      </div>
    );
  }
);
MessageResponse.displayName = 'MessageResponse';