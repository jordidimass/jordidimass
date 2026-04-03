'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';

interface MotionContextValue {
  motionEnabled: boolean;
  toggleMotion: () => void;
}

const MotionContext = createContext<MotionContextValue>({
  motionEnabled: true,
  toggleMotion: () => {},
});

export function useMotionContext() {
  return useContext(MotionContext);
}

function readMotionEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  // The inline script in layout.tsx already set data-motion before React hydrated
  return document.documentElement.getAttribute('data-motion') !== 'off';
}

export default function MotionProvider({ children }: { children: React.ReactNode }) {
  // Sync read on client — avoids the async useEffect gap where animations flash
  const [motionEnabled, setMotionEnabled] = useState(readMotionEnabled);

  useEffect(() => {
    // Keep the attribute in sync when state changes (toggleMotion already does this,
    // but this covers the initial SSR→hydration case)
    document.documentElement.setAttribute('data-motion', motionEnabled ? 'on' : 'off');
  }, [motionEnabled]);

  const toggleMotion = () => {
    setMotionEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('jd-motion', String(next));
      document.documentElement.setAttribute('data-motion', next ? 'on' : 'off');
      return next;
    });
  };

  return (
    <MotionContext.Provider value={{ motionEnabled, toggleMotion }}>
      <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'}>
        {children}
      </MotionConfig>
    </MotionContext.Provider>
  );
}
