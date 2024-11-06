import { getPostBySlug } from '@/lib/posts';
import Markdown from 'markdown-to-jsx';

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { metadata, content } = await getPostBySlug(slug);
  const formattedDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(metadata.date));

  return (
    <div className="max-w-3xl mx-auto py-8 px-5">
      <h1 className="text-4xl font-light tracking-widest mb-4">{metadata.title}</h1>
      <p className="text-gray-400 italic text-sm mb-6">{formattedDate}</p>
      <article className="prose max-w-none text-[24px] text-[#AC8B8B]">
        <Markdown options={{
          overrides: {
            p: {
              component: ({ children }) => <p className="text-[24px] text-[#AC8B8B]">{children}</p>
            },
            h1: {
              component: ({ children }) => <h1 className="text-[32px] text-[#AC8B8B] font-bold mt-8 mb-4">{children}</h1>
            },
            h2: {
              component: ({ children }) => <h2 className="text-[28px] text-[#AC8B8B] font-bold mt-6 mb-3">{children}</h2>
            },
            h3: {
              component: ({ children }) => <h3 className="text-[26px] text-[#AC8B8B] font-bold mt-5 mb-2">{children}</h3>
            }
          }
        }}>
          {content}
        </Markdown>
      </article>
    </div>
  );
}
