'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { GENERATE_CMS_PROMPT, GENERATE_CMS_PROMPT_SELF_HOSTED } from '@dyrected/knowledge';
import { Button } from '@/components/ui/button';

export function CopyPromptButton({ mode }: { mode?: 'cloud' | 'self-hosted' }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const promptText = mode === 'self-hosted' ? GENERATE_CMS_PROMPT_SELF_HOSTED : GENERATE_CMS_PROMPT;
    await navigator.clipboard.writeText(promptText);
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
