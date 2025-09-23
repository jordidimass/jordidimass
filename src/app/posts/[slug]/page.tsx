import { getPostBySlug } from '@/lib/posts';
import BlogPostDisplay, { PostMetadata } from '@/components/BlogPostDisplay';

type PostPageParams = { slug: string };
export default async function PostPage({ params }: { params: Promise<PostPageParams> }) {
  const { slug } = await params;
  const { metadata, content } = await getPostBySlug(slug);

  const postMetadata: PostMetadata = {
    title: metadata.title,
    date: metadata.date
  };

  return <BlogPostDisplay metadata={postMetadata} content={content} />;
}
