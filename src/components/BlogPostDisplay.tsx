'use client';

import Markdown from 'markdown-to-jsx';
import { motion } from 'motion/react';

// Define the type for the metadata more explicitly if possible, or use any
export interface PostMetadata { // Export interface
  title: string;
  date: string; // Assuming date is a string, adjust if it's a Date object
}

export interface BlogPostDisplayProps { // Export interface
  metadata: PostMetadata;
  content: string;
}

// Client Component for Displaying the Post with Animation
const BlogPostDisplay = ({ metadata, content }: BlogPostDisplayProps) => {
  const formattedDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(metadata.date));

  return (
    <motion.div // Wrap the main content with motion.div
      initial={{ opacity: 0 }} // Start with opacity 0
      animate={{ opacity: 1 }} // Animate to opacity 1
      transition={{ duration: 0.5 }} // Set animation duration
      className="max-w-3xl mx-auto py-8 px-5"
    >
      <h1 className="text-4xl font-light tracking-widest mb-4 font-serif text-brand-accent">{metadata.title}</h1>
      <p className="text-gray-400 italic text-sm mb-6">{formattedDate}</p>
      <article className="prose max-w-none text-[24px] text-brand-muted">
        <Markdown options={{
          overrides: {
            p: {
              component: ({ children }) => <p className="text-[24px] text-brand-muted">{children}</p>
            },
            h1: {
              component: ({ children }) => <h1 className="text-[32px] text-brand-muted font-bold mt-8 mb-4 font-serif">{children}</h1>
            },
            h2: {
              component: ({ children }) => <h2 className="text-[28px] text-brand-muted font-bold mt-6 mb-3 font-serif">{children}</h2>
            },
            h3: {
              component: ({ children }) => <h3 className="text-[26px] text-brand-muted font-bold mt-5 mb-2 font-serif">{children}</h3>
            }
            // Add more overrides as needed
          }
        }}>
          {content}
        </Markdown>
      </article>
    </motion.div>
  );
};

export default BlogPostDisplay; // Export the component 