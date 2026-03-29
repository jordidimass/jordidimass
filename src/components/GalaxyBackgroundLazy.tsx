'use client';

import dynamic from 'next/dynamic';

const GalaxyBackground = dynamic(() => import('@/components/GalaxyBackground'), {
  ssr: false,
});

export default function GalaxyBackgroundLazy() {
  return <GalaxyBackground />;
}
