'use client';

import { motion, useScroll, useSpring } from 'motion/react';
import { useMotionContext } from '@/components/MotionProvider';

export default function ReadingProgressBar() {
  const { motionEnabled } = useMotionContext();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX: motionEnabled ? scaleX : scrollYProgress, transformOrigin: '0%' }}
      className="fixed top-0 left-0 right-0 h-[3px] bg-brand-accent z-[60]"
    />
  );
}
