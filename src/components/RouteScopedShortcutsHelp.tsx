"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const ShortcutsHelp = dynamic(() => import("@/components/ui/ShortcutsHelp"), {
  ssr: false,
});

export default function RouteScopedShortcutsHelp() {
  const pathname = usePathname();

  if (pathname === "/matrix") return null;
  if (pathname !== "/") return null;

  return <ShortcutsHelp />;
}
