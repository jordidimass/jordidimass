'use client';

import Link from 'next/link';
import Image from 'next/image';
import XIcon from '@mui/icons-material/X';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import TelegramIcon from '@mui/icons-material/Telegram';
import Particles from '@/components/ui/particles';
import { motion } from 'framer-motion';

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
        <h2 className="text-2xl text-gray-100">{title}</h2>
      </div>
    </a>
  );
}

export default function ConnectPage() {
  return (
    <div className="relative w-full min-h-screen overflow-auto">
      <Particles
        className="absolute inset-0 -z-10"
        quantity={450}
        staticity={10}
        ease={60}
        color="#ffffff"
      />
      <div className="flex mx-auto items-center flex-col w-full px-8 max-w-2xl relative z-10 py-16"> 
        <Link href="/matrix">
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
        <div className="flex justify-center w-full m-5 text-white">
          <motion.div className="flex items-end gap-4 bg-gray-800 bg-opacity-30 backdrop-filter backdrop-blur-sm p-2 rounded-full">
            {data.socials.map((link) => {
              let Icon;
              if (link.href.includes('X')) Icon = XIcon;
              else if (link.href.includes('github')) Icon = GitHubIcon;
              else if (link.href.includes('linkedin')) Icon = LinkedInIcon;
              else if (link.href.includes('instagram')) Icon = InstagramIcon;
              else if (link.href.includes('t.me')) Icon = TelegramIcon;
              
              return Icon ? (
                <motion.a
                  href={link.href}
                  key={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon className="w-8 h-8 transition-all duration-200" />
                </motion.a>
              ) : null;
            })}
          </motion.div>
        </div>
      </div>  
    </div>
  );
}
