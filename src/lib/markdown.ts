import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkAlert } from 'remark-github-blockquote-alert';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeReact from 'rehype-react';
import { Fragment, type ReactNode } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import type { Element, Root } from 'hast';
import { brandShikiTheme } from './shiki-theme';
import { markdownComponents } from '@/components/blog/markdown-components';

export interface PostHeading {
  id: string;
  text: string;
  depth: 2 | 3;
}

function elementText(node: Element): string {
  return node.children
    .map((child) => {
      if (child.type === 'text') return child.value;
      if (child.type === 'element') return elementText(child);
      return '';
    })
    .join('');
}

function collectHeadings(tree: Root, headings: PostHeading[]) {
  for (const node of tree.children) {
    if (node.type !== 'element') continue;
    if (node.tagName === 'h2' || node.tagName === 'h3') {
      const id = typeof node.properties?.id === 'string' ? node.properties.id : undefined;
      if (id) {
        headings.push({ id, text: elementText(node), depth: node.tagName === 'h2' ? 2 : 3 });
      }
    }
  }
}

const { jsx, jsxs } = jsxRuntime as unknown as {
  jsx: (type: unknown, props: unknown, key?: string) => ReactNode;
  jsxs: (type: unknown, props: unknown, key?: string) => ReactNode;
};

export async function renderPostMarkdown(markdown: string) {
  const headings: PostHeading[] = [];

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkAlert, { tagName: 'blockquote' })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(() => (tree: Root) => collectHeadings(tree, headings))
    .use(rehypePrettyCode, { theme: brandShikiTheme, keepBackground: false })
    .use(rehypeReact, { Fragment, jsx, jsxs, components: markdownComponents })
    .process(markdown);

  return { content: file.result as ReactNode, headings };
}
