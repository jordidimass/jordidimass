import {
  Children,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import CopyButton from './CopyButton';
import ImageReveal from './ImageReveal';

function getPlainText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getPlainText).join('');
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return getPlainText(props.children);
  }
  return '';
}

function getCodeText(codeEl: ReactElement): string {
  const lines = Children.toArray((codeEl.props as { children?: ReactNode }).children);
  const isLineWrapped = lines.length > 0 && lines.every(
    (line) => isValidElement(line) && 'data-line' in (line.props as Record<string, unknown>)
  );
  if (isLineWrapped) return lines.map(getPlainText).join('\n');
  return getPlainText(codeEl);
}

function findChild(children: ReactNode, predicate: (el: ReactElement) => boolean) {
  return Children.toArray(children).find(
    (child): child is ReactElement => isValidElement(child) && predicate(child)
  );
}

function CodeFigure(props: ComponentPropsWithoutRef<'figure'> & Record<string, unknown>) {
  const { children, className, ...rest } = props;
  const isPrettyCodeFigure = 'data-rehype-pretty-code-figure' in rest;

  if (!isPrettyCodeFigure) {
    return (
      <figure className={className} {...rest}>
        {children}
      </figure>
    );
  }

  const titleEl = findChild(children, (el) => 'data-rehype-pretty-code-title' in (el.props as Record<string, unknown>));
  const preEl = findChild(children, (el) => el.type === 'pre');
  const preProps = (preEl?.props ?? {}) as { children?: ReactNode; 'data-language'?: string };
  const codeEl = preEl ? findChild(preProps.children, (el) => el.type === 'code') : undefined;
  const rawCode = codeEl ? getCodeText(codeEl) : '';
  const label = titleEl ? getPlainText(titleEl) : preProps['data-language'];

  return (
    <figure className="not-prose my-6 overflow-hidden rounded-lg border border-brand-muted/25 bg-black/20">
      <div className="flex items-center justify-between gap-3 border-b border-brand-muted/25 px-4 py-2">
        <small className="text-brand-muted">{label}</small>
        <CopyButton code={rawCode} />
      </div>
      {preEl}
    </figure>
  );
}

function MarkdownBlockquote({ className, children, ...props }: ComponentPropsWithoutRef<'blockquote'>) {
  const isAlert = typeof className === 'string' && className.includes('markdown-alert');

  if (isAlert) {
    return (
      <blockquote className={`not-prose my-6 rounded-lg border px-5 py-4 ${className}`} {...props}>
        {children}
      </blockquote>
    );
  }

  return (
    <blockquote
      className="not-prose my-6 border-l-[3px] border-brand-accent pl-5 font-serif text-xl italic text-brand-text"
      {...props}
    >
      {children}
    </blockquote>
  );
}

function H2({ children, ...props }: ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2 className="mb-4 mt-10 font-serif text-[28px] font-bold text-brand-accent" {...props}>
      {children}
    </h2>
  );
}

function H3({ children, ...props }: ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3 className="mb-3 mt-8 font-serif text-[24px] font-bold text-brand-accent" {...props}>
      {children}
    </h3>
  );
}

function P({ children, ...props }: ComponentPropsWithoutRef<'p'>) {
  return (
    <p className="mb-5 text-lg leading-relaxed text-brand-text" {...props}>
      {children}
    </p>
  );
}

function Ul({ children, ...props }: ComponentPropsWithoutRef<'ul'>) {
  return (
    <ul className="mb-5 flex list-disc flex-col gap-2 pl-6 text-lg leading-relaxed text-brand-text" {...props}>
      {children}
    </ul>
  );
}

function Ol({ children, ...props }: ComponentPropsWithoutRef<'ol'>) {
  return (
    <ol className="mb-5 flex list-decimal flex-col gap-2 pl-6 text-lg leading-relaxed text-brand-text" {...props}>
      {children}
    </ol>
  );
}

function Hr(props: ComponentPropsWithoutRef<'hr'>) {
  return <hr className="my-8 border-brand-muted/20" {...props} />;
}

function A({ children, ...props }: ComponentPropsWithoutRef<'a'>) {
  return (
    <a
      className="text-brand-accent underline underline-offset-2 decoration-brand-accent/40 transition-colors duration-200 hover:text-brand-white hover:decoration-brand-white/60"
      {...props}
    >
      {children}
    </a>
  );
}

function MarkdownImage({ src, alt, ...props }: ComponentPropsWithoutRef<'img'>) {
  return (
    <ImageReveal>
      <figure className="not-prose my-6 flex flex-col gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? ''}
          loading="lazy"
          decoding="async"
          className="w-full rounded-lg border border-brand-muted/20"
          {...props}
        />
        {alt ? <figcaption className="text-center text-sm italic text-brand-muted">{alt}</figcaption> : null}
      </figure>
    </ImageReveal>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const markdownComponents: Record<string, any> = {
  figure: CodeFigure,
  blockquote: MarkdownBlockquote,
  img: MarkdownImage,
  h2: H2,
  h3: H3,
  p: P,
  ul: Ul,
  ol: Ol,
  hr: Hr,
  a: A,
};
