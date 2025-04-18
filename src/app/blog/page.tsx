import { getAllPosts } from '../../lib/posts';
import AnimatedBlogPost from '@/components/AnimatedBlogPost';

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="min-h-screen bg-[#111010] pt-24 pb-8 px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-light tracking-widest mb-12 text-right text-[#FFBCBC]">
          blog
        </h1>
        {posts.length === 0 ? (
          <p className="text-gray-400 text-center">No posts found.</p>
        ) : (
          posts.map((post, index) => (
            <AnimatedBlogPost key={post.slug} post={post} index={index} />
          ))
        )}
      </div>
    </div>
  );
}
