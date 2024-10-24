"use client";
import { useState } from "react";

export default function AboutPage() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
      <h1
        className={`text-4xl font-bold mb-4 transition-transform duration-500 ${
          isHovered ? "scale-110 text-red-600" : "text-gray-800"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        About Me
      </h1>
      <p
        className={`text-lg text-center max-w-2xl text-black transition-opacity duration-500 ${
          isHovered ? "opacity-100" : "opacity-75"
        }`}
      >
       I am a Software Developer from Guatemala, with a passion for physics, systems, computer interfaces and computer science. I never stop learning and constantly expand my knowledge, as I believe that connecting with inspiring individuals and challenging projects fuels my growth. I am eager to collaborate with other developers and contribute to the web development community.
      </p>
    </div>
  );
}
