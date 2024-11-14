'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const navItems = [
  { name: 'blog', href: '/blog' },
  { name: 'about', href: '/about' },
  { name: 'connect', href: '/connect' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]); 

  return (
    <nav
      ref={navRef}
      className={`fixed w-full top-0 z-50 transition-colors duration-300 ${
        isScrolled && !isOpen
          ? 'bg-[#111010]/40 backdrop-blur-sm' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-2xl mx-auto px-6 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 128 128"
                className="w-8 h-8 transition-transform duration-300 ease-in-out hover:rotate-180"
              >
                <path
                  className="fill-white transition-colors duration-300 hover:fill-[#FFBCBC]"
                  d="M128 122.674H28.697L0 104.398V5.235h99.305L128 23.511v99.163zm-91.264-8.028h73.413l-17.851-10.043.132-.206H36.736v10.249zm-23.038-10.248 14.999 8.234v-8.234H13.698zm85.607-4.861 20.656 13.094V31.539H99.305v67.998zM36.736 96.37h54.53V31.539h-54.53V96.37zm-28.697 0h20.658V29.647L8.039 16.551V96.37zm91.266-72.859h14.919l-14.919-8.949v8.949zm-65.745 0h57.706V13.262H17.851l15.841 10.043-.132.206z"
                />
              </svg>
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-[#FFBCBC] hover:text-white px-3 py-2 rounded-md text-lg font-medium"
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
              <div className="relative flex overflow-hidden items-center justify-center w-[20px] h-[20px] transform transition-all duration-200">
                <div className={`flex flex-col justify-between w-[20px] h-[20px] transform transition-all duration-300 origin-center overflow-hidden ${isOpen ? 'translate-x-1.5' : ''}`}>
                  <div className={`bg-white h-[2px] w-7 transform transition-all duration-300 origin-left ${isOpen ? 'rotate-[42deg] w-2/3 -translate-y-1' : ''}`}></div>
                  <div className={`bg-white h-[2px] w-7 rounded transform transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></div>
                  <div className={`bg-white h-[2px] w-7 transform transition-all duration-300 origin-left ${isOpen ? '-rotate-[42deg] w-2/3 translate-y-1' : ''}`}></div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[#111010]/40 backdrop-blur-sm shadow-lg md:hidden"
        >
          <div className="flex items-center justify-center min-h-screen">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)} 
                  className="text-[#FFBCBC] hover:text-white block px-3 py-2 rounded-md text-6xl font-medium text-center"
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
