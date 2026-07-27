"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useDeferredMount } from "@/lib/useDeferredMount";

const FloatingTerminal = dynamic(() => import("@/components/ui/FloatingTerminal"), {
  ssr: false,
});

export default function RouteScopedFloatingTerminal() {
  const pathname = usePathname();
  const ready = useDeferredMount();

  if (pathname === "/matrix") {
    return null;
  }
  if (!ready) return null;

  return <FloatingTerminal />;
}
