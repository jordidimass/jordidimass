import { renderPostMarkdown } from '@/lib/markdown';
import TableOfContents from './blog/TableOfContents';
import MobileToc from './blog/MobileToc';
import ReadingProgressBar from './blog/ReadingProgressBar';
import BackToTop from './blog/BackToTop';
import ArticleReveal from './blog/ArticleReveal';

export interface PostMetadata {
  title: string;
  date: string;
}

export interface BlogPostDisplayProps {
  metadata: PostMetadata;
  content: string;
}

export default async function BlogPostDisplay({ metadata, content }: BlogPostDisplayProps) {
  const { content: rendered, headings } = await renderPostMarkdown(content);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(metadata.date));
  const hasToc = headings.length > 1;

  return (
    <>
      <ReadingProgressBar />
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-5 py-8 lg:grid-cols-[minmax(0,70ch)_220px]">
        <article className="min-w-0">
          <header className="mb-6">
            <h1 className="font-serif text-4xl font-light tracking-widest text-brand-accent">{metadata.title}</h1>
            <p className="mt-1 text-sm italic text-gray-400">{formattedDate}</p>
          </header>
          {hasToc && (
            <div className="mb-6">
              <MobileToc headings={headings} />
            </div>
          )}
          <ArticleReveal>{rendered}</ArticleReveal>
        </article>
        {hasToc && <TableOfContents headings={headings} />}
      </div>
      <BackToTop />
    </>
  );
}
