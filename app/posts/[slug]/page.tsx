import { getPostBySlug, getPostSlugs } from '../../../lib/posts';
import Markdown from 'markdown-to-jsx';

export async function generateStaticParams() {
  const slugs = getPostSlugs().map((slug) => ({ slug: slug.replace('.md', '') }));
  return slugs;
}

export default function PostPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { metadata, content } = getPostBySlug(slug);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-4">{metadata.title}</h1>
      <p className="text-gray-600 mb-6">{metadata.date}</p>
      <div className="prose">
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
}
