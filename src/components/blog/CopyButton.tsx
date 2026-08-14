'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyButton({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`jd-pressable flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors duration-150 ${className ?? 'text-brand-muted hover:text-brand-accent'}`}
      aria-label={copied ? 'Copied' : 'Copy code'}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
