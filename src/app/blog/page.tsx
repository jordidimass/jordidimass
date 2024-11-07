import { getAllPosts } from '../../lib/posts';
import Link from 'next/link';

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 text-[#FFBCBC]">
      <h1 className="text-4xl font-light tracking-widest mb-12 text-right">
        blog
      </h1>
      {posts.map((post) => (
        <div key={post.slug} className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <Link
              href={`/posts/${post.slug}`}
              className="text-2xl font-light tracking-widest hover:text-[#ffffff] transition-all duration-300"
            >
              {post.title}
            </Link>
            <p className="text-sm italic text-gray-400 mt-2 md:mt-0">
              {new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(post.date))}
            </p>
          </div>
          <hr className="border-gray-600 my-4" />
        </div>
      ))}
    </div>
  );
}
