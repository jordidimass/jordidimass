'use client';

import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { EASE_OUT } from '@/lib/motion';

export default function ArticleReveal({ children }: { children: ReactNode }) {
  const source =
    isValidElement(children) && children.type === Fragment
      ? (children.props as { children?: ReactNode }).children
      : children;

  const blocks = Children.toArray(source);

  return (
    <>
      {blocks.map((block, index) => (
        <motion.div
          key={isValidElement(block) ? (block.key ?? index) : index}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.3, ease: EASE_OUT, delay: Math.min(index, 4) * 0.04 }}
        >
          {block}
        </motion.div>
      ))}
    </>
  );
}
