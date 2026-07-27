'use client';

import dynamic from 'next/dynamic';

const CommandPalette = dynamic(() => import('@/components/CommandPalette'), {
  ssr: false,
});

export default function CommandPaletteClient() {
  return <CommandPalette />;
}
