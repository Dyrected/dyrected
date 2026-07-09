import React from 'react';

export interface DyrectedRichTextProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'content'> {
  /**
   * The value of a `richText` field — an HTML string produced by the editor.
   * Renders nothing when empty.
   */
  content: string | null | undefined;
}

/**
 * Renders a Dyrected `richText` field value.
 *
 * The field stores an HTML string, so this outputs it directly. That HTML comes
 * from your own editors through the Admin panel; render only content you trust,
 * and sanitize upstream if untrusted users can author it.
 *
 * ```tsx
 * <DyrectedRichText content={post.body} className="prose" />
 * ```
 */
export function DyrectedRichText({ content, ...props }: DyrectedRichTextProps) {
  if (!content) return null;
  return <div {...props} dangerouslySetInnerHTML={{ __html: content }} />;
}
