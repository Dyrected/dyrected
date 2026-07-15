'use client'

import { useState } from 'react'
import { Copy, Check, Terminal } from 'lucide-react'

const COMMAND = 'npx dyrected init'

export function InstallCommand() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(COMMAND)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="install-command flex items-center gap-3 rounded-xl px-4 py-3 font-mono text-sm">
      <Terminal size={16} className="shrink-0 text-[color:var(--primary)]" aria-hidden="true" />
      <code className="flex-1 truncate text-foreground">
        <span className="select-none text-muted-foreground">$ </span>
        {COMMAND}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : 'Copy install command'}
        className="install-command-copy inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  )
}
