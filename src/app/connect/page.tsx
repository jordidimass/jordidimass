'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import XIcon from '@mui/icons-material/X';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import TelegramIcon from '@mui/icons-material/Telegram';
import Particles from '@/components/ui/particles';

const data = {
    name: "Jordi Dimas",
    avatar: "https://utfs.io/f/c07cbb6c-bf22-46bc-bdc3-c711408f5856-1xaifo.jpg",
    links: [
        { title: "VSCO gallery", href: "https://vsco.co/jordidimass/gallery" },
        { title: "occasional photographer", href: "https://unsplash.com/@jordidimass" },
        { title: "music journey", href: "https://www.last.fm/user/jordidimass" },
        { title: "spotify playlist", href: "https://open.spotify.com/user/jordidimass/playlists" },
        { title: "some repos", href: "https://github.com/jordidimass?tab=repositories" },
        { title: "book reviews", href: "https://goodreads.com/jordidimass" },
        { title: "film diary", href: "https://letterboxd.com/jordidimass/" }
    ],
    socials: [
        { title: "X", href: "https://X.com/jordidimass" },
        { title: "Instagram", href: "https://instagram.com/jordidimass" },
        { title: "LinkedIn", href: "https://www.linkedin.com/in/jordidimass/" },
        { title: "GitHub", href: "https://github.com/jordidimass" },
        { title: "Telegram", href: "https://t.me/jordidimass" }
    ]
};

function LinkCard({ href, title }: { href: string; title: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex text-lg items-center p-4 bg-gray-800 bg-opacity-30 backdrop-filter backdrop-blur-sm w-full md:w-[70%] rounded-md hover:scale-105 transition-all border border-gray-600 mb-3 duration-300">
      <div className="flex flex-col text-center w-full">
        <h2 className="font-medium text-gray-100">{title}</h2>
      </div>
    </a>
  );
}

export default function ConnectPage() {
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
    <div className="relative w-full h-screen overflow-hidden">
      <Particles
        className="absolute inset-0 -z-10"
        quantity={450}
        staticity={10}
        ease={60}
        color="#ffffff"
      />
      <div className="flex mx-auto items-center flex-col w-full h-full justify-center pt-16 pb-16 px-8 max-w-2xl relative z-10 overflow-y-auto"> 
        <Link href="/">
          <Image
            className="rounded-full cursor-pointer"
            alt={data.name}
            src={data.avatar}
            width={120}
            height={120}
          />
        </Link>
        <h1 className="font-bold mt-4 mb-8 text-xl text-gray-100">{data.name}</h1>
        {data.links.map((link) => (
          <LinkCard key={link.href} href={link.href} title={link.title} />
        ))}
        <div className="flex justify-center gap-7 w-full m-5 text-white">
          {data.socials.map((link) => {
            if (link.href.includes('X')) {
              return (
                <a href={link.href} key={link.href} target="_blank" rel="noopener noreferrer">
                  <XIcon className="w-10 h-10"/>
                </a>
              );
            }
            if (link.href.includes('github')) {
              return (
                <a href={link.href} key={link.href} target="_blank" rel="noopener noreferrer">
                  <GitHubIcon className="w-10 h-10"/>
                </a>
              );
            }
            if (link.href.includes('linkedin')) {
              return (
                <a href={link.href} key={link.href} target="_blank" rel="noopener noreferrer">
                  <LinkedInIcon className="w-10 h-10"/>
                </a>
              );
            }
            if (link.href.includes('instagram')) {
              return (
                <a href={link.href} key={link.href} target="_blank" rel="noopener noreferrer">
                  <InstagramIcon className="w-10 h-10"/>
                </a>
              );
            }
            if (link.href.includes('t.me')) {
              return (
                <a href={link.href} key={link.href} target="_blank" rel="noopener noreferrer">
                  <TelegramIcon className="w-10 h-10"/>
                </a>
              );
            }
          })}
        </div>
      </div>  
    </div>
  );
}
