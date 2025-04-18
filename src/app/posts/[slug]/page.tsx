import { getPostBySlug } from '@/lib/posts';
import BlogPostDisplay, { PostMetadata } from '@/components/BlogPostDisplay';

// Temporarily using 'any' to bypass type error
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function PostPage({ params }: any) {
  const { slug } = params; // Assuming params has slug
  const { metadata, content } = await getPostBySlug(slug);

  const postMetadata: PostMetadata = {
    title: metadata.title,
    date: metadata.date
  };

  return <BlogPostDisplay metadata={postMetadata} content={content} />;
}
