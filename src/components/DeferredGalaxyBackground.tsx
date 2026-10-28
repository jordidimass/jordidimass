"use client";

import dynamic from "next/dynamic";

const GalaxyBackground = dynamic(() => import("./GalaxyBackground"), { ssr: false });

export default function DeferredGalaxyBackground() {
  return <GalaxyBackground />;
}
