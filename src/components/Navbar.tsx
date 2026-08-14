'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import SiteMark from '@/components/ui/SiteMark';

const navItems = [
  { name: 'blog', href: '/blog' },
  { name: 'gallery', href: '/gallery' },
  { name: 'about', href: '/about' },
  { name: 'connect', href: '/connect' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (document.documentElement.hasAttribute('data-scroll-locked')) return;
      const next = window.scrollY > 50;
      setIsScrolled((prev) => (prev === next ? prev : next));
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <nav
      ref={navRef}
      className={`fixed w-full top-0 transition-colors duration-300 ${
        isOpen ? 'z-[70]' : 'z-50'
      } ${
        isScrolled && !isOpen
          ? 'bg-brand-bg/40 backdrop-blur-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-2xl mx-auto px-6 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 group" aria-label="Home" title="Home">
              <SiteMark
                size={32}
                className="text-brand-white transition-[transform,color] duration-300 ease-in-out group-hover:rotate-180 group-active:rotate-180 group-hover:text-brand-accent group-active:text-brand-accent"
              />
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-brand-accent hover:text-brand-white px-3 py-2 rounded-md text-2xl font-medium font-serif"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative z-50 w-8 h-8 flex items-center justify-center focus:outline-none"
              aria-label="Toggle Menu"
            >
              <div className="relative flex overflow-hidden items-center justify-center w-[20px] h-[20px]">
                <div className={`flex flex-col justify-between w-[20px] h-[20px] transform transition-transform duration-200 origin-center overflow-hidden ${isOpen ? 'translate-x-1.5' : ''}`}>
                  <div className={`bg-brand-white h-[2px] w-7 transform transition-transform duration-200 origin-left ${isOpen ? 'rotate-[42deg] scale-x-[0.476] -translate-y-1' : ''}`}></div>
                  <div className={`bg-brand-white h-[2px] w-7 rounded transition-opacity duration-200 ${isOpen ? 'opacity-0' : ''}`}></div>
                  <div className={`bg-brand-white h-[2px] w-7 transform transition-transform duration-200 origin-left ${isOpen ? '-rotate-[42deg] scale-x-[0.476] translate-y-1' : ''}`}></div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-brand-bg/40 backdrop-blur-sm shadow-lg md:hidden"
        >
          <div className="flex items-center justify-center min-h-screen">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)} 
                  className="text-brand-accent hover:text-brand-white block px-3 py-2 rounded-md text-6xl font-medium text-center font-serif"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
