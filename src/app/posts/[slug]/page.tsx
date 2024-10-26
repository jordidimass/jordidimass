import { getPostBySlug } from '@/lib/posts';
import Markdown from 'markdown-to-jsx';

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // Await the params promise

  // Fetch post data asynchronously
  const { metadata, content } = await getPostBySlug(slug);

  // Format the date in a human-readable way
  const formattedDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(metadata.date));

  return (
    <div className="max-w-3xl mx-auto py-8 px-5">
      <h1 className="text-4xl font-light tracking-widest mb-4">{metadata.title}</h1>
      <p className="text-gray-400 italic text-sm mb-6">{formattedDate}</p>
      <div className="prose text-xl md:text-2xl text-readingTextDark leading-[1.875]">
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
}
