import { getPostBySlug, getPostSlugs } from '@/lib/posts';
import Markdown from 'markdown-to-jsx';

export async function generateStaticParams() {
  const slugs = getPostSlugs();
  return slugs.map((slug) => ({
    slug: slug.replace('.md', ''),
  }));
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const slug = params?.slug;

  if (!slug) {
    return <p>Loading...</p>;
  }

  const { metadata, content } = await getPostBySlug(slug);

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
