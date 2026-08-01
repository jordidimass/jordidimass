'use client';

import type { PostHeading } from '@/lib/markdown';
import { useActiveHeading } from './useActiveHeading';

export default function TableOfContents({ headings }: { headings: PostHeading[] }) {
  const activeId = useActiveHeading(headings);

  return (
    <nav className="hidden lg:flex sticky top-24 max-h-[calc(100vh-7rem)] flex-col gap-2 overflow-y-auto">
      <small className="text-brand-muted">On this page</small>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className={`border-l-2 pl-3 py-0.5 text-sm transition-colors duration-200 ${
            activeId === h.id
              ? 'border-brand-accent text-brand-accent'
              : 'border-transparent text-brand-muted hover:text-brand-text'
          } ${h.depth === 3 ? 'ml-3' : ''}`}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}
