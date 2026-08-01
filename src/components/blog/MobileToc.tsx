'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import type { PostHeading } from '@/lib/markdown';
import { useActiveHeading } from './useActiveHeading';
import { EASE_OUT } from '@/lib/motion';

export default function MobileToc({ headings }: { headings: PostHeading[] }) {
  const [open, setOpen] = useState(false);
  const activeId = useActiveHeading(headings);

  return (
    <div className="rounded-md border border-brand-muted/25 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="jd-pressable flex w-full items-center justify-between px-4 py-2.5 text-sm text-brand-muted"
      >
        On this page
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="overflow-hidden border-t border-brand-muted/25"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {headings.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  onClick={() => setOpen(false)}
                  className={`py-1 text-sm ${h.depth === 3 ? 'ml-3' : ''} ${
                    activeId === h.id ? 'text-brand-accent' : 'text-brand-muted'
                  }`}
                >
                  {h.text}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
