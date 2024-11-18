'use client';

import Link from 'next/link';
import Image from 'next/image';
import Particles from '@/components/ui/particles';
import { LinkCard } from '@/components/link-card';
import { SocialIcons } from '@/components/social-icons';
import { profileData } from '@/config/profile';

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
            alt={profileData.name}
            src={profileData.avatar}
            width={120}
            height={120}
          />
        </Link>
        <h1 className="font-bold mt-4 mb-8 text-xl text-gray-100">{profileData.name}</h1>
        {profileData.links.map((link) => (
          <LinkCard key={link.href} {...link} />
        ))}
        <SocialIcons socials={profileData.socials} />
      </div>  
    </div>
  );
}
