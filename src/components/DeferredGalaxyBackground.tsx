"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const GalaxyBackground = dynamic(() => import("./GalaxyBackground"), { ssr: false });

export default function DeferredGalaxyBackground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setReady(true), 500);
    return () => window.clearTimeout(id);
  }, []);

  return ready ? <GalaxyBackground /> : null;
}
