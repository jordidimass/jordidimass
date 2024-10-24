'use client'

import React, { useState } from 'react'
import Link from 'next/link'

const navItems = [
  { name: 'Blog', href: '/blog' },
  { name: 'About', href: '/about' },
]

const connectItems = [
  { title: "VSCO gallery", href: "https://vsco.co/jordidimass/gallery" },
  { title: "occasional photographer", href: "https://unsplash.com/@jordidimass" },
  { title: "music journey", href: "https://www.last.fm/user/jordidimass" },
  { title: "spotify playlist", href: "https://open.spotify.com/user/jordidimass/playlists" },
  { title: "some repos", href: "https://github.com/jordidimass?tab=repositories" },
  { title: "book reviews", href: "https://goodreads.com/jordidimass" },
  { title: "film diary", href: "https://letterboxd.com/jordidimass/" },
  { title: "X", href: "https://X.com/jordidimass" },
  { title: "Instagram", href: "https://instagram.com/jordidimass" },
  { title: "LinkedIn", href: "https://www.linkedin.com/in/jordidimass/" },
  { title: "GitHub", href: "https://github.com/jordidimass" },
  { title: "Telegram", href: "https://t.me/jordidimass" }
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <nav className="bg-gray-1000 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 128 128"
                className="w-8 h-8 transition-transform duration-300 ease-in-out hover:rotate-180"
                style={{ }}
              >
                <path
                  style={{ fill: '#ffffff' }}
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
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  {item.name}
                </Link>
              ))}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium focus:outline-none"
                >
                  Connect
                  <svg className="ml-1 h-4 w-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                      {connectItems.map((item, index) => (
                        <React.Fragment key={item.title}>
                          {index === 7 && <div className="border-t border-gray-700 my-1"></div>}
                          <a
                            href={item.href}
                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            role="menuitem"
                          >
                            {item.title}
                          </a>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              >
                {item.name}
              </Link>
            ))}
            <div className="space-y-2">
              <p className="px-3 text-sm font-medium text-gray-400">Connect</p>
              {connectItems.map((item, index) => (
                <React.Fragment key={item.title}>
                  {index === 7 && <div className="border-t border-gray-700 my-2"></div>}
                  <a
                    href={item.href}
                    className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                  >
                    {item.title}
                  </a>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}