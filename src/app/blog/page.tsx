import { getAllPosts } from '../../lib/posts'
import Link from 'next/link';

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Blog Posts</h1>
      {posts.map((post) => (
        <div key={post.slug} className="mb-8">
          <Link
            href={`/posts/${post.slug}`}
            className="text-2xl font-semibold text-blue-600 hover:underline"
          >
            {post.title}
          </Link>
          <p className="text-gray-600">{post.excerpt}</p>
        </div>
      ))}
    </div>
  );
}
