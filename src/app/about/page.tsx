"use client";
import { useState, useEffect } from "react";

export default function AboutPage() {
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { 
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-orange-100 p-8">
      <h1
        className={`text-4xl lowercase font-bold mb-4 transition-all duration-1000 opacity-0 transform translate-y-[-20px]
          ${isMounted ? "opacity-100 translate-y-0" : ""} 
          ${isHovered ? "scale-110 text-red-600" : "text-gray-800"}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        About Me
      </h1>
      <p className="text-2xl lowercase text-center max-w-2xl text-black">
        I am a Software Developer from Guatemala, with a passion for physics, systems, computer interfaces and computer science. I never stop learning and constantly expand my knowledge, as I believe that connecting with inspiring individuals and challenging projects fuels my growth. I am eager to collaborate with other developers and contribute to the web development community.
      </p>
    </div>
  );
}
