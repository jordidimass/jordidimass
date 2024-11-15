"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Skill {
  name: string;
  category: string;
}

export default function AboutPage() {
  const skills: Skill[] = [
    { name: "typescript", category: "languages" },
    { name: "rust", category: "languages" },
    { name: "react", category: "frontend" },
    { name: "next.js", category: "frontend" },
    { name: "node.js", category: "backend" },
    { name: "aws - gcp", category: "cloud" },
    { name: "shadcn/ui", category: "design" },
    { name: "git", category: "tools" },
  ];

  return (
    <div className="min-h-screen bg-[#121212] text-[#AC8B8B] p-8">
      <div className="max-w-4xl mx-auto space-y-16">
        {/* intro section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          <h1 className="text-4xl font-light tracking-widest">
            jordi dimas
          </h1>
          <p className="text-2xl font-light leading-relaxed">
            software developer from guatemala, with a deep fascination for physics, 
            systems architecture, and the intricate world of computer science.
          </p>
        </motion.section>

        {/* philosophy section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-light tracking-widest">philosophy</h2>
          <p className="text-xl font-light leading-relaxed">
            i believe in the power of continuous learning and the beauty of elegant solutions. 
            every line of code is an opportunity to create something meaningful, 
            and every project is a chance to push the boundaries of what's possible.
          </p>
        </motion.section>

        {/* skills section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-light tracking-widest">current toolkit</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {skills.map((skill, index) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <div 
                  className="p-4 border border-[#AC8B8B] rounded-lg transition-all duration-300
                           hover:bg-[#AC8B8B] hover:text-[#121212] cursor-pointer"
                >
                  <p className="text-center font-light">{skill.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* contact/collaboration section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-light tracking-widest">let's build together</h2>
          <p className="text-xl font-light leading-relaxed">
            i'm always open to collaborating on innovative projects and connecting with 
            fellow developers who share a passion for crafting exceptional digital experiences.
          </p>
        </motion.section>
      </div>
    </div>
  );
}
