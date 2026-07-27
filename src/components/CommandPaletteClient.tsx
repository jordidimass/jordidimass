'use client';

import dynamic from 'next/dynamic';
import { useDeferredMount } from '@/lib/useDeferredMount';

const CommandPalette = dynamic(() => import('@/components/CommandPalette'), {
  ssr: false,
});

export default function CommandPaletteClient() {
  const ready = useDeferredMount();
  if (!ready) return null;
  return <CommandPalette />;
}
