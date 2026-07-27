"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useDeferredMount } from "@/lib/useDeferredMount";

const ShortcutsHelp = dynamic(() => import("@/components/ui/ShortcutsHelp"), {
  ssr: false,
});

export default function RouteScopedShortcutsHelp() {
  const pathname = usePathname();
  const ready = useDeferredMount();

  if (pathname === "/matrix") return null;
  if (pathname !== "/") return null;
  if (!ready) return null;

  return <ShortcutsHelp />;
}
