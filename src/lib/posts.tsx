import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface PostMetadata {
  title: string;
  date: string;
  slug: string;
  excerpt: string;
}

const postsDirectory = path.join(process.cwd(), 'src/posts');

export function getPostSlugs(): string[] {
  return fs.readdirSync(postsDirectory).filter((file) => file.endsWith('.md'));
}

export function getPostBySlug(slug: string) {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  const metadata: PostMetadata = {
    title: data.title,
    date: new Date(data.date).toISOString(), 
    slug: data.slug,
    excerpt: data.excerpt,
  };

  return { metadata, content };
}


export function getAllPosts(): PostMetadata[] {
  const slugs = getPostSlugs();
  const posts = slugs.map((slug) => getPostBySlug(slug.replace('.md', '')).metadata);

  // Sort posts by date
  return posts.sort((a, b) => (a.date > b.date ? -1 : 1));
}
