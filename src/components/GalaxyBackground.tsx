'use client';

import { motion } from 'motion/react';

const stars = Array.from({ length: 30 }, (_, i) => {
  const angle = (i / 30) * Math.PI * 2;
  const spiralRadius = 25 + (i / 30) * 35;
  const x = Number((50 + spiralRadius * Math.cos(angle + (i / 30) * Math.PI)).toFixed(6));
  const y = Number((50 + spiralRadius * Math.sin(angle + (i / 30) * Math.PI)).toFixed(6));
  const size = 0.5 + (i % 3) * 0.3;
  return { x, y, size, delay: (i / 30) * 2 };
});

export default function GalaxyBackground() {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-brand-bg">
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, rgba(17,16,16,0) 70%)',
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, rgba(17,16,16,0) 70%)',
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, rgba(17,16,16,0) 70%)',
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <motion.svg
        className="absolute w-full h-full opacity-30"
        viewBox="0 0 100 100"
        animate={{ rotate: 360 }}
        transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
      >
        <motion.path
          d="M 50 50 Q 65 35, 80 40 T 95 50"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="20"
          fill="none"
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M 50 50 Q 35 65, 20 60 T 5 50"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="20"
          fill="none"
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {stars.map((star, i) => (
          <motion.circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.size}
            fill="rgba(255,255,255,0.8)"
            animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.2, 1] }}
            whileHover={{ scale: 3, fill: "var(--color-brand-accent)", transition: { duration: 0.3, ease: "easeOut" } }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: star.delay }}
          />
        ))}

        <motion.circle
          cx="50"
          cy="50"
          r="3"
          fill="url(#galaxyGradient)"
          animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <defs>
          <radialGradient id="galaxyGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
      </motion.svg>
    </div>
  );
}
