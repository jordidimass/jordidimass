"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const FloatingTerminal = dynamic(() => import("@/components/ui/FloatingTerminal"), {
  ssr: false,
});

export default function RouteScopedFloatingTerminal() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 2500);
    return () => window.clearTimeout(id);
  }, []);

  if (pathname === "/matrix" || !ready) {
    return null;
  }

  return <FloatingTerminal />;
}
