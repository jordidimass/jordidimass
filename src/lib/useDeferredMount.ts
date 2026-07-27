"use client";

import { useEffect, useState } from "react";

export function useDeferredMount(timeout = 1500): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let idle = 0;
    let timer = 0;
    const ric = (window as Window & typeof globalThis).requestIdleCallback;
    const cic = (window as Window & typeof globalThis).cancelIdleCallback;

    const start = () => {
      if (typeof ric === "function") {
        idle = ric(() => setReady(true), { timeout });
      } else {
        timer = window.setTimeout(() => setReady(true), 200);
      }
    };

    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }

    return () => {
      window.removeEventListener("load", start);
      if (idle && typeof cic === "function") cic(idle);
      if (timer) window.clearTimeout(timer);
    };
  }, [timeout]);

  return ready;
}
