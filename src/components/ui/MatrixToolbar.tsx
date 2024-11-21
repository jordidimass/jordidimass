"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Code } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface MinimizedWindow {
  id: string;
  title: string;
  icon?: React.ReactNode;
  restore: () => void;
}

interface MatrixToolbarProps {
  minimizedWindows: MinimizedWindow[];
}

export default function MatrixToolbar({ minimizedWindows }: MatrixToolbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <motion.div 
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 w-full h-8 bg-black border-b border-[#0FFD20] z-50 flex items-center px-2"
      style={{ boxShadow: "0 0 10px rgba(15, 253, 32, 0.3)" }}
    >
      <div className="flex items-center space-x-2">
        <Link href="/">
          <button 
            className="hover:bg-[#0FFD20] hover:bg-opacity-20 p-1 rounded"
          >
            <span className="text-[#0FFD20] text-xl">λ</span>
          </button>
        </Link>

        <div className="h-full w-[1px] bg-[#0FFD20] mx-2" />

        <div className="flex space-x-1">
          {minimizedWindows.map((window) => (
            <motion.button
              key={window.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={window.restore}
              className="px-3 py-0.5 text-xs hover:bg-[#0FFD20] hover:bg-opacity-20 rounded flex items-center space-x-1"
            >
              {window.icon}
              <span className="ml-1">{window.title}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
} 