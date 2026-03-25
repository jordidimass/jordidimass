"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const FloatingTerminal = dynamic(() => import("@/components/ui/FloatingTerminal"), {
  ssr: false,
});

export default function RouteScopedFloatingTerminal() {
  const pathname = usePathname();

  if (pathname === "/gallery" || pathname === "/matrix") {
    return null;
  }

  return <FloatingTerminal />;
}
