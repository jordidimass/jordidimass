'use client';

import dynamic from 'next/dynamic';
import { motion } from 'motion/react';

const Particles = dynamic(() => import('@/components/ui/particles'), {
  ssr: false,
  loading: () => <div className="absolute inset-0" />,
});

const GalaxyBackground = dynamic(() => import('@/components/GalaxyBackground'), {
  ssr: false,
  loading: () => <div className="absolute inset-0" />,
});

export default function HomePage() {
  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col lg:flex-row bg-brand-bg overflow-hidden">
      <Particles
        className="absolute inset-0 w-full h-full z-0"
        quantity={350}
        staticity={10}
        ease={60}
        color="#ffffff"
      />

      <div className="w-full lg:w-1/2 flex items-center px-8 lg:px-16 pt-28 lg:pt-0 z-10">
        <div className="w-full">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 lg:mb-6 text-brand-accent leading-tight font-serif">
            welcome to my place on the internet
          </h1>
          <motion.p
            className="text-2xl text-brand-text leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          >
            hi, i&apos;m jordi, tech and science lover, living in the hyperreality making web products for the real life.
          </motion.p>
        </div>
      </div>

      <motion.div
        className="flex-1 lg:w-1/2 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
      >
        <GalaxyBackground />
      </motion.div>
    </div>
  );
}
