'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav className="flex items-center justify-between p-6 bg-gray-100">
      <Link href="/" className="text-2xl font-bold">
        ?
      </Link>
      <ul className="flex space-x-6 gap-4">
        <li>
          <Link href="/blog" className="hover:text-blue-500">
            Blog
          </Link>
        </li>
        <li>
          <Link href="/about" className="hover:text-blue-500">
            About
          </Link>
        </li>
        <li
          className="relative"
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => setDropdownOpen(false)}
        >
          <button className="hover:text-blue-500 focus:outline-none">Connect</button>
          {dropdownOpen && (
            <ul className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg">
              <li>
                <a
                  href="https://twitter.com/yourhandle"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="mailto:youremail@example.com"
                  className="block px-4 py-2 hover:bg-gray-100"
                >
                  Email
                </a>
              </li>
            </ul>
          )}
        </li>
      </ul>
    </nav>
  );
}