'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

const GalaxyBackground = () => {
  // Using fixed positions instead of random values to avoid hydration issues
  const stars = Array.from({ length: 50 }, (_, i) => {
    const angle = (i / 50) * Math.PI * 2;
    const spiralRadius = 25 + (i / 50) * 35;
    // Using toFixed(6) to ensure consistent decimal places between server and client
    const x = Number((50 + spiralRadius * Math.cos(angle + (i / 50) * Math.PI)).toFixed(6));
    const y = Number((50 + spiralRadius * Math.sin(angle + (i / 50) * Math.PI)).toFixed(6));
    const size = 0.5 + (i % 3) * 0.3;
    return { x, y, size, delay: (i / 50) * 2 };
  });

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#111010]">
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, rgba(17,16,16,0) 70%)',
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, rgba(17,16,16,0) 70%)',
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, rgba(17,16,16,0) 70%)',
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      <motion.svg 
        className="absolute w-full h-full opacity-30" 
        viewBox="0 0 100 100"
        animate={{
          rotate: 360
        }}
        transition={{
          duration: 150,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        {/* Spiral arms */}
        <motion.path
          d="M 50 50 Q 65 35, 80 40 T 95 50"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="20"
          fill="none"
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.path
          d="M 50 50 Q 35 65, 20 60 T 5 50"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="20"
          fill="none"
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Stars */}
        {stars.map((star, i) => (
          <motion.circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.size}
            fill="rgba(255,255,255,0.8)"
            animate={{ 
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.2, 1],
            }}
            whileHover={{
              scale: 3,
              fill: "#FFBCBC",
              transition: {
                duration: 0.3,
                ease: "easeOut"
              }
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: star.delay,
            }}
          />
        ))}

        {/* Central glow */}
        <motion.circle
          cx="50"
          cy="50"
          r="3"
          fill="url(#galaxyGradient)"
          animate={{ 
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Gradient definition */}
        <defs>
          <radialGradient id="galaxyGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
      </motion.svg>
    </div>
  );
};

export default function HomePage() {
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { 
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'hidden'; // Changed from 'unset' to 'hidden'
      }
    };

    handleResize(); 
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col lg:flex-row bg-[#111010] overflow-hidden pt-16">
      <motion.div 
        className="w-full lg:w-1/2 flex items-center px-8 lg:px-16 pt-12 lg:pt-0 z-10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="w-full">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 lg:mb-6 text-white leading-tight">
            welcome to my place<br />on the internet
          </h1>
          <p className="text-2xl lg:text-2xl text-gray-300 leading-relaxed">
            hi, i&apos;m jordi, tech and science lover,<br />
            living in the hyperreality making web<br />
            products for the real life.
          </p>
        </div>
      </motion.div>
      
      <motion.div 
        className="flex-1 lg:w-1/2 relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <GalaxyBackground />
      </motion.div>
    </div>
  );
}