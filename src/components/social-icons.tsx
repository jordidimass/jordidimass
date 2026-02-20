import { motion } from 'motion/react';
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
  return (
    <div className="flex justify-center w-full m-5 text-white">
      <motion.div className="flex items-end gap-4 bg-gray-800 bg-opacity-30 backdrop-filter backdrop-blur-sm p-2 rounded-full">
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
              whileHover={{ scale: 1.5 }}
              whileTap={{ scale: 0.9 }}
            >
              <Icon className="w-8 h-8 transition-all duration-200" />
            </motion.a>
          ) : null;
        })}
      </motion.div>
    </div>
  );
}
