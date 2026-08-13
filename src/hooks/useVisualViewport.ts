"use client";

import { useEffect, useState } from "react";

export type Viewport = {
  height: number;
  keyboardInset: number;
  keyboardOpen: boolean;
};

const INITIAL: Viewport = { height: 0, keyboardInset: 0, keyboardOpen: false };

export function useVisualViewport(active: boolean): Viewport {
  const [viewport, setViewport] = useState<Viewport>(INITIAL);

  useEffect(() => {
    if (!active) return;
    const vv = window.visualViewport;

    const read = () => {
      const height = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;
      const inset = Math.max(0, Math.round(window.innerHeight - (height + offsetTop)));
      setViewport((prev) => {
        const next = { height, keyboardInset: inset, keyboardOpen: inset > 120 };
        if (
          prev.height === next.height &&
          prev.keyboardInset === next.keyboardInset &&
          prev.keyboardOpen === next.keyboardOpen
        ) {
          return prev;
        }
        return next;
      });
    };

    read();

    if (!vv) {
      window.addEventListener("resize", read);
      return () => window.removeEventListener("resize", read);
    }

    vv.addEventListener("resize", read);
    vv.addEventListener("scroll", read);
    return () => {
      vv.removeEventListener("resize", read);
      vv.removeEventListener("scroll", read);
    };
  }, [active]);

  return viewport;
}
