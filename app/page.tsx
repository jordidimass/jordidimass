import fs from 'fs';
import Link from 'next/link';
import matter from 'gray-matter';

const getPostMetadata = () => { 
  const folder = "posts/";
  const files = fs.readdirSync('posts');
  const markdownPosts = files.filter((fn) => fn.endsWith(".md"));
  const slugs = markdownPosts.map((fn) => fn.replace(".md", ""));
  return slugs;
};

const HomePage =() => {
  const postMetadata = getPostMetadata();
  const postPreviews = postMetadata.map((slug) => (
    <div>
      <Link href={`/posts/${slug}`}>
      <h2>{slug}</h2>
      </Link>
    </div>
  ));

  return <div>{postPreviews}</div>
};

export default HomePage;