'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Particles from '@/components/ui/particles';
import { LinkCard } from '@/components/link-card';
import { SocialIcons } from '@/components/social-icons';
import { profileData } from '@/config/profile';

export default function ConnectPage() {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">
      <Particles
        className="absolute inset-0 -z-10"
        quantity={450}
        staticity={10}
        ease={60}
        color="#ffffff"
      />
      <div className="flex mx-auto items-center justify-center flex-col w-full h-full px-8 max-w-2xl relative z-10 pt-16"> 
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/matrix">
            <Image
              className="rounded-full cursor-pointer hover:scale-105 transition-transform duration-200"
              alt={profileData.name}
              src={profileData.avatar}
              width={120}
              height={120}
            />
          </Link>
        </motion.div>
        <motion.h1 
          className="font-bold mt-4 mb-8 text-xl text-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {profileData.name}
        </motion.h1>
        <motion.div 
          className="flex flex-col items-center space-y-4 w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {profileData.links.map((link) => (
            <LinkCard key={link.href} {...link} />
          ))}
        </motion.div>
        <motion.div 
          className="mt-8 flex justify-center w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <SocialIcons socials={profileData.socials} />
        </motion.div>
      </div>  
    </div>
  );
}
