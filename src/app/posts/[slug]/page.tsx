import type { Metadata } from 'next';
import { getAllPosts, getPostBySlug } from '@/lib/posts';
import BlogPostDisplay, { PostMetadata } from '@/components/BlogPostDisplay';

type PostPageParams = { slug: string };

export async function generateMetadata({ params }: { params: Promise<PostPageParams> }): Promise<Metadata> {
  const { slug } = await params;
  const { metadata } = await getPostBySlug(slug);
  return {
    title: metadata.title,
    openGraph: {
      title: `${metadata.title} | Jordi Dimas`,
      type: "article",
      url: `https://www.jordidimass.com/posts/${slug}`,
      publishedTime: metadata.date,
    },
    alternates: { canonical: `https://www.jordidimass.com/posts/${slug}` },
  };
}

export const dynamic = "force-static";
export const revalidate = 3600; // seconds
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function PostPage({ params }: { params: Promise<PostPageParams> }) {
  const { slug } = await params;
  const { metadata, content } = await getPostBySlug(slug);

  const postMetadata: PostMetadata = {
    title: metadata.title,
    date: metadata.date
  };

  return <BlogPostDisplay metadata={postMetadata} content={content} />;
}
