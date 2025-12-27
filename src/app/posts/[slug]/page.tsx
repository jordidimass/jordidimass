import { getAllPosts, getPostBySlug } from '@/lib/posts';
import BlogPostDisplay, { PostMetadata } from '@/components/BlogPostDisplay';

type PostPageParams = { slug: string };

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
