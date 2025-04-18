import { supabase } from './supabaseClient';

export interface Post {
  slug: string;
  title: string;
  date: string;
  content: string;
}

export type PostMetadata = {
  slug: string;
  title: string;
  date: string;
};

export async function getAllPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('slug, title, date')
    .order('date', { ascending: false });
  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
  return data as PostMetadata[];
}

export async function getPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('title, date, content')
    .eq('slug', slug)
    .single();
  if (error || !data) {
    console.error(`Error fetching post ${slug}:`, error);
    return {
      metadata: {
        title: 'Post Not Found',
        date: new Date().toISOString(),
      },
      content: 'The requested post could not be found.',
    };
  }
  return {
    metadata: {
      title: data.title,
      date: data.date,
    },
    content: data.content,
  };
} 