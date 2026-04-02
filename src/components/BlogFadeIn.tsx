'use client';

import { motion } from 'motion/react';

export default function BlogFadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto py-8 px-5"
    >
      {children}
    </motion.div>
  );
}
