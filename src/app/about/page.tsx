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
        Hello! I'm Jordi, a passionate developer with a love for creating
        intuitive and dynamic user experiences. I enjoy working with modern
        web technologies and am always eager to learn and explore new
        challenges. In my free time, I love hiking, reading, and experimenting
        with new recipes in the kitchen.
      </p>
    </div>
  );
}
