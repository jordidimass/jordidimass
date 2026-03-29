import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";

const SITE_URL = "https://www.jordidimass.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, priority: 1, changeFrequency: "monthly" },
    { url: `${SITE_URL}/blog`, priority: 0.9, changeFrequency: "weekly" },
    { url: `${SITE_URL}/gallery`, priority: 0.8, changeFrequency: "weekly" },
    { url: `${SITE_URL}/about`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${SITE_URL}/connect`, priority: 0.7, changeFrequency: "monthly" },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/posts/${post.slug}`,
    lastModified: new Date(post.date),
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  return [...staticRoutes, ...postRoutes];
}
