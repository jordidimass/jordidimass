import { getAllPosts } from '../../lib/posts';
import AnimatedBlogPost from '@/components/AnimatedBlogPost';

export default async function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 text-[#FFBCBC]">
      <h1 className="text-4xl font-light tracking-widest mb-12 text-right">
        blog
      </h1>
      {posts.map((post, index) => (
        <AnimatedBlogPost key={post.slug} post={post} index={index} />
      ))}
    </div>
  );
}
