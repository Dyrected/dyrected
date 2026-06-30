'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { GENERATE_CMS_PROMPT } from '@dyrected/knowledge';
import { Button } from '@/components/ui/button';

export function CopyPromptButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(GENERATE_CMS_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className="flex items-center gap-2"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copy setup prompt
        </>
      )}
    </Button>
  );
}
