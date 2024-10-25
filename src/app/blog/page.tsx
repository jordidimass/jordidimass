import { getAllPosts } from '../../lib/posts';
import Link from 'next/link';

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 text-[#FFBCBC]">
      <h1 className="text-4xl font-light tracking-widest uppercase mb-12 text-right">
        blog
      </h1>
      {posts.map((post) => (
        <div key={post.slug} className="mb-8">
          <Link
            href={`/posts/${post.slug}`}
            className="block text-2xl font-light tracking-widest uppercase hover:text-[#ffffff] transition-all duration-300 mb-2"
          >
            {post.title}
          </Link>
          <p className="text-right text-sm italic text-gray-400">
            {new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(post.date))}
          </p>
          <hr className="border-gray-600 my-4" />
        </div>
      ))}
    </div>
  );
}
