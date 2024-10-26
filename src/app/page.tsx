'use client';

import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="flex bg-[#111010] items-center h-screen px-8">
      <div className="w-1/2 ">
        <h1 className="text-4xl font-bold mb-4 text-white">welcome to my place on the internet</h1>
        <p className="text-lg text-white">hi, i'm jordi tech and science lover, living in the hyperreality making web products for the real life. welcome to my place on the internet</p>
      </div>
    </div>
  );
}