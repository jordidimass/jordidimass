"use client";

import { motion } from 'motion/react';
import { useMotionContext } from '@/components/MotionProvider';
import XIcon from '@mui/icons-material/X';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import TelegramIcon from '@mui/icons-material/Telegram';
import { Link } from '@/config/profile';

const ICON_MAP = {
  'X.com': XIcon,
  'github.com': GitHubIcon,
  'linkedin.com': LinkedInIcon,
  'instagram.com': InstagramIcon,
  't.me': TelegramIcon,
} as const;

export function SocialIcons({ socials }: { socials: Link[] }) {
  const { motionEnabled } = useMotionContext();
  return (
    <div className="flex justify-center w-full m-5 text-brand-white">
      <motion.div className="flex items-end gap-4 bg-glass backdrop-blur-md p-3 rounded-full border border-glass-border shadow-[inset_0_1px_0_0_var(--color-glass-hairline)]">
        {socials.map((link) => {
          const Icon = Object.entries(ICON_MAP).find(([domain]) => 
            link.href.includes(domain)
          )?.[1];
          
          return Icon ? (
            <motion.a
              href={link.href}
              key={link.href}
              aria-label={link.title}
              title={link.title}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={motionEnabled ? { scale: 1.4 } : undefined}
              whileTap={motionEnabled ? { scale: 0.97 } : undefined}
              transition={motionEnabled ? { type: "spring", duration: 0.3, bounce: 0.2 } : { duration: 0 }}
            >
              <Icon className="w-8 h-8 transition-colors duration-200" />
            </motion.a>
          ) : null;
        })}
      </motion.div>
    </div>
  );
}
