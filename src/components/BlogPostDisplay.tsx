'use client';

import Markdown from 'markdown-to-jsx';
import { motion } from 'motion/react';

export interface PostMetadata {
  title: string;
  date: string;
}

export interface BlogPostDisplayProps {
  metadata: PostMetadata;
  content: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const markdownOptions: any = {
  overrides: {
    p:  { component: ({ children }: { children: React.ReactNode }) => <p  className="text-[24px] text-brand-muted">{children}</p> },
    h1: { component: ({ children }: { children: React.ReactNode }) => <h1 className="text-[32px] text-brand-muted font-bold mt-8 mb-4 font-serif">{children}</h1> },
    h2: { component: ({ children }: { children: React.ReactNode }) => <h2 className="text-[28px] text-brand-muted font-bold mt-6 mb-3 font-serif">{children}</h2> },
    h3: { component: ({ children }: { children: React.ReactNode }) => <h3 className="text-[26px] text-brand-muted font-bold mt-5 mb-2 font-serif">{children}</h3> },
  },
};

const BlogPostDisplay = ({ metadata, content }: BlogPostDisplayProps) => {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(metadata.date));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto py-8 px-5"
    >
      <h1 className="text-4xl font-light tracking-widest mb-4 font-serif text-brand-accent">{metadata.title}</h1>
      <p className="text-gray-400 italic text-sm mb-6">{formattedDate}</p>
      <article className="prose max-w-none text-[24px] text-brand-muted">
        <Markdown options={markdownOptions}>{content}</Markdown>
      </article>
    </motion.div>
  );
};

export default BlogPostDisplay;
