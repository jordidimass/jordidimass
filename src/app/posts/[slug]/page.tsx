import { getPostBySlug } from '@/lib/posts';
import BlogPostDisplay, { PostMetadata } from '@/components/BlogPostDisplay';

export default async function PostPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { metadata, content } = await getPostBySlug(slug);

  const postMetadata: PostMetadata = {
    title: metadata.title,
    date: metadata.date
  };

  return <BlogPostDisplay metadata={postMetadata} content={content} />;
}
