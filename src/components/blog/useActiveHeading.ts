'use client';

import { useEffect, useState } from 'react';
import type { PostHeading } from '@/lib/markdown';

export function useActiveHeading(headings: PostHeading[]) {
  const [activeId, setActiveId] = useState(headings[0]?.id);

  useEffect(() => {
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      () => {
        const topmost = elements.filter((el) => el.getBoundingClientRect().top <= 120).at(-1);
        if (topmost) setActiveId(topmost.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: [0, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  return activeId;
}
