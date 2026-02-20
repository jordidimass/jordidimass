'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { PostMetadata } from '../lib/posts';

export default function AnimatedBlogPost({ 
  post, 
  index 
}: { 
  post: PostMetadata; 
  index: number;
}) {
  return (
    <motion.div 
      key={post.slug} 
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <Link
          href={`/posts/${post.slug}`}
          className="text-2xl font-light tracking-widest hover:text-[#ffffff] transition-all duration-300"
        >
          {post.title}
        </Link>
        <p className="text-sm italic text-gray-400 mt-2 md:mt-0">
          {new Intl.DateTimeFormat('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }).format(new Date(post.date))}
        </p>
      </div>
      <hr className="border-gray-600 my-4" />
    </motion.div>
  );
} 