"use client";

import dynamic from "next/dynamic";
import { useDeferredMount } from "@/lib/useDeferredMount";

const Particles = dynamic(() => import("@/components/ui/particles"), { ssr: false });
const GalaxyBackground = dynamic(() => import("@/components/GalaxyBackground"), { ssr: false });

export function DeferredParticles(props: React.ComponentProps<typeof Particles>) {
  const ready = useDeferredMount();
  if (!ready) return null;
  return <Particles {...props} />;
}

export function DeferredGalaxy() {
  const ready = useDeferredMount();
  if (!ready) return null;
  return <GalaxyBackground />;
}
